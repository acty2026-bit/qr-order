import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

const updateSchema = z.object({
  store_key: z.string().min(1),
  tax_rate: z.number().int().min(0).max(99)
});

export async function GET(req: NextRequest) {
  const storeKey = req.nextUrl.searchParams.get('store');
  if (!storeKey) return badRequest('store is required');

  const store = await getStoreByKey(storeKey);
  if (!store) return badRequest('store not found', 404);

  return NextResponse.json({
    store: {
      id: store.id,
      storeKey: store.storeKey,
      name: store.name,
      taxRate: store.taxRate
    }
  });
}

export async function PUT(req: NextRequest) {
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const store = await getStoreByKey(parsed.data.store_key);
  if (!store) return badRequest('store not found', 404);

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: { taxRate: parsed.data.tax_rate }
  });

  return NextResponse.json({
    ok: true,
    store: {
      id: updated.id,
      storeKey: updated.storeKey,
      name: updated.name,
      taxRate: updated.taxRate
    }
  });
}
