import { NextRequest, NextResponse } from 'next/server';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

export async function GET(req: NextRequest) {
  const storeKey = req.nextUrl.searchParams.get('store');
  if (!storeKey) return badRequest('store is required');

  const sinceRaw = req.nextUrl.searchParams.get('since');
  const since = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  const store = await getStoreByKey(storeKey);
  if (!store) return badRequest('store not found', 404);

  const [orders, activeCalls, newOrders, newCalls, tableStates] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    }),
    prisma.call.findMany({
      where: { storeId: store.id, acknowledgedAt: null },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.order.findMany({
      where: { storeId: store.id, createdAt: { gt: since } },
      select: { id: true, tableNo: true, createdAt: true }
    }),
    prisma.call.findMany({
      where: { storeId: store.id, createdAt: { gt: since }, acknowledgedAt: null },
      select: { id: true, tableNo: true, createdAt: true }
    }),
    prisma.tableState.findMany({
      where: { storeId: store.id },
      select: { tableNo: true, lastCheckoutAt: true, partySize: true }
    })
  ]);

  const checkoutMap = new Map<number, Date>();
  const partySizeMap = new Map<number, number | null>();
  for (const s of tableStates) {
    if (s.lastCheckoutAt) checkoutMap.set(s.tableNo, s.lastCheckoutAt);
    partySizeMap.set(s.tableNo, s.partySize);
  }
  const isInCurrentSession = (tableNo: number, createdAt: Date) => {
    const cutoff = checkoutMap.get(tableNo);
    return !cutoff || createdAt >= cutoff;
  };

  const scopedOrders = orders.filter((order) => isInCurrentSession(order.tableNo, order.createdAt));
  const scopedCalls = activeCalls.filter((call) => isInCurrentSession(call.tableNo, call.createdAt));
  const scopedNewOrders = newOrders.filter((order) => isInCurrentSession(order.tableNo, order.createdAt));
  const scopedNewCalls = newCalls.filter((call) => isInCurrentSession(call.tableNo, call.createdAt));

  const byTable = new Map<number, {
    tableNo: number;
    partySize: number | null;
    latestOrderAt: string;
    orderIds: string[];
    hasPendingPrint: boolean;
    failedOrderIds: string[];
    items: Record<string, number>;
  }>();

  for (const order of scopedOrders) {
    if (!byTable.has(order.tableNo)) {
      byTable.set(order.tableNo, {
        tableNo: order.tableNo,
        partySize: partySizeMap.get(order.tableNo) ?? null,
        latestOrderAt: order.createdAt.toISOString(),
        orderIds: [],
        hasPendingPrint: false,
        failedOrderIds: [],
        items: {}
      });
    }
    const row = byTable.get(order.tableNo)!;
    row.orderIds.push(order.id);
    row.hasPendingPrint = row.hasPendingPrint || order.printStatus === 'pending';
    if (order.printStatus === 'failed') {
      row.failedOrderIds.push(order.id);
    }
    if (order.createdAt > new Date(row.latestOrderAt)) {
      row.latestOrderAt = order.createdAt.toISOString();
    }
    for (const item of order.orderItems) {
      row.items[item.nameSnapshot] = (row.items[item.nameSnapshot] ?? 0) + item.qty;
    }
  }

  return NextResponse.json({
    store: { id: store.id, name: store.name, storeKey: store.storeKey },
    tableCards: Array.from(byTable.values()).sort((a, b) => a.tableNo - b.tableNo),
    activeCalls: scopedCalls,
    hasNewOrder: scopedNewOrders.length > 0,
    hasNewCall: scopedNewCalls.length > 0,
    pendingOrders: scopedOrders
      .filter((o) => o.printStatus === 'pending')
      .map((o) => ({
        id: o.id,
        tableNo: o.tableNo,
        createdAt: o.createdAt,
        items: o.orderItems.map((item) => ({ name: item.nameSnapshot, qty: item.qty }))
      }))
  });
}
