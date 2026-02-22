import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

const schema = z.object({
  store_key: z.string().min(1),
  table_no: z.number().int().positive()
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const store = await getStoreByKey(parsed.data.store_key);
  if (!store) return badRequest('store not found', 404);

  const call = await prisma.call.create({
    data: {
      storeId: store.id,
      tableNo: parsed.data.table_no
    }
  });

  return NextResponse.json({ ok: true, call_id: call.id });
}
