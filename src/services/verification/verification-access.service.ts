import { db } from '@/lib/db/prisma';
import { AuditService } from '../audit.service';
import { ProviderParserService } from './provider-parser.service';
import { encryptPayload, decryptPayload } from '@/lib/security/encryption';

export interface VerificationConfigResult {
  orderItemId: string;
  productName: string;
  variantName: string;
  verificationRequired: boolean;
  verificationMethod: 'NONE' | 'EXTERNAL_INBOX_URL' | 'GOGOMI_MAIL' | 'MANUAL';
  verificationEmail?: string | null;
  verificationAccessUrl?: string | null;
  verificationProvider?: string | null;
  verificationInstructions?: string | null;
}

export interface VerificationRequestResult {
  status: 'NONE' | 'EXTERNAL_INBOX_URL' | 'MANUAL' | 'FOUND' | 'WAITING' | 'CONCURRENCY_BLOCKED' | 'FAILED';
  message?: string;
  requestId?: string;
  accessUrl?: string | null;
  instructions?: string | null;
  code?: string | null;
  receivedAt?: Date | null;
  expiresAt?: Date | null;
}

function safeEncrypt(text: string): string {
  if (!text) return '';
  const encObj = encryptPayload(text);
  return JSON.stringify(encObj);
}

function safeDecrypt(encStr: string): string {
  if (!encStr) return '';
  try {
    const parsed = JSON.parse(encStr);
    if (parsed && typeof parsed === 'object' && parsed.cipher && parsed.iv && parsed.authTag) {
      return decryptPayload(parsed);
    }
  } catch {
    // Fallback
  }
  return encStr;
}

export class VerificationAccessService {
  /**
   * Resolves Verification Access configuration for a given OrderItem & Customer session.
   */
  static async getVerificationConfigForOrderItem(
    orderItemId: string,
    userId: string
  ): Promise<VerificationConfigResult> {
    const orderItem = await (db.orderItem as any).findFirst({
      where: { id: orderItemId, order: { userId } },
      include: {
        variant: {
          include: { product: true },
        },
        fulfillments: {
          include: {
            inventoryItem: true,
            sharedAccountSlot: true,
            familyMemberSlot: true,
          },
        },
      },
    });

    if (!orderItem) {
      throw new Error('ORDER_ITEM_NOT_FOUND');
    }

    const fulfillment =
      orderItem.fulfillments.find((f: any) => f.status === 'ACTIVE' || f.status === 'FULFILLED') ||
      orderItem.fulfillments[orderItem.fulfillments.length - 1] ||
      orderItem.fulfillments[0];

    const now = new Date();
    let slotOrItemExpiry: Date | null = null;
    if (fulfillment?.sharedAccountSlot?.expiresAt) {
      slotOrItemExpiry = new Date(fulfillment.sharedAccountSlot.expiresAt);
    } else if (fulfillment?.familyMemberSlot?.expiresAt) {
      slotOrItemExpiry = new Date(fulfillment.familyMemberSlot.expiresAt);
    } else if (fulfillment?.inventoryItem?.expiresAt) {
      slotOrItemExpiry = new Date(fulfillment.inventoryItem.expiresAt);
    }

    if (slotOrItemExpiry && slotOrItemExpiry <= now) {
      throw new Error('ORDER_EXPIRED');
    }
    const inventory = fulfillment?.inventoryItem;
    const masterAccount = fulfillment?.sharedAccountSlot?.sharedAccountId
      ? await db.sharedAccount.findUnique({ where: { id: fulfillment.sharedAccountSlot.sharedAccountId } })
      : null;
    const familyGroup = fulfillment?.familyMemberSlot?.familyGroupId
      ? await db.familyGroup.findUnique({ where: { id: fulfillment.familyMemberSlot.familyGroupId } })
      : null;

    const verificationRequired = Boolean(
      inventory?.verificationRequired || masterAccount?.verificationRequired || familyGroup?.verificationRequired
    );

    const verificationMethod = (
      inventory?.verificationMethod ||
      masterAccount?.verificationMethod ||
      familyGroup?.verificationMethod ||
      'NONE'
    ) as 'NONE' | 'EXTERNAL_INBOX_URL' | 'GOGOMI_MAIL' | 'MANUAL';

    const verificationEmail = inventory?.verificationEmail || masterAccount?.verificationEmail || familyGroup?.verificationEmail || null;
    const verificationAccessUrl = inventory?.verificationAccessUrl || masterAccount?.verificationAccessUrl || familyGroup?.verificationAccessUrl || null;
    const verificationProvider = inventory?.verificationProvider || masterAccount?.verificationProvider || familyGroup?.verificationProvider || 'GENERIC';
    const verificationInstructions = inventory?.verificationInstructions || masterAccount?.verificationInstructions || familyGroup?.verificationInstructions || null;

    return {
      orderItemId,
      productName: orderItem.variant?.product?.name || orderItem.productName || 'Produk Digital',
      variantName: orderItem.variant?.name || orderItem.variantName || 'Varian',
      verificationRequired,
      verificationMethod,
      verificationEmail,
      verificationAccessUrl,
      verificationProvider,
      verificationInstructions,
    };
  }

