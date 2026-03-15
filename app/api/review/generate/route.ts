import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest } from '@/lib/http';
import { generateGoogleReview } from '@/lib/services/googleReviewGenerator';

export const runtime = 'nodejs';

const schema = z.object({
  dishNames: z.array(z.string().min(1)).max(10).optional()
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return badRequest('入力値が不正です');

    const result = await generateGoogleReview({
      dishNames: parsed.data.dishNames
    });

    return NextResponse.json({
      ok: true,
      review: result.review,
      usedFallback: result.usedFallback
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '口コミ生成に失敗しました';
    return badRequest(message, 500);
  }
}
