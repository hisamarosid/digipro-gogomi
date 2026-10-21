import { db } from '@/lib/db/prisma';
import { decryptPayload } from '@/lib/security/encryption';
import { AuditService } from '@/services/audit.service';

export interface RevealCredentialRequest {
  adminUserId: string;
  inventoryId: string;
  supplierClaimId?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DecryptedCredentialResult {
  inventoryId: string;
  type: string;
  decryptedPayload: string;
  supplierId?: string | null;
  supplierName?: string | null;
  supplierReference?: string | null;
}

export class SecureCredentialRevealService {
  /**
   * Securely decrypts broken inventory credentials for authorized admin warranty verification.
   * Every invocation is logged in AuditLog with actor, IP, and reason.
   */
  static async revealBrokenCredential(
    req: RevealCredentialRequest
  ): Promise<DecryptedCredentialResult> {
    const { adminUserId, inventoryId, supplierClaimId, reason, ipAddress, userAgent } = req;

    // 1. Authorization check
    const adminUser = await db.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, name: true, email: true, role: true, disabled: true },
    });

    if (!adminUser || adminUser.disabled || (adminUser.role !== 'SUPER_ADMIN' && adminUser.role !== 'ADMIN')) {
      throw new Error('FORBIDDEN_SENSITIVE_REVEAL');
    }

    // 2. Fetch inventory item with encrypted fields
    const inventory = await db.inventoryItem.findUnique({
      where: { id: inventoryId },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
      },
    });

    if (!inventory) {
      throw new Error('INVENTORY_ITEM_NOT_FOUND');
    }

    // 3. Server-side AES-256-GCM decryption
    const decryptedPayload = decryptPayload({
      cipher: inventory.payloadCipher,
      iv: inventory.payloadIv,
      authTag: inventory.payloadAuthTag,
    });

    // 4. Record MANDATORY Audit Log
    await AuditService.log({
      actorId: adminUser.id,
      action: 'SUPPLIER_CLAIM_CREDENTIAL_REVEALED',
      entity: 'InventoryItem',
      entityId: inventory.id,
      after: {
        supplierClaimId: supplierClaimId || null,
        reason: reason || 'Supplier Warranty Verification',
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      inventoryId: inventory.id,
      type: inventory.type,
      decryptedPayload,
      supplierId: inventory.supplier?.id || null,
      supplierName: inventory.supplier?.name || null,
      supplierReference: inventory.supplierReference || null,
    };
  }
}
