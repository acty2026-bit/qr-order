import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

const schema = z.object({ call_id: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const updated = await prisma.call.update({
    where: { id: parsed.data.call_id },
    data: { acknowledgedAt: new Date() }
  });

  return NextResponse.json({ ok: true, id: updated.id });
}
