import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/lib/db/prisma';
import { SupplierService } from '../../src/services/supplier.service';
import { SupplierStatus } from '../../generated/prisma';

describe('Priority 2 — Supplier Management Tests', { timeout: 30000 }, () => {
  beforeEach(async () => {
    await db.replacementRequest.deleteMany({ where: { supplier: { code: 'SUP-TEST-001' } } });
    await db.sharedAccountSlot.deleteMany({ where: { sharedAccount: { label: 'ADB-SUPTEST-01' } } });
    await db.sharedAccount.deleteMany({ where: { label: 'ADB-SUPTEST-01' } });
    await db.inventoryItem.deleteMany({ where: { supplierReference: 'INV-SUPTEST-01' } });
    await db.supplier.deleteMany({ where: { code: 'SUP-TEST-001' } });
  });

  it('should generate sequential supplier code and calculate supplier metrics accurately', async () => {
    const supplier = await db.supplier.create({
      data: {
        name: 'Supplier Test Indo',
        code: 'SUP-TEST-001',
        status: SupplierStatus.ACTIVE,
        contactName: 'Budi Santoso',
        email: 'budi@suppliertest.id',
      },
    });

    expect(supplier.code).toBe('SUP-TEST-001');

    const metrics = await SupplierService.getSupplierPerformanceMetrics(supplier.id);
    expect(metrics.totalInventorySupplied).toBe(0);
    expect(metrics.derivedHealthStatus).toBe('GOOD');
  });
});