  /**
   * Alias for polling request status
   */
  static async pollVerificationCodeRequest(requestId: string, userId: string): Promise<VerificationRequestResult> {
    return this.getVerificationRequestStatus(requestId, userId);
  }

  /**
   * Triggers or Polls a Verification Request for a customer order
   */
  static async requestVerificationCode(
    arg1: string | { orderItemId: string; userId: string; ipAddress?: string },
    arg2?: string,
    arg3?: string
  ): Promise<VerificationRequestResult> {
    let orderItemId: string;
    let userId: string;
    let ipAddress: string | undefined;

    if (typeof arg1 === 'string') {
      orderItemId = arg1;
      userId = arg2!;
      ipAddress = arg3;
    } else {
      orderItemId = arg1.orderItemId;
      userId = arg1.userId;
      ipAddress = arg1.ipAddress;
    }

    const config = await this.getVerificationConfigForOrderItem(orderItemId, userId);

    if (!config.verificationRequired || config.verificationMethod === 'NONE') {
      return { status: 'NONE', message: 'Produk ini tidak memerlukan kode verifikasi.' };
    }

    if (config.verificationMethod === 'EXTERNAL_INBOX_URL') {
      return {
        status: 'EXTERNAL_INBOX_URL',
        accessUrl: config.verificationAccessUrl,
        message: 'Silakan buka link inbox external berikut untuk melihat kode verifikasi Anda.',
      };
    }

    if (config.verificationMethod === 'MANUAL') {
      return {
        status: 'MANUAL',
        instructions: config.verificationInstructions || 'Silakan hubungi Customer Support untuk mendapatkan kode verifikasi.',
        message: 'Verifikasi diproses secara manual.',
      };
    }

    // GOGOMI_MAIL AUTOMATIC VERIFICATION SYSTEM
    const orderItem = await (db.orderItem as any).findFirst({
      where: { id: orderItemId },
      include: {
        fulfillments: {
          include: {
            inventoryItem: true,
            sharedAccountSlot: true,
            familyMemberSlot: true,
          },
        },
      },
    });

    const fulfillment =
      orderItem?.fulfillments.find((f: any) => f.status === 'ACTIVE' || f.status === 'FULFILLED') ||
      orderItem?.fulfillments[orderItem.fulfillments.length - 1] ||
      orderItem?.fulfillments[0];
    const inventoryId = fulfillment?.inventoryItemId || null;
    const sharedMasterId = fulfillment?.sharedAccountSlot?.sharedAccountId || null;
    const familyMasterId = fulfillment?.familyMemberSlot?.familyGroupId || null;
    const provider = (config.verificationProvider || 'GENERIC').toUpperCase();

    const now = new Date();

    // 1. Concurrency Protection (Shared Account / Family Group: 1 Active Request Per Master + Provider)
    if (sharedMasterId) {
      const activeSharedReq = await (db.verificationRequest as any).findFirst({
        where: {
          sharedAccountId: sharedMasterId,
          provider,
          status: 'WAITING',
          expiresAt: { gt: now },
          userId: { not: userId },
        },
      });

      if (activeSharedReq) {
        return {
          status: 'CONCURRENCY_BLOCKED',
          message: 'Kode verifikasi sedang diproses untuk sesi pengguna lain. Silakan coba kembali beberapa saat lagi.',
        };
      }
    }

    if (familyMasterId) {
      const activeFamilyReq = await (db.verificationRequest as any).findFirst({
        where: {
          familyGroupId: familyMasterId,
          provider,
          status: 'WAITING',
          expiresAt: { gt: now },
          userId: { not: userId },
        },
      });

      if (activeFamilyReq) {
        return {
          status: 'CONCURRENCY_BLOCKED',
          message: 'Kode verifikasi sedang diproses untuk member family lain. Silakan coba kembali beberapa saat lagi.',
        };
      }
    }

    // 2. Check if active WAITING request exists for current user
    const existingReq = await (db.verificationRequest as any).findFirst({
      where: {
        orderItemId,
        userId,
        status: 'WAITING',
        expiresAt: { gt: now },
      },
      orderBy: { requestedAt: 'desc' },
    });

    if (existingReq) {
      return {
        status: 'WAITING',
        requestId: existingReq.id,
        expiresAt: existingReq.expiresAt,
        message: 'Sedang menunggu email kode verifikasi masuk...',
      };
    }

    // Resolve Mailbox ID if available
    let mailboxId: string | null = null;
    if (config.verificationEmail) {
      const mailbox = await (db.mailbox as any).findUnique({
        where: { email: config.verificationEmail.toLowerCase().trim() },
      });
      mailboxId = mailbox?.id || null;
    }

    // 3. RECENT CODE RECOVERY (Lookback window 5 minutes)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentCodeEvent = await (db.verificationCodeEvent as any).findFirst({
      where: {
        provider,
        status: 'UNCLAIMED',
        receivedAt: { gte: fiveMinutesAgo },
        ...(mailboxId ? { mailboxId } : {}),
      },
      orderBy: { receivedAt: 'desc' },
    });

    if (recentCodeEvent) {
      const rawCode = safeDecrypt(recentCodeEvent.codeEncrypted);
      if (rawCode) {
        const fulfilledReq = await (db.verificationRequest as any).create({
          data: {
            userId,
            orderItemId,
            inventoryItemId: inventoryId,
            sharedAccountId: sharedMasterId,
            mailboxId,
            provider,
            status: 'FOUND',
            requestedAt: now,
            expiresAt: recentCodeEvent.expiresAt,
            fulfilledAt: now,
            codeEventId: recentCodeEvent.id,
            codeFound: safeEncrypt(rawCode),
          },
        });

        await (db.verificationCodeEvent as any).update({
          where: { id: recentCodeEvent.id },
          data: {
            status: 'CLAIMED',
            claimedByRequestId: fulfilledReq.id,
            claimedAt: now,
          },
        });

        await AuditService.log({
          actorId: userId,
          action: 'VERIFICATION_CODE_FOUND',
          entity: 'VERIFICATION_REQUEST',
          entityId: fulfilledReq.id,
          ip: ipAddress,
        });

        return {
          status: 'FOUND',
          requestId: fulfilledReq.id,
          code: rawCode,
          receivedAt: recentCodeEvent.receivedAt,
          expiresAt: recentCodeEvent.expiresAt,
        };
      }
    }

    // 4. Create NEW WAITING REQUEST if no recent code
    const requestExpiresAt = new Date(now.getTime() + 3 * 60 * 1000); // 3 minutes timeout
    const newRequest = await (db.verificationRequest as any).create({
      data: {
        userId,
        orderItemId,
        inventoryItemId: inventoryId,
        sharedAccountId: sharedMasterId,
        mailboxId,
        provider,
        status: 'WAITING',
        requestedAt: now,
        expiresAt: requestExpiresAt,
      },
    });

    await AuditService.log({
      actorId: userId,
      action: 'VERIFICATION_CODE_REQUESTED',
      entity: 'VERIFICATION_REQUEST',
      entityId: newRequest.id,
      ip: ipAddress,
    });

    return {
      status: 'WAITING',
      requestId: newRequest.id,
      expiresAt: requestExpiresAt,
      message: 'Permintaan kode verifikasi dikirim. Mengamati email masuk...',
    };
  }

  /**
   * Polls specific VerificationRequest status by ID
   */
  static async getVerificationRequestStatus(requestId: string, userId: string): Promise<VerificationRequestResult> {
    const request = await (db.verificationRequest as any).findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('VERIFICATION_REQUEST_NOT_FOUND');
    }

    if (request.userId !== userId) {
      throw new Error('FORBIDDEN');
    }

    const now = new Date();

    // Check expiration
    if (request.status === 'WAITING' && now > request.expiresAt) {
      await (db.verificationRequest as any).update({
        where: { id: requestId },
        data: { status: 'EXPIRED' },
      });
      return {
        status: 'FAILED',
        message: 'Waktu pencarian kode habis. Silakan minta ulang kode dari layanan terkait lalu klik DAPATKAN KODE.',
      };
    }

    if (request.status === 'FOUND' && request.codeFound) {
      const rawCode = safeDecrypt(request.codeFound);
      return {
        status: 'FOUND',
        requestId: request.id,
        code: rawCode,
        receivedAt: request.fulfilledAt || request.requestedAt,
        expiresAt: request.expiresAt,
      };
    }

    return {
      status: request.status === 'WAITING' ? 'WAITING' : 'FAILED',
      requestId: request.id,
      expiresAt: request.expiresAt,
      message: request.status === 'WAITING' ? 'Menunggu email masuk...' : 'Kode belum dapat ditemukan secara otomatis.',
    };
  }

  /**
   * Inbound Webhook Mail Handler (TMail or Custom Webhook)
   */
  static async processInboundMailWebhook(input: {
    secret?: string;
    recipientEmail: string;
    senderEmail: string;
    subject: string;
    bodyText: string;
    messageId?: string;
  }) {
    // 1. Verify Secret
    // SECURITY: the secret is mandatory and has no hard-coded fallback.
    const expectedSecret = (process.env.TMAIL_WEBHOOK_SECRET || process.env.INBOUND_MAIL_SECRET || '').trim();
    const providedSecret = (input.secret || '').trim();
    const crypto = await import('crypto');
    const sameSecret =
      expectedSecret.length > 0 &&
      providedSecret.length > 0 &&
      crypto.timingSafeEqual(
        crypto.createHash('sha256').update(providedSecret).digest(),
        crypto.createHash('sha256').update(expectedSecret).digest()
      );
    if (!sameSecret) {
      throw new Error('INVALID_WEBHOOK_SECRET');
    }

    const now = new Date();
    const recipientEmail = input.recipientEmail.toLowerCase().trim();
    const senderEmail = input.senderEmail.trim();

    // Deduplicate by messageIdHash
    const messageIdHash = input.messageId || `${recipientEmail}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const existing = await (db.verificationCodeEvent as any).findUnique({
      where: { messageIdHash },
    });
    if (existing) {
      return { success: true, duplicate: true, eventId: existing.id };
    }

    // 2. Resolve or Auto-Upsert Mailbox
    const mailbox = await (db.mailbox as any).upsert({
      where: { email: recipientEmail },
      update: { lastWebhookAt: now, lastReceivedAt: now },
      create: {
        email: recipientEmail,
        status: 'ACTIVE',
        provider: 'TMAIL',
        lastWebhookAt: now,
        lastReceivedAt: now,
      },
    });

    // 3. Parse Code using ProviderParserService
    const parsed = ProviderParserService.parseInboundEmail(senderEmail, input.subject, input.bodyText);
    if (!parsed.code || parsed.confidence === 'LOW') {
      return { success: true, parsed: false, reason: parsed.reason };
    }

    const encryptedCode = safeEncrypt(parsed.code);

    // 4. Save Code Event
    const codeEvent = await (db.verificationCodeEvent as any).create({
      data: {
        mailboxId: mailbox?.id || null,
        provider: parsed.provider,
        sender: senderEmail,
        subject: input.subject,
        codeEncrypted: encryptedCode,
        receivedAt: now,
        expiresAt: parsed.expiresAt,
        confidence: parsed.confidence,
        status: 'UNCLAIMED',
        messageIdHash,
      },
    });

    // 5. Match with WAITING VerificationRequest
    const waitingRequest = await (db.verificationRequest as any).findFirst({
      where: {
        provider: parsed.provider,
        status: 'WAITING',
        expiresAt: { gt: now },
        ...(mailbox ? { mailboxId: mailbox.id } : {}),
      },
      orderBy: { requestedAt: 'asc' },
    });

    if (waitingRequest) {
      await (db.verificationRequest as any).update({
        where: { id: waitingRequest.id },
        data: {
          status: 'FOUND',
          fulfilledAt: now,
          codeEventId: codeEvent.id,
          codeFound: encryptedCode,
        },
      });

      await (db.verificationCodeEvent as any).update({
        where: { id: codeEvent.id },
        data: {
          status: 'CLAIMED',
          claimedByRequestId: waitingRequest.id,
          claimedAt: now,
        },
      });
    }

    return {
      success: true,
      parsed: true,
      provider: parsed.provider,
      code: parsed.code,
      confidence: parsed.confidence,
      matchedRequestId: waitingRequest?.id || null,
    };
  }
}
