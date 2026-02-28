ALTER TABLE "menus"
ADD COLUMN "is_recommended" BOOLEAN NOT NULL DEFAULT false;

UPDATE "menus"
SET "is_recommended" = true,
    "category" = 'food',
    "food_sub_category" = COALESCE("food_sub_category", 'small_dish')
WHERE "category" = 'recommendation';
