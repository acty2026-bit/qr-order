import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

const schema = z.object({
  store_key: z.string().min(1),
  table_no: z.number().int().positive(),
  party_size: z.number().int().min(1).max(30)
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const store = await getStoreByKey(parsed.data.store_key);
  if (!store) return badRequest('store not found', 404);

  const state = await prisma.tableState.upsert({
    where: {
      storeId_tableNo: {
        storeId: store.id,
        tableNo: parsed.data.table_no
      }
    },
    create: {
      storeId: store.id,
      tableNo: parsed.data.table_no,
      partySize: parsed.data.party_size
    },
    update: {
      partySize: parsed.data.party_size
    }
  });

  return NextResponse.json({ ok: true, table_no: state.tableNo, party_size: state.partySize });
}
