import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.upsert({
    where: { storeKey: 'demo-store' },
    update: {},
    create: { storeKey: 'demo-store', name: 'デモ店舗' }
  });

  const menus = [
    { name: '唐揚げ', category: 'food', price: 580, sortOrder: 1 },
    { name: '枝豆', category: 'food', price: 420, sortOrder: 2 },
    { name: '生ビール', category: 'drink', price: 650, sortOrder: 3 },
    { name: 'ウーロン茶', category: 'drink', price: 320, sortOrder: 4 },
    { name: '本日のおすすめ', category: 'other', price: 700, sortOrder: 5 }
  ] as const;

  for (const menu of menus) {
    await prisma.menu.upsert({
      where: { id: `${store.id}-${menu.name}` },
      update: {
        category: menu.category,
        price: menu.price,
        sortOrder: menu.sortOrder
      },
      create: {
        id: `${store.id}-${menu.name}`,
        storeId: store.id,
        name: menu.name,
        category: menu.category,
        price: menu.price,
        sortOrder: menu.sortOrder
      }
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
