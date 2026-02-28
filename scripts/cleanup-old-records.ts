import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);

  const deletedCalls = await prisma.call.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });

  const deletedOrders = await prisma.order.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });

  const deletedTableStates = await prisma.tableState.deleteMany({
    where: { updatedAt: { lt: cutoff } }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        cutoff: cutoff.toISOString(),
        deleted: {
          calls: deletedCalls.count,
          orders: deletedOrders.count,
          tableStates: deletedTableStates.count
        }
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
