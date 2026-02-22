import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getStoreByKey } from '@/lib/store';
import { badRequest } from '@/lib/http';

const schema = z.object({
  store_key: z.string().min(1),
  table_no: z.number().int().positive(),
  items: z.array(z.object({ menu_id: z.string().min(1), qty: z.number().int().min(1) })).min(1)
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { store_key, table_no, items } = parsed.data;
  const store = await getStoreByKey(store_key);
  if (!store) return badRequest('store not found', 404);

  const menuIds = items.map((item) => item.menu_id);
  const menus = await prisma.menu.findMany({
    where: { id: { in: menuIds }, storeId: store.id, deletedAt: null }
  });
  if (menus.length !== menuIds.length) {
    return badRequest('some menu items are invalid', 422);
  }

  const menuMap = new Map(menus.map((m) => [m.id, m]));
  const soldOut = items.find((item) => menuMap.get(item.menu_id)?.isSoldOut);
  if (soldOut) return badRequest('sold out item exists', 409);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        storeId: store.id,
        tableNo: table_no,
        printStatus: 'pending'
      }
    });

    await tx.orderItem.createMany({
      data: items.map((item) => {
        const menu = menuMap.get(item.menu_id)!;
        return {
          orderId: created.id,
          menuId: menu.id,
          nameSnapshot: menu.name,
          priceSnapshot: menu.price,
          qty: item.qty
        };
      })
    });

    return created;
  });

  return NextResponse.json({ ok: true, order_id: order.id });
}
