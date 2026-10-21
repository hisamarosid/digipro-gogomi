import { describe, it, expect } from 'vitest';
import { InventoryHealthService } from '../../src/services/inventoryHealth.service';
import { InventoryHealthStatus } from '../../generated/prisma';

describe('Priority 1 — Inventory Health System Tests', () => {
  it('should evaluate HEALTHY status for dedicated stock with far expiry date', () => {
    const farFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days
    const health = InventoryHealthService.evaluateDedicatedHealth({
      status: 'AVAILABLE',
      expiresAt: farFuture,
    });

    expect(health.status).toBe(InventoryHealthStatus.HEALTHY);
    expect(health.score).toBe(100);
  });

  it('should evaluate CRITICAL status for dedicated stock expiring within 6 hours', () => {
    const in5Hours = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours
    const health = InventoryHealthService.evaluateDedicatedHealth({
      status: 'AVAILABLE',
      expiresAt: in5Hours,
    });

    expect(health.status).toBe(InventoryHealthStatus.CRITICAL);
    expect(health.score).toBe(25);
  });

  it('should evaluate INVALID status for disabled inventory item', () => {
    const health = InventoryHealthService.evaluateDedicatedHealth({
      status: 'DISABLED',
      expiresAt: null,
    });

    expect(health.status).toBe(InventoryHealthStatus.INVALID);
    expect(health.score).toBe(0);
  });
});
