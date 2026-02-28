import { NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@/lib/http';
import { getStoreByKey } from '@/lib/store';
import { buildDailyReport, ensureStoreParam, getYesterdayYmdJst } from '@/lib/reports';

export async function GET(req: NextRequest) {
  try {
    const storeKey = ensureStoreParam(req.nextUrl.searchParams.get('store'));
    const date = req.nextUrl.searchParams.get('date') ?? getYesterdayYmdJst();

    const store = await getStoreByKey(storeKey);
    if (!store) return badRequest('store not found', 404);

    const report = await buildDailyReport(store.id, date);
    return NextResponse.json({
      store: { storeKey: store.storeKey, name: store.name },
      ...report
    });
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : 'failed to build daily report');
  }
}
