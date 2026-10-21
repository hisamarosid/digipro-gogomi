import { db } from '@/lib/db/prisma';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { TelegramService } from './telegram.service';
import { NotificationOrchestrator } from './email/email-orchestrator';
import { CustomerNotificationCategory } from '../../generated/prisma';

export interface DomainEventPayload {
  eventName: string;
  userId?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  orderItemId?: string | null;
  productName?: string | null;
  supplierId?: string | null;
  metadata?: Record<string, any>;
}

export class DomainEventService {
  /**
   * Dispatches domain events cleanly across the application
   */
  static async publish(payload: DomainEventPayload) {
    try {
      const { eventName, userId, orderId, orderNumber, productName, metadata } = payload;

      switch (eventName) {
        case 'ORDER_CREATED':
          // Customer / Pending creation only - Do NOT notify Telegram for unpaid order
          break;

        case 'PAYMENT_SETTLED':
          // 1. Notify Customer (Customer Web Notification)
          if (userId) {
            await NotificationService.sendCustomerNotification({
              userId,
              type: 'PAYMENT_SUCCESS',
              category: CustomerNotificationCategory.PAYMENT,
              title: 'Pembayaran Berhasil Diterima',
              message: `Pembayaran untuk pesanan #${orderNumber || 'N/A'} telah berhasil dikonfirmasi.`,
              actionUrl: `/account/orders`,
              dedupeKey: `pay-settled-${orderId}`,
            });
          }

          // 2. Dispatch Idempotent Telegram Order Paid Alert for Admin & Email to Customer
          if (orderId) {
            try {
              const fullOrder = await db.order.findUnique({
                where: { id: orderId },
                include: {
                  user: { select: { name: true, email: true } },
                  items: {
                    select: {
                      id: true,
                      productName: true,
                      variantName: true,
                      quantity: true,
                    },
                  },
                },
              });

              if (fullOrder) {
                // Telegram Admin Alert
                await TelegramService.sendOrderPaidNotification({
                  id: fullOrder.id,
                  orderNumber: fullOrder.orderNumber,
                  grandTotal: fullOrder.grandTotal,
                  cashPayableAmount: fullOrder.cashPayableAmount,
                  user: fullOrder.user,
                  guestEmail: fullOrder.guestEmail,
                  guestName: fullOrder.guestName,
                  items: fullOrder.items,
                  createdAt: fullOrder.createdAt,
                });

                // Customer Email Notification
                const recipientEmail = fullOrder.user?.email || fullOrder.guestEmail;
                if (recipientEmail) {
                  const firstItem = fullOrder.items?.[0];
                  const prodName = fullOrder.items.length > 1
                    ? `${firstItem?.productName || 'Produk'} (+${fullOrder.items.length - 1} item lainnya)`
                    : firstItem?.productName || 'Produk Digital';
                  const varName = fullOrder.items.length > 1
                    ? fullOrder.items.map((i: any) => i.variantName).filter(Boolean).join(', ')
                    : firstItem?.variantName || '-';

                  await NotificationOrchestrator.dispatchEvent({
                    userId: fullOrder.userId || null,
                    userEmail: recipientEmail,
                    eventType: 'PAYMENT_SUCCESS',
                    title: `Pembayaran Berhasil — Order #${fullOrder.orderNumber}`,
                    message: `Terima kasih! Pembayaran sebesar Rp${fullOrder.grandTotal.toLocaleString('id-ID')} untuk Order #${fullOrder.orderNumber} telah kami terima.`,
                    actionUrl: `/account/orders`,
                    emailTemplateKey: 'PAYMENT_SUCCESS',
                    emailCategory: 'TRANSACTIONAL',
                    metadata: {
                      customerName: fullOrder.user?.name || fullOrder.guestName || 'Customer',
                      orderNumber: fullOrder.orderNumber,
                      productName: prodName,
                      variantName: varName,
                      amount: fullOrder.grandTotal,
                      paymentMethod: 'QRIS',
                      category: CustomerNotificationCategory.PAYMENT,
                    },
                    dedupeKey: `PAYMENT_SUCCESS:${fullOrder.id}`,
                  }).catch(() => {});
                }
              }
            } catch (tgErr) {
              console.error('[DomainEventService Telegram ORDER_PAID Error]:', tgErr);
            }
          }
          break;

        case 'PRODUCT_DELIVERED':
          if (userId) {
            await NotificationService.sendCustomerNotification({
              userId,
              type: 'PRODUCT_DELIVERED',
              category: CustomerNotificationCategory.PRODUCT,
              title: 'Produk Digital Anda Sudah Tersedia! 🎉',
              message: `Pesanan #${orderNumber} (${productName || 'Produk'}) telah berhasil dikirim dan siap digunakan.`,
              actionUrl: `/account/products`,
              dedupeKey: `prod-deliv-${payload.orderItemId}`,
            });
          }

          if (payload.orderItemId) {
            try {
              const orderItem = await db.orderItem.findUnique({
                where: { id: payload.orderItemId },
                include: { order: { include: { user: true } } },
              });
              const recipientEmail = orderItem?.order?.user?.email || orderItem?.order?.guestEmail;
              if (recipientEmail && orderItem) {
                await NotificationOrchestrator.dispatchEvent({
                  userId: orderItem.order.userId,
                  userEmail: recipientEmail,
                  eventType: 'PRODUCT_DELIVERED',
                  title: `Produk Anda Sudah Tersedia — Order #${orderItem.order.orderNumber}`,
                  message: `Kabar gembira! Produk digital ${orderItem.productName} (${orderItem.variantName}) untuk Order #${orderItem.order.orderNumber} sudah siap digunakan.`,
                  actionUrl: `/account/products`,
                  emailTemplateKey: 'PRODUCT_DELIVERED',
                  emailCategory: 'TRANSACTIONAL',
                  metadata: {
                    customerName: orderItem.order.user?.name || orderItem.order.guestName || 'Customer',
                    orderNumber: orderItem.order.orderNumber,
                    productName: orderItem.productName,
                    variantName: orderItem.variantName,
                    category: CustomerNotificationCategory.PRODUCT,
                  },
                  dedupeKey: `PRODUCT_DELIVERED:${orderItem.id}`,
                }).catch(() => {});
              }
            } catch (delivErr) {
              console.error('[DomainEventService PRODUCT_DELIVERED email error]:', delivErr);
            }
          }
          break;

        case 'REPLACEMENT_COMPLETED':
          if (userId) {
            await NotificationService.sendCustomerNotification({
              userId,
              type: 'REPLACEMENT_COMPLETED',
              category: CustomerNotificationCategory.REPLACEMENT,
              title: 'Replacement Berhasil Diselesaikan',
              message: `Permintaan penggantian kredensial/akun untuk ${productName || 'produk Anda'} telah berhasil diproses.`,
              actionUrl: `/account/products`,
              dedupeKey: `rep-comp-${metadata?.replacementId}`,
            });

            try {
              const user = await db.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true },
              });
              if (user?.email) {
                await NotificationOrchestrator.dispatchEvent({
                  userId,
                  userEmail: user.email,
                  eventType: 'REPLACEMENT_COMPLETED',
                  title: `Replacement Berhasil — Akses Baru Tersedia 📦`,
                  message: `Akses replacement pengganti untuk ${productName || 'produk Anda'} sudah tersedia di akun Anda. Silakan masuk ke dashboard untuk melihat kredensial baru.`,
                  actionUrl: `/account/products`,
                  emailTemplateKey: 'REPLACEMENT_COMPLETED',
                  emailCategory: 'TRANSACTIONAL',
                  metadata: {
                    customerName: user.name || 'Customer',
                    productName: productName || 'Produk Digital',
                    category: CustomerNotificationCategory.REPLACEMENT,
                  },
                  dedupeKey: `EMAIL_rep-comp-${metadata?.replacementId}`,
                }).catch(() => {});
              }
            } catch (err) {}
          }
          break;

