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

  const orders = await prisma.order.findMany({
    where: { storeId: store.id, tableNo: parsed.data.table },
    include: { orderItems: { select: { menuId: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  const menuIds = Array.from(
    new Set(
      orders.flatMap((order) => order.orderItems.map((item) => item.menuId))
    )
  );

  return NextResponse.json({ menuIds });
}
