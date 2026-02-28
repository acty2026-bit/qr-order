import { NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@/lib/http';
import { getStoreByKey } from '@/lib/store';
import { buildRangeReport, ensureStoreParam, getYesterdayYmdJst } from '@/lib/reports';

export async function GET(req: NextRequest) {
  try {
    const storeKey = ensureStoreParam(req.nextUrl.searchParams.get('store'));
    const end = req.nextUrl.searchParams.get('end') ?? getYesterdayYmdJst();

    const start = req.nextUrl.searchParams.get('start') ?? (() => {
      const [y, m, d] = end.split('-').map(Number);
      const base = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
      base.setUTCDate(base.getUTCDate() - 6);
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(base);
    })();

    const store = await getStoreByKey(storeKey);
    if (!store) return badRequest('store not found', 404);

    const report = await buildRangeReport(store.id, start, end);
    return NextResponse.json({
      store: { storeKey: store.storeKey, name: store.name },
      ...report
    });
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : 'failed to build range report');
  }
}
