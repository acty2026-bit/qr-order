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
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });

    return NextResponse.json({
      store: { id: store.id, name: store.name, storeKey: store.storeKey, taxRate: store.taxRate },
      menus: rawMenus
    });
  } catch {
    return badRequest('DB接続エラーです。DATABASE_URLとmigrateを確認してください', 500);
  }
}
