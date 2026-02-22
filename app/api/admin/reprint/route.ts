import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

const schema = z.object({ order_id: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const order = await prisma.order.update({
    where: { id: parsed.data.order_id },
    data: {
      printStatus: 'pending',
      printErrorMessage: null
    }
  });

  return NextResponse.json({ ok: true, order_id: order.id });
}
