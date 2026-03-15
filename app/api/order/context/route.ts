import { NextRequest, NextResponse } from 'next/server';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

type ContextResponse = {
  store: { id: string; name: string; storeKey: string; taxRate: number };
  menus: Awaited<ReturnType<typeof prisma.menu.findMany>>;
};

type CacheEntry = {
  expiresAt: number;
  payload: ContextResponse;
};

const CACHE_TTL_MS = 30 * 1000;
const cacheStore = globalThis as typeof globalThis & {
  __orderContextCache?: Map<string, CacheEntry>;
};
const orderContextCache = cacheStore.__orderContextCache ?? new Map<string, CacheEntry>();
cacheStore.__orderContextCache = orderContextCache;

export async function GET(req: NextRequest) {
  try {
    const storeKey = req.nextUrl.searchParams.get('store');
    if (!storeKey) return badRequest('store is required');

    const now = Date.now();
    const cached = orderContextCache.get(storeKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.payload, {
        headers: {
          'cache-control': 'private, max-age=15, stale-while-revalidate=30'
        }
      });
    }

    const store = await getStoreByKey(storeKey);
    if (!store) return badRequest('store not found', 404);

    const rawMenus = await prisma.menu.findMany({
      where: { storeId: store.id, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });

    const payload: ContextResponse = {
      store: { id: store.id, name: store.name, storeKey: store.storeKey, taxRate: store.taxRate },
      menus: rawMenus
    };

    orderContextCache.set(storeKey, {
      payload,
      expiresAt: now + CACHE_TTL_MS
    });

    return NextResponse.json(payload, {
      headers: {
        'cache-control': 'private, max-age=15, stale-while-revalidate=30'
      }
    });
  } catch {
    return badRequest('DB接続エラーです。DATABASE_URLとmigrateを確認してください', 500);
  }
}