        case 'INVENTORY_LOW':
          if (metadata?.variantId) {
            await TelegramService.sendInventoryAlertNotification({
              variantId: metadata.variantId,
              productName: productName || 'Produk Digital',
              variantName: metadata?.variantName || 'Varian',
              remainingStock: metadata?.remainingCount || 0,
              minThreshold: metadata?.minThreshold || 5,
            });
          }
          break;

        case 'FULFILLMENT_FAILED':
          if (orderId && orderNumber) {
            await TelegramService.sendFulfillmentFailedNotification({
              orderId,
              orderNumber,
              productName: productName || 'Produk Digital',
              reason: metadata?.lastErrorCode || 'Stok Habis / Allocation Error',
            });

            // Trigger email to super admin
            await EmailService.sendFulfillmentFailedEmail({
              orderNumber,
              customerEmail: metadata?.customerEmail || 'admin@gogomi.store',
              productName: productName || 'Produk Digital',
              reason: metadata?.lastErrorCode || 'Membutuhkan penanganan admin',
            });
          }
          break;

        case 'SUPPLIER_HIGH_FAILURE_RATE':
          if (payload.supplierId) {
            await TelegramService.sendSupplierClaimNotification({
              claimId: `sup-risk-${payload.supplierId}`,
              supplierName: metadata?.supplierName || 'Supplier',
              productName: `Supplier Risk (${metadata?.replacementRate || 0}% failure rate)`,
              type: 'RECOMMENDED',
            });
          }
          break;

