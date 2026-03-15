CREATE TYPE "FeedbackSatisfaction" AS ENUM ('very_satisfied', 'satisfied', 'neutral', 'dissatisfied');

CREATE TABLE "customer_feedbacks" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "table_no" INTEGER,
  "order_id" TEXT,
  "session_id" TEXT,
  "satisfaction" "FeedbackSatisfaction" NOT NULL,
  "comment" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_feedbacks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "customer_feedbacks"
ADD CONSTRAINT "customer_feedbacks_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "customer_feedbacks_store_id_created_at_idx" ON "customer_feedbacks"("store_id", "created_at");
CREATE INDEX "customer_feedbacks_session_id_idx" ON "customer_feedbacks"("session_id");
