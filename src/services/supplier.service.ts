import { db } from '@/lib/db/prisma';
import {
  SupplierStatus,
  StockStatus,
  SharedSlotStatus,
  OrderStatus,
  SupplierWarrantyClaimStatus,
} from '../../generated/prisma';
import { AuditService } from './audit.service';

export interface SupplierSummaryMetrics {
  // Inventory Counts
  totalInventory: number;
  availableInventory: number;
  soldInventory: number;
  reservedInventory: number;
  invalidInventory: number;

  // Inventory Costs
  totalInventoryCost: number;
  costOfInventorySold: number;
  remainingInventoryCost: number;

  // Sales & Profitability
  revenue: number;
  grossMargin: number;
  grossMarginPercentage: number;
  unitsSold: number;

  // Warranty Claims
  totalClaims: number;
  openClaims: number;
  resolvedClaims: number;
  rejectedClaims: number;
  potentialRecoveryAmount: number;
  recoveredAmount: number;
}

export interface SupplierListItemWithMetrics {
  id: string;
  name: string;
  code: string;
  status: SupplierStatus;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  telegram: string | null;
  website: string | null;
  notes: string | null;
  defaultCurrency: string;
  createdAt: Date;
  metrics: {
    totalInventory: number;
    availableInventory: number;
    soldInventory: number;
    invalidInventory: number;
    totalInventoryCost: number;
    costOfInventorySold: number;
    remainingInventoryCost: number;
    revenue: number;
    grossMargin: number;
    grossMarginPercentage: number;
    openClaims: number;
  };
}

export class SupplierService {
  /**
   * Generates sequential unique supplier code (e.g. SUP-001)
   */
  static async generateSupplierCode(): Promise<string> {
    const count = await db.supplier.count();
    const sequence = (count + 1).toString().padStart(3, '0');
    return `SUP-${sequence}`;
  }

