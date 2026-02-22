import { NextRequest, NextResponse } from 'next/server';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

export async function GET(req: NextRequest) {
  try {
    const storeKey = req.nextUrl.searchParams.get('store');
    if (!storeKey) return badRequest('store is required');

    const store = await getStoreByKey(storeKey);
    if (!store) return badRequest('store not found', 404);

    const rawMenus = await prisma.menu.findMany({
      where: { storeId: store.id, deletedAt: null },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }]
    });
    const collator = new Intl.Collator('ja');
    const menus = [...rawMenus].sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      const aKey = a.nameKana || a.name;
      const bKey = b.nameKana || b.name;
      return collator.compare(aKey, bKey);
    });

    return NextResponse.json({
      store: { id: store.id, name: store.name, storeKey: store.storeKey, taxRate: store.taxRate },
      menus
    });
  } catch {
    return badRequest('DB接続エラーです。DATABASE_URLとmigrateを確認してください', 500);
  }
}
