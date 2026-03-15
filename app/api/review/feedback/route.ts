import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest } from '@/lib/http';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  store_key: z.string().min(1),
  table_no: z.number().int().positive().optional(),
  order_id: z.string().min(1).optional(),
  session_id: z.string().min(1).optional(),
  satisfaction: z.enum(['very_satisfied', 'satisfied', 'neutral', 'dissatisfied']),
  comment: z.string().trim().min(1).max(2000)
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return badRequest('入力値が不正です');

    const store = await getStoreByKey(parsed.data.store_key);
    if (!store) return badRequest('store not found', 404);

    const feedback = await prisma.customerFeedback.create({
      data: {
        storeId: store.id,
        tableNo: parsed.data.table_no,
        orderId: parsed.data.order_id,
        sessionId: parsed.data.session_id,
        satisfaction: parsed.data.satisfaction,
        comment: parsed.data.comment
      }
    });

    return NextResponse.json({ ok: true, id: feedback.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'フィードバック送信に失敗しました';
    return badRequest(message, 500);
  }
}
