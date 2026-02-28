import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

const querySchema = z.object({
  store: z.string().min(1),
  table: z.coerce.number().int().positive()
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    store: req.nextUrl.searchParams.get('store'),
    table: req.nextUrl.searchParams.get('table')
  });
  if (!parsed.success) return badRequest('store and table are required');

  const store = await getStoreByKey(parsed.data.store);
  if (!store) return badRequest('store not found', 404);

  const state = await prisma.tableState.findUnique({
    where: {
      storeId_tableNo: {
        storeId: store.id,
        tableNo: parsed.data.table
      }
    }
  });

  const where = {
    storeId: store.id,
    tableNo: parsed.data.table,
    ...(state?.lastCheckoutAt ? { createdAt: { gte: state.lastCheckoutAt } } : {})
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      orderItems: {
        select: {
          id: true,
          nameSnapshot: true,
          qty: true,
          priceSnapshot: true
        },
        orderBy: { id: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      items: order.orderItems,
      total: order.orderItems.reduce((sum, item) => sum + item.priceSnapshot * item.qty, 0)
    })),
    lastCheckoutAt: state?.lastCheckoutAt ?? null
  });
}
