import { NextRequest, NextResponse } from 'next/server';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';
import { getJstDayRange } from '@/lib/time';

type RankingRow = {
  menuId: string;
  menuName: string;
  qty: number;
};

export async function GET(req: NextRequest) {
  const storeKey = req.nextUrl.searchParams.get('store');
  if (!storeKey) return badRequest('store is required');

  const store = await getStoreByKey(storeKey);
  if (!store) return badRequest('store not found', 404);

  const { utcStart, utcEnd } = getJstDayRange();

  const rows = await prisma.orderItem.groupBy({
    by: ['menuId'],
    _sum: { qty: true },
    where: {
      order: {
        storeId: store.id,
        createdAt: {
          gte: utcStart,
          lt: utcEnd
        }
      }
    },
    orderBy: {
      _sum: { qty: 'desc' }
    }
  });

  const menuIds = rows.map((r) => r.menuId);
  const menus = await prisma.menu.findMany({ where: { id: { in: menuIds }, deletedAt: null } });
  const menuMap = new Map(menus.map((m) => [m.id, m]));

  const ranking: Record<'food' | 'drink' | 'other', RankingRow[]> = {
    food: [],
    drink: [],
    other: []
  };
  for (const row of rows) {
    const menu = menuMap.get(row.menuId);
    if (!menu) continue;
    if (menu.category !== 'food' && menu.category !== 'drink' && menu.category !== 'other') continue;
    ranking[menu.category].push({
      menuId: menu.id,
      menuName: menu.name,
      qty: row._sum.qty ?? 0
    });
  }

  return NextResponse.json({
    store: { storeKey: store.storeKey, name: store.name },
    date: new Date().toISOString(),
    ranking: {
      food: ranking.food.slice(0, 10),
      drink: ranking.drink.slice(0, 10),
      other: ranking.other.slice(0, 10)
    }
  });
}
