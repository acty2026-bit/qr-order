import { NextRequest, NextResponse } from 'next/server';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

export async function GET(req: NextRequest) {
  const storeKey = req.nextUrl.searchParams.get('store');
  if (!storeKey) return badRequest('store is required');

  const store = await getStoreByKey(storeKey);
  if (!store) return badRequest('store not found', 404);

  const [orders, calls] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
      take: 200
    }),
    prisma.call.findMany({
      where: { storeId: store.id, acknowledgedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  ]);

  return NextResponse.json({
    store: { name: store.name, storeKey: store.storeKey },
    orders,
    activeCalls: calls,
    recentForReprint: orders.slice(0, 10)
  });
}
