import { db } from '@/lib/db/prisma';
import { InventoryHealthStatus, SharedAccountStatus, SharedSlotStatus } from '../../generated/prisma';

export interface HealthEvaluationResult {
  status: InventoryHealthStatus;
  score: number; // 0 - 100
  reasonCode: string;
  reasonMessage: string;
  details?: Record<string, any>;
}

export class InventoryHealthService {
  /**
   * Evaluates Dedicated Inventory Item Health
   */
  static evaluateDedicatedHealth(item: any): HealthEvaluationResult {
    if (item.status === 'DISABLED' || item.status === 'INVALID') {
      return {
        status: InventoryHealthStatus.INVALID,
        score: 0,
        reasonCode: 'INVENTORY_MARKED_INVALID',
        reasonMessage: 'Inventory item ditandai invalid atau disabled',
      };
    }

    if (!item.expiresAt) {
      return {
        status: InventoryHealthStatus.HEALTHY,
        score: 100,
        reasonCode: 'NO_EXPIRATION',
        reasonMessage: 'Stok bersifat permanen tanpa tanggal kadaluarsa',
      };
    }

    const now = new Date();
    const remainingMs = item.expiresAt.getTime() - now.getTime();
    const remainingHours = remainingMs / (1000 * 60 * 60);

    if (remainingHours <= 0) {
      return {
        status: InventoryHealthStatus.INVALID,
        score: 0,
        reasonCode: 'CREDENTIAL_EXPIRED',
        reasonMessage: 'Kredensial sudah melewati tanggal kadaluarsa',
      };
    } else if (remainingHours <= 6) {
      return {
        status: InventoryHealthStatus.CRITICAL,
        score: 25,
        reasonCode: 'EXPIRING_WITHIN_6H',
        reasonMessage: `Kredensial akan kadaluarsa dalam ${Math.floor(remainingHours)} jam`,
      };
    } else if (remainingHours <= 24) {
      return {
        status: InventoryHealthStatus.EXPIRING_SOON,
        score: 50,
        reasonCode: 'EXPIRING_WITHIN_24H',
        reasonMessage: `Kredensial akan kadaluarsa dalam ${Math.floor(remainingHours)} jam`,
      };
    } else if (remainingHours <= 72) {
      return {
        status: InventoryHealthStatus.WARNING,
        score: 75,
        reasonCode: 'EXPIRING_WITHIN_72H',
        reasonMessage: `Kredensial akan kadaluarsa dalam ${Math.floor(remainingHours / 24)} hari`,
      };
    }

    return {
      status: InventoryHealthStatus.HEALTHY,
      score: 100,
      reasonCode: 'HEALTHY_EXPIRY',
      reasonMessage: 'Kredensial dalam kondisi sehat',
    };
  }

  /**
   * Evaluates Shared Account Master & Slots Health
   */
  static async evaluateSharedAccountHealth(account: any): Promise<HealthEvaluationResult> {
    if (account.status === SharedAccountStatus.INVALID || account.status === SharedAccountStatus.DISABLED) {
      return {
        status: InventoryHealthStatus.INVALID,
        score: 0,
        reasonCode: 'MASTER_MARKED_INVALID',
        reasonMessage: 'Akun Master Shared ditandai INVALID atau DISABLED',
      };
    }

    const now = new Date();

    if (account.masterExpiresAt && account.masterExpiresAt <= now) {
      return {
        status: InventoryHealthStatus.INVALID,
        score: 0,
        reasonCode: 'MASTER_EXPIRED',
        reasonMessage: 'Masa aktif akun master telah habis',
      };
    }

    // Check replacement frequency rate in last 24h
    const recentReplacements = await db.replacementRequest.count({
      where: {
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        newFulfillment: { sharedAccountSlot: { sharedAccountId: account.id } },
      },
    });

    if (recentReplacements >= 5) {
      return {
        status: InventoryHealthStatus.CRITICAL,
        score: 30,
        reasonCode: 'HIGH_REPLACEMENT_RATE',
        reasonMessage: `Terdeteksi ${recentReplacements} permintaan klaim garansi dalam 24 jam terakhir`,
      };
    }

    if (account.masterExpiresAt) {
      const remainingDays = (account.masterExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (remainingDays <= 3) {
        return {
          status: InventoryHealthStatus.CRITICAL,
          score: 35,
          reasonCode: 'MASTER_EXPIRING_CRITICAL',
          reasonMessage: `Sisa masa aktif master hanya ${Math.floor(remainingDays)} hari lagi`,
        };
      } else if (remainingDays <= 7) {
        return {
          status: InventoryHealthStatus.WARNING,
          score: 70,
          reasonCode: 'MASTER_EXPIRING_WARNING',
          reasonMessage: `Sisa masa aktif master ${Math.floor(remainingDays)} hari lagi`,
        };
      }
    }

    return {
      status: InventoryHealthStatus.HEALTHY,
      score: 95,
      reasonCode: 'MASTER_HEALTHY',
      reasonMessage: 'Akun Master Shared dalam kondisi sehat dan stabil',
    };
  }

  /**
   * System-wide Inventory Health Overview Summary for Admin Operations Dashboard
   */
  static async getInventoryHealthSummary() {
    const dedicatedItems = await db.inventoryItem.findMany({
      where: { status: { in: ['AVAILABLE', 'RESERVED'] } },
    });

    const sharedAccounts = await db.sharedAccount.findMany({
      where: { status: { in: [SharedAccountStatus.AVAILABLE, SharedAccountStatus.PARTIALLY_USED, SharedAccountStatus.FULL] } },
      include: { slots: true },
    });

    const familyGroups = await db.familyGroup.findMany({
      include: { members: true },
    });

    let healthyCount = 0;
    let warningCount = 0;
    let expiringSoonCount = 0;
    let criticalCount = 0;
    let invalidCount = 0;

    for (const item of dedicatedItems) {
      const health = this.evaluateDedicatedHealth(item);
      if (health.status === InventoryHealthStatus.HEALTHY) healthyCount++;
      else if (health.status === InventoryHealthStatus.WARNING) warningCount++;
      else if (health.status === InventoryHealthStatus.EXPIRING_SOON) expiringSoonCount++;
      else if (health.status === InventoryHealthStatus.CRITICAL) criticalCount++;
      else if (health.status === InventoryHealthStatus.INVALID) invalidCount++;
    }

    for (const acc of sharedAccounts) {
      const health = await this.evaluateSharedAccountHealth(acc);
      if (health.status === InventoryHealthStatus.HEALTHY) healthyCount++;
      else if (health.status === InventoryHealthStatus.WARNING) warningCount++;
      else if (health.status === InventoryHealthStatus.EXPIRING_SOON) expiringSoonCount++;
      else if (health.status === InventoryHealthStatus.CRITICAL) criticalCount++;
      else if (health.status === InventoryHealthStatus.INVALID) invalidCount++;
    }

    const totalTracked = healthyCount + warningCount + expiringSoonCount + criticalCount + invalidCount;
    const healthPercentage = totalTracked > 0 ? Math.round((healthyCount / totalTracked) * 100) : 100;

    return {
      healthyCount,
      warningCount,
      expiringSoonCount,
      criticalCount,
      invalidCount,
      totalTracked,
      healthPercentage,
      familyGroupCount: familyGroups.length,
    };
  }
}
