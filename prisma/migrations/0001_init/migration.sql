-- CreateEnum
CREATE TYPE "MenuCategory" AS ENUM ('food', 'drink', 'other');

-- CreateEnum
CREATE TYPE "PrintStatus" AS ENUM ('success', 'failed', 'pending');

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "store_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MenuCategory" NOT NULL,
    "price" INTEGER NOT NULL,
    "is_sold_out" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "table_no" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "print_status" "PrintStatus" NOT NULL DEFAULT 'pending',
    "print_error_message" TEXT,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "menu_id" TEXT NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "price_snapshot" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "table_no" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_store_key_key" ON "stores"("store_key");
CREATE INDEX "menus_store_id_category_idx" ON "menus"("store_id", "category");
CREATE INDEX "menus_store_id_sort_order_idx" ON "menus"("store_id", "sort_order");
CREATE INDEX "orders_store_id_created_at_idx" ON "orders"("store_id", "created_at");
CREATE INDEX "orders_store_id_table_no_idx" ON "orders"("store_id", "table_no");
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_menu_id_idx" ON "order_items"("menu_id");
CREATE INDEX "calls_store_id_created_at_idx" ON "calls"("store_id", "created_at");
CREATE INDEX "calls_store_id_acknowledged_at_idx" ON "calls"("store_id", "acknowledged_at");

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calls" ADD CONSTRAINT "calls_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
