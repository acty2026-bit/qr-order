import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStoreByKey } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/http';

const createSchema = z.object({
  store_key: z.string().min(1),
  name: z.string().min(1),
  name_kana: z.string().optional().default(''),
  category: z.enum(['quick', 'food', 'recommendation', 'drink', 'dessert', 'other']),
  food_sub_category: z.enum(['seafood', 'salad', 'grill', 'fried', 'small_dish', 'rice']).optional().nullable(),
  drink_sub_category: z
    .enum([
      'beer',
      'highball',
      'sour',
      'cocktail',
      'shochu',
      'sake',
      'wine',
      'fruit_liquor',
      'non_alcohol',
      'soft_drink'
    ])
    .optional()
    .nullable(),
  price: z.number().int().min(0),
  is_all_you_can: z.boolean().optional().default(false),
  is_recommended: z.boolean().optional().default(false),
  is_sold_out: z.boolean().optional().default(false),
  sort_order: z.number().int().optional().default(0)
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  name_kana: z.string().optional().default(''),
  category: z.enum(['quick', 'food', 'recommendation', 'drink', 'dessert', 'other']),
  food_sub_category: z.enum(['seafood', 'salad', 'grill', 'fried', 'small_dish', 'rice']).optional().nullable(),
  drink_sub_category: z
    .enum([
      'beer',
      'highball',
      'sour',
      'cocktail',
      'shochu',
      'sake',
      'wine',
      'fruit_liquor',
      'non_alcohol',
      'soft_drink'
    ])
    .optional()
    .nullable(),
  price: z.number().int().min(0),
  is_all_you_can: z.boolean(),
  is_recommended: z.boolean(),
  is_sold_out: z.boolean(),
  sort_order: z.number().int()
});

const deleteSchema = z.object({ id: z.string().min(1) });

export async function GET(req: NextRequest) {
  const storeKey = req.nextUrl.searchParams.get('store');
  if (!storeKey) return badRequest('store is required');

  const store = await getStoreByKey(storeKey);
  if (!store) return badRequest('store not found', 404);

  const rawMenus = await prisma.menu.findMany({
    where: { storeId: store.id, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  });
  return NextResponse.json({ store, menus: rawMenus });
}

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const store = await getStoreByKey(parsed.data.store_key);
  if (!store) return badRequest('store not found', 404);

  const menu = await prisma.menu.create({
    data: {
      storeId: store.id,
      name: parsed.data.name,
      nameKana: parsed.data.name_kana,
      category: parsed.data.category,
      foodSubCategory: parsed.data.category === 'food' ? parsed.data.food_sub_category ?? 'small_dish' : null,
      drinkSubCategory: parsed.data.category === 'drink' ? parsed.data.drink_sub_category ?? 'soft_drink' : null,
      price: parsed.data.price,
      isAllYouCan: parsed.data.is_all_you_can,
      isRecommended: parsed.data.is_recommended,
      isSoldOut: parsed.data.is_sold_out,
      sortOrder: parsed.data.sort_order
    }
  });

  return NextResponse.json({ ok: true, menu });
}

export async function PUT(req: NextRequest) {
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const menu = await prisma.menu.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      nameKana: parsed.data.name_kana,
      category: parsed.data.category,
      foodSubCategory: parsed.data.category === 'food' ? parsed.data.food_sub_category ?? 'small_dish' : null,
      drinkSubCategory: parsed.data.category === 'drink' ? parsed.data.drink_sub_category ?? 'soft_drink' : null,
      price: parsed.data.price,
      isAllYouCan: parsed.data.is_all_you_can,
      isRecommended: parsed.data.is_recommended,
      isSoldOut: parsed.data.is_sold_out,
      sortOrder: parsed.data.sort_order
    }
  });

  return NextResponse.json({ ok: true, menu });
}

export async function DELETE(req: NextRequest) {
  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  await prisma.menu.update({
    where: { id: parsed.data.id },
    data: { deletedAt: new Date() }
  });
  return NextResponse.json({ ok: true });
}
