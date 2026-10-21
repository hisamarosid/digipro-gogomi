import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/prisma';
import { SupplierWarrantyEligibilityService } from '@/services/supplier-warranty/supplier-warranty-eligibility.service';
import { SupplierClaimRecommendationService } from '@/services/supplier-warranty/supplier-claim-recommendation.service';
import { SecureCredentialRevealService } from '@/services/supplier-warranty/secure-credential-reveal.service';
import { SupplierClaimService } from '@/services/supplier-warranty/supplier-claim.service';
import { encryptPayload } from '@/lib/security/encryption';

describe('External Supplier Warranty & Claim Recovery System Unit Tests', () => {
  let testSupplier: any;
  let testVariant: any;
  let testAdmin: any;
  let testCustomer: any;

  beforeEach(async () => {
    // Create Test Admin & Customer
    testAdmin = await db.user.create({
      data: {
        name: 'Admin Warranty Tester',
        email: `admin_w_${Date.now()}@example.com`,
        passwordHash: 'hashedpass',
        role: 'ADMIN',
      },
    });

    testCustomer = await db.user.create({
      data: {
        name: 'Customer Tester',
        email: `cust_w_${Date.now()}@example.com`,
        passwordHash: 'hashedpass',
        role: 'CUSTOMER',
      },
    });

    // Create Test Supplier & Policy
    const supCode = await db.supplier.count();
    testSupplier = await db.supplier.create({
      data: {
        name: 'Global Tech Supplier Ltd',
        code: `SUP-TEST-${supCode + 1}-${Date.now().toString().slice(-4)}`,
        primaryContactMethod: 'WHATSAPP',
        whatsapp: '+628123456789',
        email: 'claims@globaltechsupplier.com',
      },
    });

    await db.supplierWarrantyPolicy.create({
      data: {
        supplierId: testSupplier.id,
        name: '30-Day Full Replacement Policy',
        warrantyDays: 30,
        claimDeadlineDays: 30,
        claimStartsFrom: 'PURCHASE_DATE',
      },
    });

    // Create Product & Variant
    const category = await db.category.create({
      data: { name: `Test Category ${Date.now()}`, slug: `test-cat-${Date.now()}` },
    });

    const product = await db.product.create({
      data: {
        categoryId: category.id,
        name: 'Adobe Creative Cloud 1 Month',
        shortDesc: 'Adobe CC 1 Month Subscription',
        fullDesc: 'Full Adobe CC Description',
        slug: `adobe-cc-${Date.now()}`,
        sku: `SKU-ADB-${Date.now()}`,
      },
    });

    testVariant = await db.productVariant.create({
      data: {
        productId: product.id,
        name: 'Shared Account 1 Month',
        price: 50000,
        sku: `VAR-ADB-${Date.now()}`,
      },
    });
  });

  it('1. Should correctly verify active warranty eligibility', async () => {
    const res = await SupplierWarrantyEligibilityService.checkWarrantyEligibility({
      supplierId: testSupplier.id,
      purchaseDate: new Date(),
      failureReason: 'ACCOUNT_DISABLED',
    });

    expect(res.eligible).toBe(true);
    expect(res.daysRemaining).toBe(30);
    expect(res.reason).toBeNull();
  });

  it('2. Should reject claim for customer error (CUSTOMER_CAUSED_ISSUE)', async () => {
    const res = await SupplierWarrantyEligibilityService.checkWarrantyEligibility({
      supplierId: testSupplier.id,
      purchaseDate: new Date(),
      failureReason: 'CUSTOMER_ERROR',
      isCustomerFault: true,
    });

    expect(res.eligible).toBe(false);
    expect(res.reason).toBe('CUSTOMER_CAUSED_ISSUE');
  });

  it('3. Should reject claim if warranty is expired', async () => {
    const pastDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
    const res = await SupplierWarrantyEligibilityService.checkWarrantyEligibility({
      supplierId: testSupplier.id,
      purchaseDate: pastDate,
      failureReason: 'ACCOUNT_DISABLED',
    });

    expect(res.eligible).toBe(false);
    expect(res.reason).toBe('WARRANTY_EXPIRED');
  });

  it('4. Should enforce 1 Shared Master / 1 Inventory Failure = 1 Active Claim (Deduplication)', async () => {
    const enc = encryptPayload('master_user@example.com:SecretPass123');
    const oldInventory = await db.inventoryItem.create({
      data: {
        variantId: testVariant.id,
        type: 'LICENSE_KEY',
        payloadCipher: enc.cipher,
        payloadIv: enc.iv,
        payloadAuthTag: enc.authTag,
        status: 'INVALID',
        supplierId: testSupplier.id,
        costAmount: 100000,
      },
    });

    // Trigger recommendation for Customer A
    const claim1 = await SupplierClaimRecommendationService.evaluateAndRecommendClaim({
      inventoryId: oldInventory.id,
      failureReason: 'ACCOUNT_DISABLED',
      description: 'Customer A replacement',
    });

    // Trigger recommendation for Customer B for SAME broken inventory
    const claim2 = await SupplierClaimRecommendationService.evaluateAndRecommendClaim({
      inventoryId: oldInventory.id,
      failureReason: 'ACCOUNT_DISABLED',
      description: 'Customer B replacement',
    });

    expect(claim1).toBeDefined();
    expect(claim2).toBeDefined();
    expect(claim1.id).toBe(claim2.id); // Must be identical claim!
  });

  it('5. Should allow authorized admin to reveal broken credentials and write Audit Log', async () => {
    const enc = encryptPayload('broken_key_123456');
    const inv = await db.inventoryItem.create({
      data: {
        variantId: testVariant.id,
        type: 'LICENSE_KEY',
        payloadCipher: enc.cipher,
        payloadIv: enc.iv,
        payloadAuthTag: enc.authTag,
        status: 'INVALID',
        supplierId: testSupplier.id,
      },
    });

    const result = await SecureCredentialRevealService.revealBrokenCredential({
      adminUserId: testAdmin.id,
      inventoryId: inv.id,
      reason: 'Supplier Warranty Inspection',
    });

    expect(result.decryptedPayload).toBe('broken_key_123456');

    // Verify AuditLog
    const audit = await db.auditLog.findFirst({
      where: {
        actorId: testAdmin.id,
        action: 'SUPPLIER_CLAIM_CREDENTIAL_REVEALED',
      },
    });

    expect(audit).toBeDefined();
    expect(audit?.entityId).toBe(inv.id);
  });

  it('6. Should reject credential reveal for unauthorized customer', async () => {
    const enc = encryptPayload('secret_broken');
    const inv = await db.inventoryItem.create({
      data: {
        variantId: testVariant.id,
        type: 'LICENSE_KEY',
        payloadCipher: enc.cipher,
        payloadIv: enc.iv,
        payloadAuthTag: enc.authTag,
        status: 'INVALID',
      },
    });

    await expect(
      SecureCredentialRevealService.revealBrokenCredential({
        adminUserId: testCustomer.id, // CUSTOMER role
        inventoryId: inv.id,
      })
    ).rejects.toThrow('FORBIDDEN_SENSITIVE_REVEAL');
  });

  it('7. Should generate claim message with zero passwords or PINs', async () => {
    const enc = encryptPayload('user:SecretPassWithPin1234');
    const inv = await db.inventoryItem.create({
      data: {
        variantId: testVariant.id,
        type: 'LICENSE_KEY',
        payloadCipher: enc.cipher,
        payloadIv: enc.iv,
        payloadAuthTag: enc.authTag,
        status: 'INVALID',
        supplierId: testSupplier.id,
      },
    });

    const claim = await SupplierClaimRecommendationService.evaluateAndRecommendClaim({
      inventoryId: inv.id,
      failureReason: 'ACCOUNT_DISABLED',
    });

    const message = await SupplierClaimService.generateClaimMessage(claim.id);

    expect(message).toContain(claim.claimNumber);
    expect(message).toContain('Adobe Creative Cloud');
    expect(message).not.toContain('SecretPassWithPin1234'); // ZERO PASSWORDS!
  });

  it('8. Should create new replacement inventory with Rp0 cash cost when resolving replacement', async () => {
    const enc = encryptPayload('old_invalid');
    const inv = await db.inventoryItem.create({
      data: {
        variantId: testVariant.id,
        type: 'LICENSE_KEY',
        payloadCipher: enc.cipher,
        payloadIv: enc.iv,
        payloadAuthTag: enc.authTag,
        status: 'INVALID',
        supplierId: testSupplier.id,
        costAmount: 40000,
      },
    });

    const claim = await SupplierClaimRecommendationService.evaluateAndRecommendClaim({
      inventoryId: inv.id,
      failureReason: 'ACCOUNT_DISABLED',
    });

    const result = await SupplierClaimService.resolveReplacement({
      claimId: claim.id,
      newCredentialPayload: 'NEW_REPLACEMENT_KEY_777',
      adminUserId: testAdmin.id,
    });

    expect(result.claim.status).toBe('CLOSED');
    expect(result.newInventory.sourceType).toBe('SUPPLIER_WARRANTY_REPLACEMENT');
    expect(result.newInventory.costAmount).toBe(0); // Zero cash cost!
    expect(result.recovery.amount).toBe(40000);
  });

  it('9. Should record cash refund recovery without modifying historical inventory cost', async () => {
    const enc = encryptPayload('old_invalid');
    const inv = await db.inventoryItem.create({
      data: {
        variantId: testVariant.id,
        type: 'LICENSE_KEY',
        payloadCipher: enc.cipher,
        payloadIv: enc.iv,
        payloadAuthTag: enc.authTag,
        status: 'INVALID',
        supplierId: testSupplier.id,
        costAmount: 40000,
      },
    });

    const claim = await SupplierClaimRecommendationService.evaluateAndRecommendClaim({
      inventoryId: inv.id,
      failureReason: 'ACCOUNT_DISABLED',
    });

    const result = await SupplierClaimService.resolveRefundOrCredit({
      claimId: claim.id,
      type: 'FULL_REFUND',
      amount: 40000,
      reference: 'TRX-REFUND-999',
      adminUserId: testAdmin.id,
    });

    expect(result.claim.status).toBe('CLOSED');
    expect(result.recovery.type).toBe('FULL_REFUND');
    expect(result.recovery.amount).toBe(40000);

    // Verify original inventory cost is preserved
    const recheckedInv = await db.inventoryItem.findUnique({ where: { id: inv.id } });
    expect(recheckedInv?.costAmount).toBe(40000);
  });
});
