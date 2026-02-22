import { prisma } from '@/lib/prisma';

export async function getStoreByKey(storeKey: string) {
  return prisma.store.findUnique({ where: { storeKey } });
}

export function requiredStoreKey(searchParams: URLSearchParams, fallback = '') {
  return searchParams.get('store') ?? fallback;
}