  /**
   * Calculates comprehensive overview metrics for a single supplier using optimized queries
   */
  static async getSupplierSummaryMetrics(supplierId: string): Promise<SupplierSummaryMetrics> {
    const [
      // 1. Dedicated & License Items aggregates
      dedicatedItems,
      // 2. Shared Accounts & Slots
      sharedAccounts,
      // 3. Family Groups & Members
      familyGroups,
      // 4. Sold Order Items with cost snapshots
      orderItems,
      // 5. Warranty Claims & Recoveries
      claims,
      recoveries,
    ] = await Promise.all([
      db.inventoryItem.findMany({
        where: { supplierId },
        select: {
          id: true,
          status: true,
          costAmount: true,
        },
      }),
      db.sharedAccount.findMany({
        where: { supplierId },
        select: {
          id: true,
          status: true,
          acquisitionCost: true,
          maxSlots: true,
          slots: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      db.familyGroup.findMany({
        where: { supplierId },
        select: {
          id: true,
          status: true,
          acquisitionCost: true,
          maxMembers: true,
          members: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      db.orderItem.findMany({
        where: {
          OR: [
            { supplierId },
            { inventoryItem: { supplierId } },
            { sharedAccountSlots: { some: { sharedAccount: { supplierId } } } },
            { familyMemberSlots: { some: { familyGroup: { supplierId } } } },
            { fulfillments: { some: { inventoryItem: { supplierId } } } },
          ],
          order: {
            status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] },
          },
        },
        select: {
          id: true,
          subtotal: true,
          unitPrice: true,
          quantity: true,
          costAmountSnapshot: true,
        },
      }),
      db.supplierWarrantyClaim.findMany({
        where: { supplierId },
        select: {
          id: true,
          status: true,
          claimValue: true,
          claimValueSnapshot: true,
        },
      }),
      db.supplierRecovery.findMany({
        where: { supplierId },
        select: {
          id: true,
          amount: true,
          type: true,
        },
      }),
    ]);

    // --- 1. Calculate Dedicated / License Inventory ---
    let dedicatedTotalCount = dedicatedItems.length;
    let dedicatedAvailableCount = 0;
    let dedicatedSoldCount = 0;
    let dedicatedReservedCount = 0;
    let dedicatedInvalidCount = 0;

    let dedicatedTotalCost = 0;
    let dedicatedSoldCost = 0;
    let dedicatedRemainingCost = 0;

    for (const item of dedicatedItems) {
      const cost = item.costAmount || 0;
      dedicatedTotalCost += cost;

      if (item.status === StockStatus.AVAILABLE) {
        dedicatedAvailableCount += 1;
        dedicatedRemainingCost += cost;
      } else if (item.status === StockStatus.SOLD || item.status === StockStatus.ASSIGNED) {
        dedicatedSoldCount += 1;
        dedicatedSoldCost += cost;
      } else if (item.status === StockStatus.RESERVED) {
        dedicatedReservedCount += 1;
        dedicatedRemainingCost += cost;
      } else if (
        item.status === StockStatus.INVALID ||
        item.status === StockStatus.DISABLED
      ) {
        dedicatedInvalidCount += 1;
      }
    }

    // --- 2. Calculate Shared Account Inventory (Avoid Double-Counting Master Cost) ---
    let sharedTotalSlots = 0;
    let sharedAvailableSlots = 0;
    let sharedSoldSlots = 0;
    let sharedReservedSlots = 0;
    let sharedInvalidSlots = 0;

    let sharedTotalCost = 0;
    let sharedSoldCost = 0;
    let sharedRemainingCost = 0;

    for (const sa of sharedAccounts) {
      const masterCost = sa.acquisitionCost || 0;
      sharedTotalCost += masterCost;
      const slotsCount = sa.slots.length;
      sharedTotalSlots += slotsCount;

      const perSlotCost = sa.maxSlots > 0 ? Math.round(masterCost / sa.maxSlots) : 0;

      for (const slot of sa.slots) {
        if (slot.status === SharedSlotStatus.AVAILABLE) {
          sharedAvailableSlots += 1;
          sharedRemainingCost += perSlotCost;
        } else if (slot.status === SharedSlotStatus.ASSIGNED) {
          sharedSoldSlots += 1;
          sharedSoldCost += perSlotCost;
        } else if (slot.status === SharedSlotStatus.RESERVED) {
          sharedReservedSlots += 1;
          sharedRemainingCost += perSlotCost;
        } else if (slot.status === SharedSlotStatus.INVALID || slot.status === SharedSlotStatus.EXPIRED) {
          sharedInvalidSlots += 1;
        }
      }
    }

    // --- 3. Calculate Family Group Inventory (Avoid Double-Counting Master Cost) ---
    let familyTotalMembers = 0;
    let familyAvailableMembers = 0;
    let familySoldMembers = 0;
    let familyReservedMembers = 0;
    let familyInvalidMembers = 0;

    let familyTotalCost = 0;
    let familySoldCost = 0;
    let familyRemainingCost = 0;

    for (const fg of familyGroups) {
      const masterCost = fg.acquisitionCost || 0;
      familyTotalCost += masterCost;
      const membersCount = fg.members.length;
      familyTotalMembers += membersCount;

      const perMemberCost = fg.maxMembers > 0 ? Math.round(masterCost / fg.maxMembers) : 0;

      for (const member of fg.members) {
        if (member.status === SharedSlotStatus.AVAILABLE) {
          familyAvailableMembers += 1;
          familyRemainingCost += perMemberCost;
        } else if (member.status === SharedSlotStatus.ASSIGNED) {
          familySoldMembers += 1;
          familySoldCost += perMemberCost;
        } else if (member.status === SharedSlotStatus.RESERVED) {
          familyReservedMembers += 1;
          familyRemainingCost += perMemberCost;
        } else if (member.status === SharedSlotStatus.INVALID || member.status === SharedSlotStatus.EXPIRED) {
          familyInvalidMembers += 1;
        }
      }
    }

    // --- 4. Sum Aggregated Inventory Totals ---
    const totalInventory = dedicatedTotalCount + sharedTotalSlots + familyTotalMembers;
    const availableInventory = dedicatedAvailableCount + sharedAvailableSlots + familyAvailableMembers;
    const soldInventory = dedicatedSoldCount + sharedSoldSlots + familySoldMembers;
    const reservedInventory = dedicatedReservedCount + sharedReservedSlots + familyReservedMembers;
    const invalidInventory = dedicatedInvalidCount + sharedInvalidSlots + familyInvalidMembers;

    const totalInventoryCost = dedicatedTotalCost + sharedTotalCost + familyTotalCost;

    // --- 5. Calculate Exact Sales & COGS using Historical Snapshots ---
    let revenue = 0;
    let costOfInventorySold = 0;
    let unitsSold = 0;

    if (orderItems.length > 0) {
      for (const item of orderItems) {
        revenue += item.subtotal || (item.unitPrice * item.quantity);
        costOfInventorySold += item.costAmountSnapshot || 0;
        unitsSold += item.quantity || 1;
      }
    } else {
      // If orderItems wasn't directly stamped with supplierId yet, fallback to calculated sold cost
      costOfInventorySold = dedicatedSoldCost + sharedSoldCost + familySoldCost;
      unitsSold = soldInventory;
    }

    const remainingInventoryCost = Math.max(0, dedicatedRemainingCost + sharedRemainingCost + familyRemainingCost);
    const grossMargin = revenue - costOfInventorySold;
    const grossMarginPercentage = revenue > 0 ? Number(((grossMargin / revenue) * 100).toFixed(2)) : 0;

    // --- 6. Calculate Warranty Claims & Recoveries ---
    const totalClaims = claims.length;
    let openClaims = 0;
    let resolvedClaims = 0;
    let rejectedClaims = 0;
    let potentialRecoveryAmount = 0;

    for (const c of claims) {
      potentialRecoveryAmount += c.claimValueSnapshot || c.claimValue || 0;
      if (
        c.status === 'DRAFT' ||
        c.status === 'REVIEW_REQUIRED' ||
        c.status === 'READY_TO_CLAIM' ||
        c.status === 'SUBMITTED' ||
        c.status === 'WAITING_SUPPLIER'
      ) {
        openClaims += 1;
      } else if (
        c.status === 'APPROVED' ||
        c.status === 'REPLACEMENT_RECEIVED' ||
        c.status === 'REFUND_RECEIVED' ||
        c.status === 'CREDIT_RECEIVED' ||
        c.status === 'CLOSED'
      ) {
        resolvedClaims += 1;
      } else if (c.status === 'REJECTED' || c.status === 'CANCELLED') {
        rejectedClaims += 1;
      }
    }

    const recoveredAmount = recoveries.reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      totalInventory,
      availableInventory,
      soldInventory,
      reservedInventory,
      invalidInventory,
      totalInventoryCost,
      costOfInventorySold,
      remainingInventoryCost,
      revenue,
      grossMargin,
      grossMarginPercentage,
      unitsSold,
      totalClaims,
      openClaims,
      resolvedClaims,
      rejectedClaims,
      potentialRecoveryAmount,
      recoveredAmount,
    };
  }

  /**
   * Retrieves all suppliers with batch-aggregated metrics (ZERO N+1 queries)
   */
  static async getSuppliersList(): Promise<SupplierListItemWithMetrics[]> {
    const suppliers = await db.supplier.findMany({
      where: { status: { not: SupplierStatus.ARCHIVED } },
      orderBy: { createdAt: 'desc' },
    });

    if (suppliers.length === 0) {
      return [];
    }

    const supplierIds = suppliers.map((s) => s.id);

    // Parallel batch queries across all suppliers
    const [
      dedicatedItems,
      sharedAccounts,
      familyGroups,
      orderItems,
      claims,
    ] = await Promise.all([
      db.inventoryItem.findMany({
        where: { supplierId: { in: supplierIds } },
        select: {
          supplierId: true,
          status: true,
          costAmount: true,
        },
      }),
      db.sharedAccount.findMany({
        where: { supplierId: { in: supplierIds } },
        select: {
          supplierId: true,
          acquisitionCost: true,
          maxSlots: true,
          slots: { select: { status: true } },
        },
      }),
      db.familyGroup.findMany({
        where: { supplierId: { in: supplierIds } },
        select: {
          supplierId: true,
          acquisitionCost: true,
          maxMembers: true,
          members: { select: { status: true } },
        },
      }),
      db.orderItem.findMany({
        where: {
          supplierId: { in: supplierIds },
          order: { status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] } },
        },
        select: {
          supplierId: true,
          subtotal: true,
          unitPrice: true,
          quantity: true,
          costAmountSnapshot: true,
        },
      }),
      db.supplierWarrantyClaim.findMany({
        where: { supplierId: { in: supplierIds } },
        select: {
          supplierId: true,
          status: true,
        },
      }),
    ]);

    // Grouping maps
    const metricsMap = new Map<string, {
      totalInventory: number;
      availableInventory: number;
      soldInventory: number;
      invalidInventory: number;
      totalInventoryCost: number;
      soldInventoryCost: number;
      remainingInventoryCost: number;
      revenue: number;
      costOfInventorySold: number;
      openClaims: number;
    }>();

    for (const id of supplierIds) {
      metricsMap.set(id, {
        totalInventory: 0,
        availableInventory: 0,
        soldInventory: 0,
        invalidInventory: 0,
        totalInventoryCost: 0,
        soldInventoryCost: 0,
        remainingInventoryCost: 0,
        revenue: 0,
        costOfInventorySold: 0,
        openClaims: 0,
      });
    }

    // 1. Process Dedicated Items
    for (const item of dedicatedItems) {
      if (!item.supplierId) continue;
      const m = metricsMap.get(item.supplierId);
      if (!m) continue;

      const cost = item.costAmount || 0;
      m.totalInventory += 1;
      m.totalInventoryCost += cost;

      if (item.status === StockStatus.AVAILABLE) {
        m.availableInventory += 1;
        m.remainingInventoryCost += cost;
      } else if (item.status === StockStatus.SOLD || item.status === StockStatus.ASSIGNED) {
        m.soldInventory += 1;
        m.soldInventoryCost += cost;
      } else if (
        item.status === StockStatus.INVALID ||
        item.status === StockStatus.DISABLED
      ) {
        m.invalidInventory += 1;
      }
    }

    // 2. Process Shared Accounts
    for (const sa of sharedAccounts) {
      if (!sa.supplierId) continue;
      const m = metricsMap.get(sa.supplierId);
      if (!m) continue;

      const masterCost = sa.acquisitionCost || 0;
      m.totalInventoryCost += masterCost;
      m.totalInventory += sa.slots.length;
      const perSlotCost = sa.maxSlots > 0 ? Math.round(masterCost / sa.maxSlots) : 0;

      for (const slot of sa.slots) {
        if (slot.status === SharedSlotStatus.AVAILABLE) {
          m.availableInventory += 1;
          m.remainingInventoryCost += perSlotCost;
        } else if (slot.status === SharedSlotStatus.ASSIGNED) {
          m.soldInventory += 1;
          m.soldInventoryCost += perSlotCost;
        } else if (slot.status === SharedSlotStatus.INVALID || slot.status === SharedSlotStatus.EXPIRED) {
          m.invalidInventory += 1;
        }
      }
    }

    // 3. Process Family Groups
    for (const fg of familyGroups) {
      if (!fg.supplierId) continue;
      const m = metricsMap.get(fg.supplierId);
      if (!m) continue;

      const masterCost = fg.acquisitionCost || 0;
      m.totalInventoryCost += masterCost;
      m.totalInventory += fg.members.length;
      const perMemberCost = fg.maxMembers > 0 ? Math.round(masterCost / fg.maxMembers) : 0;

      for (const member of fg.members) {
        if (member.status === SharedSlotStatus.AVAILABLE) {
          m.availableInventory += 1;
          m.remainingInventoryCost += perMemberCost;
        } else if (member.status === SharedSlotStatus.ASSIGNED) {
          m.soldInventory += 1;
          m.soldInventoryCost += perMemberCost;
        } else if (member.status === SharedSlotStatus.INVALID || member.status === SharedSlotStatus.EXPIRED) {
          m.invalidInventory += 1;
        }
      }
    }

    // 4. Process Sales & Historical COGS
    for (const oi of orderItems) {
      if (!oi.supplierId) continue;
      const m = metricsMap.get(oi.supplierId);
      if (!m) continue;

      m.revenue += oi.subtotal || (oi.unitPrice * oi.quantity);
      m.costOfInventorySold += oi.costAmountSnapshot || 0;
    }

    // 5. Process Claims
    for (const c of claims) {
      if (!c.supplierId) continue;
      const m = metricsMap.get(c.supplierId);
      if (!m) continue;

      if (
        c.status === 'DRAFT' ||
        c.status === 'REVIEW_REQUIRED' ||
        c.status === 'READY_TO_CLAIM' ||
        c.status === 'SUBMITTED' ||
        c.status === 'WAITING_SUPPLIER'
      ) {
        m.openClaims += 1;
      }
    }

    // Build final list
    return suppliers.map((s) => {
      const m = metricsMap.get(s.id)!;
      const actualSoldCost = m.costOfInventorySold > 0 ? m.costOfInventorySold : m.soldInventoryCost;
      const grossMargin = m.revenue - actualSoldCost;
      const grossMarginPercentage = m.revenue > 0 ? Number(((grossMargin / m.revenue) * 100).toFixed(2)) : 0;

      return {
        id: s.id,
        name: s.name,
        code: s.code,
        status: s.status,
        contactName: s.contactName,
        email: s.email,
        phone: s.phone,
        whatsapp: s.whatsapp,
        telegram: s.telegram,
        website: s.website,
        notes: s.notes,
        defaultCurrency: s.defaultCurrency,
        createdAt: s.createdAt,
        metrics: {
          totalInventory: m.totalInventory,
          availableInventory: m.availableInventory,
          soldInventory: m.soldInventory,
          invalidInventory: m.invalidInventory,
          totalInventoryCost: m.totalInventoryCost,
          costOfInventorySold: actualSoldCost,
          remainingInventoryCost: Math.max(0, m.remainingInventoryCost),
          revenue: m.revenue,
          grossMargin,
          grossMarginPercentage,
          openClaims: m.openClaims,
        },
      };
    });
  }

  /**
   * Helper alias for supplier performance metrics
   */
  static async getSupplierPerformanceMetrics(supplierId: string) {
    const summary = await this.getSupplierSummaryMetrics(supplierId);
    return {
      ...summary,
      totalInventorySupplied: summary.totalInventory,
      derivedHealthStatus: summary.invalidInventory > 5 ? 'WARNING' : 'GOOD',
    };
  }

  /**
   * Retrieves unified paginated inventory list for a supplier across all delivery models
   */
  static async getSupplierInventory(
    supplierId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      productVariantId?: string;
      deliveryModel?: string;
      search?: string;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    // 1. Dedicated Inventory Where
    const dedicatedWhere: any = { supplierId };
    if (options.status && options.status !== 'ALL') {
      dedicatedWhere.status = options.status as StockStatus;
    }
    if (options.productVariantId && options.productVariantId !== 'ALL') {
      dedicatedWhere.variantId = options.productVariantId;
    }

    // 2. Shared Account Slots Where
    const sharedWhere: any = { sharedAccount: { supplierId } };
    if (options.status && options.status !== 'ALL') {
      sharedWhere.status = options.status as SharedSlotStatus;
    }
    if (options.productVariantId && options.productVariantId !== 'ALL') {
      sharedWhere.sharedAccount = { ...sharedWhere.sharedAccount, productVariantId: options.productVariantId };
    }

    // 3. Family Member Slots Where
    const familyWhere: any = { familyGroup: { supplierId } };
    if (options.status && options.status !== 'ALL') {
      familyWhere.status = options.status as SharedSlotStatus;
    }
    if (options.productVariantId && options.productVariantId !== 'ALL') {
      familyWhere.familyGroup = { ...familyWhere.familyGroup, productVariantId: options.productVariantId };
    }

    const [dedicatedItems, sharedSlots, familyMembers] = await Promise.all([
      db.inventoryItem.findMany({
        where: dedicatedWhere,
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, slug: true } },
            },
          },
          orderItem: {
            select: {
              id: true,
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  createdAt: true,
                  user: { select: { name: true, email: true } },
                  guestEmail: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.sharedAccountSlot.findMany({
        where: sharedWhere,
        include: {
          sharedAccount: {
            include: {
              variant: {
                include: {
                  product: { select: { id: true, name: true, slug: true } },
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              user: { select: { name: true, email: true } },
              guestEmail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.familyMemberSlot.findMany({
        where: familyWhere,
        include: {
          familyGroup: {
            include: {
              variant: {
                include: {
                  product: { select: { id: true, name: true, slug: true } },
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              user: { select: { name: true, email: true } },
              guestEmail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const allFormatted: any[] = [];

    // Dedicated Items
    for (const item of dedicatedItems) {
      const order = item.orderItem?.order;
      const rawEmail = order?.user?.email || order?.guestEmail || null;
      const maskedEmail = rawEmail ? rawEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`) : null;

      allFormatted.push({
        id: item.id,
        deliveryModel: 'DEDICATED',
        productName: item.variant?.product?.name || 'Produk',
        variantName: item.variant?.name || 'Varian',
        costAmount: item.costAmount,
        status: item.status,
        purchasedAt: item.purchasedAt || item.createdAt,
        expiresAt: item.expiresAt,
        supplierReference: item.supplierReference,
        assignedOrderNumber: order?.orderNumber || null,
        assignedOrderId: order?.id || null,
        assignedCustomer: maskedEmail,
        createdAt: item.createdAt,
      });
    }

    // Shared Account Slots
    for (const slot of sharedSlots) {
      const sa = slot.sharedAccount;
      const order = slot.order;
      const rawEmail = order?.user?.email || order?.guestEmail || null;
      const maskedEmail = rawEmail ? rawEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`) : null;
      const perSlotCost = sa.maxSlots > 0 ? Math.round(sa.acquisitionCost / sa.maxSlots) : 0;

      allFormatted.push({
        id: slot.id,
        deliveryModel: 'SHARED_SLOT',
        productName: sa.variant?.product?.name || 'Produk Shared',
        variantName: `${sa.variant?.name || 'Shared'} (${slot.slotLabel})`,
        costAmount: perSlotCost,
        status: slot.status,
        purchasedAt: sa.purchasedAt || slot.createdAt,
        expiresAt: slot.expiresAt || sa.masterExpiresAt,
        supplierReference: sa.supplierReference,
        assignedOrderNumber: order?.orderNumber || null,
        assignedOrderId: order?.id || null,
        assignedCustomer: maskedEmail,
        createdAt: slot.createdAt,
      });
    }

    // Family Member Slots
    for (const member of familyMembers) {
      const fg = member.familyGroup;
      const order = member.order;
      const rawEmail = order?.user?.email || order?.guestEmail || null;
      const maskedEmail = rawEmail ? rawEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`) : null;
      const perMemberCost = fg.maxMembers > 0 ? Math.round(fg.acquisitionCost / fg.maxMembers) : 0;

      allFormatted.push({
        id: member.id,
        deliveryModel: 'FAMILY_MEMBER',
        productName: fg.variant?.product?.name || 'Produk Family',
        variantName: `${fg.variant?.name || 'Family'} (Slot #${member.slotNumber})`,
        costAmount: perMemberCost,
        status: member.status,
        purchasedAt: fg.purchasedAt || member.createdAt,
        expiresAt: fg.masterExpiresAt,
        supplierReference: fg.supplierReference,
        assignedOrderNumber: order?.orderNumber || null,
        assignedOrderId: order?.id || null,
        assignedCustomer: maskedEmail,
        createdAt: member.createdAt,
      });
    }

    // Sort by createdAt descending
    allFormatted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply Search Filter if provided
    let filtered = allFormatted;
    if (options.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      filtered = allFormatted.filter((item) =>
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.variantName && item.variantName.toLowerCase().includes(q)) ||
        (item.supplierReference && item.supplierReference.toLowerCase().includes(q)) ||
        (item.assignedOrderNumber && item.assignedOrderNumber.toLowerCase().includes(q))
      );
    }

    const totalItems = filtered.length;
    const paginatedItems = filtered.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    };
  }

  /**
   * Retrieves paginated sales transactions fulfilled with this supplier's inventory
   */
  static async getSupplierSales(
    supplierId: string,
    options: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      productVariantId?: string;
      orderStatus?: string;
      search?: string;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { supplierId },
        { inventoryItem: { supplierId } },
        { sharedAccountSlots: { some: { sharedAccount: { supplierId } } } },
        { familyMemberSlots: { some: { familyGroup: { supplierId } } } },
        { fulfillments: { some: { inventoryItem: { supplierId } } } },
      ],
    };

    if (options.orderStatus && options.orderStatus !== 'ALL') {
      where.order = { status: options.orderStatus as OrderStatus };
    } else {
      where.order = { status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] } };
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = new Date(options.startDate);
      if (options.endDate) where.createdAt.lte = new Date(options.endDate);
    }

    if (options.productVariantId && options.productVariantId !== 'ALL') {
      where.variantId = options.productVariantId;
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      where.AND = [
        {
          OR: [
            { productName: { contains: q } },
            { variantName: { contains: q } },
            { order: { orderNumber: { contains: q } } },
          ],
        },
      ];
    }

    const [totalSales, salesItems] = await Promise.all([
      db.orderItem.count({ where }),
      db.orderItem.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              createdAt: true,
              user: { select: { name: true, email: true } },
              guestEmail: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              product: { select: { id: true, name: true } },
            },
          },
          inventoryItem: {
            select: {
              id: true,
              supplierReference: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedSales = salesItems.map((item) => {
      const sellingPrice = item.subtotal || (item.unitPrice * item.quantity);
      const supplierCost = item.costAmountSnapshot || 0;
      const grossMargin = sellingPrice - supplierCost;
      const grossMarginPercentage = sellingPrice > 0 ? Number(((grossMargin / sellingPrice) * 100).toFixed(2)) : 0;

      const rawEmail = item.order?.user?.email || item.order?.guestEmail || null;
      const maskedEmail = rawEmail ? rawEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`) : null;

      return {
        id: item.id,
        orderId: item.order?.id,
        orderNumber: item.order?.orderNumber,
        date: item.order?.createdAt || item.createdAt,
        productName: item.productName || item.variant?.product?.name || 'Produk',
        variantName: item.variantName || item.variant?.name || 'Varian',
        inventoryId: item.inventoryItem?.id || null,
        supplierReference: item.inventoryItem?.supplierReference || null,
        sellingPrice,
        supplierCost,
        grossMargin,
        grossMarginPercentage,
        status: item.order?.status,
        customer: maskedEmail,
      };
    });

    return {
      sales: formattedSales,
      pagination: {
        page,
        limit,
        totalSales,
        totalPages: Math.ceil(totalSales / limit) || 1,
      },
    };
  }

  /**
   * Retrieves warranty claims summary and list for a supplier
   */
  static async getSupplierWarrantyClaims(
    supplierId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { supplierId };
    if (options.status && options.status !== 'ALL') {
      where.status = options.status as SupplierWarrantyClaimStatus;
    }

    const [totalClaims, claims] = await Promise.all([
      db.supplierWarrantyClaim.count({ where }),
      db.supplierWarrantyClaim.findMany({
        where,
        include: {
          replacementLinks: true,
          responses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedClaims = claims.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      status: c.status,
      resolutionType: c.resolutionType,
      claimAmount: c.claimValueSnapshot || c.claimValue || 0,
      failureReason: c.failureReason,
      notes: c.failureDescription || c.internalNotes || null,
      supplierClaimReference: c.supplierClaimReference,
      createdAt: c.createdAt,
      submittedAt: c.submittedAt,
      resolvedAt: c.resolvedAt,
      lastResponse: c.responses[0]?.messageSummary || null,
      replacementRequestId: c.replacementLinks[0]?.replacementId || null,
    }));

    return {
      claims: formattedClaims,
      pagination: {
        page,
        limit,
        totalClaims,
        totalPages: Math.ceil(totalClaims / limit) || 1,
      },
    };
  }
}
