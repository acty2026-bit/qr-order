CREATE TABLE "table_states" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "table_no" INTEGER NOT NULL,
  "last_checkout_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "table_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "table_states_store_id_table_no_key" ON "table_states"("store_id", "table_no");
CREATE INDEX "table_states_store_id_table_no_idx" ON "table_states"("store_id", "table_no");

ALTER TABLE "table_states"
ADD CONSTRAINT "table_states_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
