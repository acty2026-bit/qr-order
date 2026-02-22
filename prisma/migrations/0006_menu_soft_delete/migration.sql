ALTER TABLE "menus"
ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "menus_store_id_deleted_at_idx"
ON "menus"("store_id", "deleted_at");