        case 'RENEWAL_COMPLETED':
          if (userId) {
            await NotificationService.sendCustomerNotification({
              userId,
              type: 'RENEWAL_COMPLETED',
              category: CustomerNotificationCategory.SUBSCRIPTION,
              title: 'Perpanjangan Berhasil! 🎉',
              message: `Masa aktif ${productName || 'layanan Anda'} telah berhasil diperpanjang.`,
              actionUrl: `/account/renewals`,
              dedupeKey: `rnw-comp-${orderId}`,
            });

            try {
              const user = await db.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true },
              });
              if (user?.email) {
                await NotificationOrchestrator.dispatchEvent({
                  userId,
                  userEmail: user.email,
                  eventType: 'RENEWAL_COMPLETED',
                  title: `Perpanjangan ${productName || 'Produk'} Berhasil 🎉`,
                  message: `Perpanjangan untuk ${productName || 'produk Anda'} telah berhasil diproses. Masa aktif produk Anda kini resmi diperpanjang.`,
                  actionUrl: `/account/subscriptions`,
                  emailTemplateKey: 'RENEWAL_COMPLETED',
                  emailCategory: 'TRANSACTIONAL',
                  metadata: {
                    customerName: user.name || 'Customer',
                    productName: productName || 'Produk Digital',
                    category: CustomerNotificationCategory.SUBSCRIPTION,
                  },
                  dedupeKey: `EMAIL_rnw-comp-${orderId}`,
                }).catch(() => {});
              }
            } catch (err) {}
          }
          break;

        case 'VARIANT_RESTOCKED':
          if (userId) {
            await NotificationService.sendCustomerNotification({
              userId,
              type: 'VARIANT_RESTOCKED',
              category: CustomerNotificationCategory.PRODUCT,
              title: 'Produk yang Anda Tunggu Tersedia! 🎉',
              message: `Stok untuk ${productName || 'produk incaran Anda'} sudah siap dibeli kembali.`,
              actionUrl: metadata?.productSlug ? `/products/${metadata.productSlug}` : `/products`,
              dedupeKey: `restock-${userId}-${metadata?.variantId}`,
            });

            try {
              const user = await db.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true },
              });
              if (user?.email) {
                await NotificationOrchestrator.dispatchEvent({
                  userId,
                  userEmail: user.email,
                  eventType: 'WAITLIST_RESTOCK',
                  title: `${productName || 'Produk'} Sudah Tersedia Kembali! 📦`,
                  message: `Kabar gembira! Stok untuk ${productName || 'produk incaran Anda'} kembali tersedia di Gogomi Store. Ketersediaan stok terbatas.`,
                  actionUrl: metadata?.productSlug ? `/products/${metadata.productSlug}` : `/products`,
                  emailTemplateKey: 'WAITLIST_RESTOCK',
                  emailCategory: 'MARKETING',
                  metadata: {
                    customerName: user.name || 'Customer',
                    productName: productName || 'Produk Digital',
                    variantName: metadata?.variantName || '',
                    category: CustomerNotificationCategory.PRODUCT,
                  },
                  dedupeKey: `EMAIL_restock-${userId}-${metadata?.variantId}`,
                }).catch(() => {});
              }
            } catch (err) {}
          }
          break;

        case 'REFERRAL_QUALIFIED':
          if (userId) {
            await NotificationService.sendCustomerNotification({
              userId,
              type: 'REFERRAL_QUALIFIED',
              category: CustomerNotificationCategory.COIN,
              title: 'Hadiah Referral Memenuhi Syarat! 🎁',
              message: `Referral Anda telah menyelesaikan pembelian pertama. Bonus ${metadata?.referrerCoins || 500} Store Coin sedang diproses (Hold Period 7 hari).`,
              actionUrl: `/account/referrals`,
            });
          }
          break;

        case 'REFERRAL_REWARDED':
          if (userId) {
            await NotificationService.sendCustomerNotification({
              userId,
              type: 'REFERRAL_REWARDED',
              category: CustomerNotificationCategory.COIN,
              title: 'Bonus Referral Cair! 💰',
              message: `Bonus ${metadata?.coinsEarned || 500} Store Coin dari referral Anda sekarang telah masuk ke saldo akun Anda.`,
              actionUrl: `/account/coins`,
            });

            try {
              const user = await db.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true },
              });
              if (user?.email) {
                await NotificationOrchestrator.dispatchEvent({
                  userId,
                  userEmail: user.email,
                  eventType: 'REFERRAL_REWARDED',
                  title: `Reward Referral ${metadata?.coinsEarned || 500} Store Coins Diterima 🎉`,
                  message: `Selamat! Teman yang Anda undang telah berhasil melakukan transaksi pertama. Bonus ${metadata?.coinsEarned || 500} Store Coins telah dikreditkan.`,
                  actionUrl: `/account/referrals`,
                  emailTemplateKey: 'REFERRAL_REWARDED',
                  emailCategory: 'TRANSACTIONAL',
                  metadata: {
                    customerName: user.name || 'Customer',
                    coinAmount: metadata?.coinsEarned || 500,
                    category: CustomerNotificationCategory.COIN,
                  },
                  dedupeKey: `EMAIL_ref-reward-${userId}-${metadata?.coinsEarned || 500}`,
                }).catch(() => {});
              }
            } catch (err) {}
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('[DomainEventService publish Error]:', error);
    }
  }
}
