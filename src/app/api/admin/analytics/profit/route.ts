import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { requirePermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.REPORTS_FINANCIAL);

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    const supplierId = searchParams.get('supplierId') || undefined;
    const isCsvExport = searchParams.get('export') === 'csv';

    let startDate = new Date();
    if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'this_month') {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    const whereClause: any = {
      createdAt: { gte: startDate },
    };

    if (supplierId && supplierId !== 'ALL') {
      whereClause.order = {
        items: {
          some: { supplierId },
        },
      };
    }

    // Auto-generate missing OrderFinancialSnapshots for all PAID/COMPLETED orders in range
    const unSnapshottedOrders = await db.order.findMany({
      where: {
        status: { in: ['PAID', 'COMPLETED'] },
        createdAt: { gte: startDate },
        financialSnapshot: null,
      },
      select: { id: true },
    });

    if (unSnapshottedOrders.length > 0) {
      const { CostEngineService } = await import('@/services/costEngine.service');
      for (const unSnap of unSnapshottedOrders) {
        try {
          await CostEngineService.generateOrderFinancialSnapshot(db, unSnap.id);
        } catch (e: any) {
          console.error(`Failed to generate financial snapshot for order ${unSnap.id}:`, e.message);
        }
      }
    }

    const [snapshots, suppliers] = await Promise.all([
      db.orderFinancialSnapshot.findMany({
        where: whereClause,
        include: {
          order: {
            select: {
              orderNumber: true,
              createdAt: true,
              items: {
                select: {
                  id: true,
                  productName: true,
                  variantName: true,
                  supplierId: true,
                  subtotal: true,
                  costAmountSnapshot: true,
                  supplier: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.supplier.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // If filtered by a specific supplier, calculate item-level metrics for that supplier
    let totalSubtotal = 0;
    let totalDiscounts = 0;
    let totalCoinDiscount = 0;
    let totalGrossRevenue = 0;
    let totalCashCollected = 0;
    let totalCOGS = 0;
    let totalPaymentFee = 0;
    let totalReplacementCost = 0;
    let totalGrossProfit = 0;

    if (supplierId && supplierId !== 'ALL') {
      for (const s of snapshots) {
        const supplierItems = (s.order?.items || []).filter((i: any) => i.supplierId === supplierId);
        const supplierItemSubtotal = supplierItems.reduce((acc: number, i: any) => acc + (i.subtotal || 0), 0);
        const supplierItemCOGS = supplierItems.reduce((acc: number, i: any) => acc + (i.costAmountSnapshot || 0), 0);

        totalSubtotal += supplierItemSubtotal;
        totalGrossRevenue += supplierItemSubtotal;
        totalCOGS += supplierItemCOGS;
        totalCashCollected += supplierItemSubtotal;
      }
      totalGrossProfit = totalGrossRevenue - totalCOGS;
    } else {
      totalSubtotal = snapshots.reduce((acc, s) => acc + s.subtotal, 0);
      totalDiscounts = snapshots.reduce((acc, s) => acc + s.productDiscount + s.couponDiscount, 0);
      totalCoinDiscount = snapshots.reduce((acc, s) => acc + s.coinDiscount, 0);
      totalGrossRevenue = snapshots.reduce((acc, s) => acc + s.grossRevenue, 0);
      totalCashCollected = snapshots.reduce((acc, s) => acc + s.cashPayableAmount, 0);
      totalCOGS = snapshots.reduce((acc, s) => acc + s.recognizedCOGS, 0);
      totalPaymentFee = snapshots.reduce((acc, s) => acc + s.paymentFee, 0);
      totalReplacementCost = snapshots.reduce((acc, s) => acc + s.replacementCost, 0);
      totalGrossProfit = snapshots.reduce((acc, s) => acc + s.grossProfit, 0);
    }

    const overallMargin = totalGrossRevenue > 0 ? Number(((totalGrossProfit / totalGrossRevenue) * 100).toFixed(2)) : 0;
    const unknownCostCount = snapshots.filter((s) => s.isCostUnknown).length;
    const totalSnapshots = snapshots.length;
    const costCoveragePercentage =
      totalSnapshots > 0 ? Number((((totalSnapshots - unknownCostCount) / totalSnapshots) * 100).toFixed(1)) : 100;

    // Handle CSV export request
    if (isCsvExport) {
      let csvContent = 'Date,Order Number,Subtotal,Discount,Coin Discount,Cash Collected,COGS,Payment Fee,Replacement Cost,Gross Profit,Margin %\n';

      for (const s of snapshots) {
        const dateStr = new Date(s.createdAt).toISOString().split('T')[0];
        csvContent += `"${dateStr}","${s.order?.orderNumber || 'N/A'}",${s.subtotal},${s.productDiscount + s.couponDiscount},${s.coinDiscount},${s.cashPayableAmount},${s.recognizedCOGS},${s.paymentFee},${s.replacementCost},${s.grossProfit},${s.grossMargin}%\n`;
      }

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="gogomi_profit_report_${period}${supplierId ? `_${supplierId}` : ''}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      suppliers,
      metrics: {
        totalSubtotal,
        totalDiscounts,
        totalCoinDiscount,
        totalGrossRevenue,
        totalCashCollected,
        totalCOGS,
        totalPaymentFee,
        totalReplacementCost,
        totalGrossProfit,
        overallMargin,
        costCoveragePercentage,
        isCostIncomplete: unknownCostCount > 0,
      },
      snapshotsCount: totalSnapshots,
      snapshots: snapshots.slice(0, 50),
    });
  } catch (error: any) {
    console.error('[Admin Analytics Profit Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
