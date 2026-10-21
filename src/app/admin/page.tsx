import React from 'react';
import { db } from '@/lib/db/prisma';
import { AdminDashboardOverviewClient, OverviewData } from './AdminDashboardOverviewClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardOverviewPage() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);
  const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let overviewData: OverviewData = {
    metrics: {
      revenueAllTime: 0,
      revenueToday: 0,
      revenueMonth: 0,
      totalPaidOrdersCount: 0,
      pendingOrdersCount: 0,
      ordersTodayCount: 0,
      averageOrderValue: 0,
      totalCustomersCount: 0,
      newCustomersThisMonth: 0,
      activeSubsCount: 0,
      expiringSoonSubsCount: 0,
      pendingReplacementsCount: 0,
      openTicketsCount: 0,
    },
    chartData: [],
    recentOrders: [],
    stockAlerts: [],
    expiringSubscriptions: [],
    topProducts: [],
  };

  try {
    const [
      revenueAllTimeRes,
      revenueTodayRes,
      revenueMonthRes,
      totalPaidOrdersCount,
      pendingOrdersCount,
      ordersTodayCount,
      totalCustomersCount,
      newCustomersThisMonth,
      activeSubsCount,
      expiringSoonSubsCount,
      pendingReplacementsCount,
      openTicketsCount,
      recentOrdersRes,
      expiringSubsRes,
      topProductsRes,
      allVariantsRes,
      past7DaysOrdersRes,
    ] = await Promise.all([
      db.order.aggregate({
        _sum: { grandTotal: true },
        where: { status: { in: ['PAID', 'COMPLETED'] } },
      }),
      db.order.aggregate({
        _sum: { grandTotal: true },
        where: {
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: startOfDay },
        },
      }),
      db.order.aggregate({
        _sum: { grandTotal: true },
        where: {
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: startOfMonth },
        },
      }),
      db.order.count({ where: { status: { in: ['PAID', 'COMPLETED'] } } }),
      db.order.count({ where: { status: 'PENDING_PAYMENT' } }),
      db.order.count({ where: { createdAt: { gte: startOfDay } } }),
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: startOfMonth } } }),
      db.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
      db.subscription.count({ where: { status: 'ACTIVE', expiresAt: { lte: threeDaysAhead, gt: now } } }),
      db.replacementRequest.count({ where: { status: 'PENDING' } }),
      db.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      db.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          items: { select: { productName: true, variantName: true, quantity: true } },
          payments: { select: { provider: true, status: true, amount: true } },
        },
      }),
      db.subscription.findMany({
        where: { status: 'ACTIVE', expiresAt: { lte: sevenDaysAhead, gt: now } },
        take: 6,
        orderBy: { expiresAt: 'asc' },
        include: {
          user: { select: { name: true, email: true } },
          variant: { select: { name: true, product: { select: { name: true, thumbnail: true } } } },
        },
      }),
      db.product.findMany({
        where: { status: 'ACTIVE' },
        take: 6,
        orderBy: { soldCount: 'desc' },
        include: {
          category: { select: { name: true } },
          variants: { select: { price: true }, orderBy: { price: 'asc' }, take: 1 },
        },
      }),
      db.productVariant.findMany({
        where: { active: true },
        include: {
          product: { select: { name: true, slug: true } },
          inventoryItems: { where: { status: 'AVAILABLE' } },
          sharedAccounts: {
            where: {
              status: { in: ['AVAILABLE', 'FULL'] },
              OR: [{ masterExpiresAt: null }, { masterExpiresAt: { gt: now } }],
            },
            include: {
              slots: { where: { status: 'AVAILABLE' } },
            },
          },
          familyGroups: {
            where: { status: { in: ['AVAILABLE', 'PARTIALLY_USED', 'FULL'] } },
            include: {
              members: { where: { status: 'AVAILABLE' } },
            },
          },
        },
      }),
      db.order.findMany({
        where: {
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          grandTotal: true,
          createdAt: true,
        },
      }),
    ]);

    const revenueAllTime = revenueAllTimeRes._sum.grandTotal || 0;
    const revenueToday = revenueTodayRes._sum.grandTotal || 0;
    const revenueMonth = revenueMonthRes._sum.grandTotal || 0;
    const averageOrderValue = totalPaidOrdersCount > 0 ? Math.round(revenueAllTime / totalPaidOrdersCount) : 0;

    // Build 7-day chart data
    const chartMap = new Map<string, { date: string; label: string; revenue: number; orders: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfDay.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const fullDate = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      chartMap.set(key, { date: fullDate, label, revenue: 0, orders: 0 });
    }

    for (const ord of past7DaysOrdersRes) {
      const d = new Date(ord.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const bucket = chartMap.get(key);
      if (bucket) {
        bucket.revenue += ord.grandTotal || 0;
        bucket.orders += 1;
      }
    }

    const chartData = Array.from(chartMap.values());

    // Calculate synchronized real-time stock levels across all delivery models
    const stockAlerts = allVariantsRes
      .map((v) => {
        let stock = 0;
        if (v.deliveryModel === 'SHARED_ACCOUNT') {
          stock = v.sharedAccounts.reduce((acc, a) => acc + a.slots.length, 0);
        } else if (v.deliveryModel === 'FAMILY_MEMBER') {
          stock = v.familyGroups.reduce((acc, g) => acc + g.members.length, 0);
        } else {
          stock = v.inventoryItems.length;
        }

        return {
          id: v.id,
          name: v.name,
          productName: v.product.name,
          productSlug: v.product.slug,
          deliveryModel: v.deliveryModel || 'DEDICATED',
          price: v.price,
          stock,
          isOutOfStock: stock === 0,
        };
      })
      .filter((s) => s.stock < 3)
      .sort((a, b) => a.stock - b.stock);

    // Format recent orders
    const recentOrders = recentOrdersRes.map((ord) => {
      const itemsSummary = (ord.items || [])
        .map((i) => `${i.productName} - ${i.variantName}`)
        .join(', ') || 'Item';
      const provider = ord.payments?.[0]?.provider || 'AutoGoPay';

      return {
        id: ord.id,
        orderNumber: ord.orderNumber,
        customerName: ord.user?.name || ord.guestName || 'Guest User',
        customerEmail: ord.user?.email || ord.guestEmail || '-',
        grandTotal: ord.grandTotal || 0,
        status: ord.status,
        paymentStatus: ord.paymentStatus,
        provider,
        itemsSummary,
        itemCount: ord.items?.length || 1,
        createdAt: ord.createdAt.toISOString(),
      };
    });

    // Format expiring subscriptions
    const expiringSubscriptions = expiringSubsRes.map((sub) => {
      const expDate = new Date(sub.expiresAt);
      const diffMs = expDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        id: sub.id,
        customerName: sub.user?.name || 'Pelanggan',
        customerEmail: sub.user?.email || '-',
        productName: sub.variant?.product?.name || 'Produk',
        variantName: sub.variant?.name || 'Paket',
        expiresAt: sub.expiresAt.toISOString(),
        daysRemaining,
      };
    });

    // Format top products
    const topProducts = topProductsRes.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      categoryName: p.category?.name || 'Umum',
      soldCount: p.soldCount || 0,
      viewCount: p.viewCount || 0,
      minPrice: p.variants?.[0]?.price || 0,
      thumbnail: p.thumbnail,
    }));

    const { InventoryReconciliationService } = await import('@/services/reconciliation.service');
    const lifecycleAlerts = await InventoryReconciliationService.getInventoryLifecycleAlerts();

    overviewData = {
      metrics: {
        revenueAllTime,
        revenueToday,
        revenueMonth,
        totalPaidOrdersCount,
        pendingOrdersCount,
        ordersTodayCount,
        averageOrderValue,
        totalCustomersCount,
        newCustomersThisMonth,
        activeSubsCount,
        expiringSoonSubsCount,
        pendingReplacementsCount,
        openTicketsCount,
      },
      chartData,
      recentOrders,
      stockAlerts,
      expiringSubscriptions,
      topProducts,
      lifecycleAlerts,
    };
  } catch (err) {
    console.error('Error fetching admin dashboard overview data:', err);
  }

  return <AdminDashboardOverviewClient initialData={overviewData} />;
}
