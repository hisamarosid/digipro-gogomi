import { db } from '@/lib/db/prisma';
import { generateOrderNumber, generateSecureToken } from '@/lib/utils/formatters';
import { DomainEventService } from './domainEvent.service';
import { OrderStatus, PaymentStatus } from '../../generated/prisma';
import type { InvoicePayload } from '@/lib/security/invoice-token';

const PLACEHOLDER_SKU = 'JASA-CUSTOM';
const NOTE_PREFIX = 'INVOICE:';

export interface InvoiceCustomer {
  name: string;
  email: string;
  phone?: string;
}

/** Orders created from one payment link are tagged in `internalNotes` so the link can be matched later. */
export function invoiceNote(linkId: string, note?: string): string {
  return `${NOTE_PREFIX}${linkId}${note ? ` | ${note}` : ''}`;
}

export class InvoiceOrderService {
  /**
   * Orders need a real variant. Custom invoices share one hidden, manual-delivery placeholder
   * (INACTIVE product, so it never shows up in the catalog).
   */
  static async ensurePlaceholderVariant() {
    const existing = await db.productVariant.findUnique({ where: { sku: `${PLACEHOLDER_SKU}-V1` } });
    if (existing) return existing;

    const category = await db.category.upsert({
      where: { slug: 'jasa-digital' },
      update: {},
      create: { name: 'Jasa Digital', slug: 'jasa-digital', icon: 'Briefcase', active: true },
    });

    const product = await db.product.upsert({
      where: { sku: PLACEHOLDER_SKU },
      update: {},
      create: {
        name: 'Jasa Custom (Tagihan)',
        slug: 'jasa-custom-tagihan',
        sku: PLACEHOLDER_SKU,
        shortDesc: 'Tagihan jasa khusus yang dibuat admin.',
        fullDesc: 'Produk internal untuk tagihan jasa dengan harga khusus. Tidak ditampilkan di katalog.',
        categoryId: category.id,
        status: 'INACTIVE',
      },
    });

    return db.productVariant.create({
      data: {
        productId: product.id,
        name: 'Jasa Custom',
        sku: `${PLACEHOLDER_SKU}-V1`,
        price: 0,
        stockMode: 'UNLIMITED',
        deliveryType: 'MANUAL',
        deliveryModel: 'MANUAL',
        warrantyDays: 0,
        renewalEnabled: false,
        waitlistEnabled: false,
        active: true,
      },
    });
  }

  /** Newest first. */
  static async findOrdersForLink(linkId: string) {
    return db.order.findMany({
      where: { internalNotes: { startsWith: `${NOTE_PREFIX}${linkId}` } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true, status: true, paymentStatus: true, guestEmail: true, guestToken: true, createdAt: true },
    });
  }

  /** Creates a normal pending order (15-minute QRIS window) from a verified payment link. */
  static async createOrderFromInvoice(invoice: InvoicePayload, customer: InvoiceCustomer) {
    const variant = await this.ensurePlaceholderVariant();
    const total = invoice.amount * invoice.qty;
    const guestToken = generateSecureToken(32);

    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: null,
        guestEmail: customer.email,
        guestName: customer.name,
        guestPhone: customer.phone || null,
        guestToken,
        totalAmount: total,
        discountAmount: 0,
        grandTotal: total,
        cashPayableAmount: total,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        internalNotes: invoiceNote(invoice.id, invoice.note),
        items: {
          create: [
            {
              variantId: variant.id,
              productName: invoice.title,
              variantName: 'Jasa Custom',
              sku: variant.sku,
              unitPrice: invoice.amount,
              quantity: invoice.qty,
              subtotal: total,
              deliveryType: 'MANUAL',
              deliveryModelSnapshot: 'MANUAL',
              warrantyDays: 0,
              importantNotesSnapshot: invoice.note || null,
            },
          ],
        },
      },
      include: { items: true },
    });

    await DomainEventService.publish({
      eventName: 'ORDER_CREATED',
      userId: null,
      orderId: order.id,
      orderNumber: order.orderNumber,
      metadata: {
        customerName: customer.name,
        productName: invoice.title,
        variantName: 'Jasa Custom',
        totalAmount: order.grandTotal,
      },
    });

    return order;
  }
}
