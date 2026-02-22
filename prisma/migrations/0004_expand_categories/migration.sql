ALTER TYPE "MenuCategory" ADD VALUE IF NOT EXISTS 'quick';
ALTER TYPE "MenuCategory" ADD VALUE IF NOT EXISTS 'recommendation';
ALTER TYPE "MenuCategory" ADD VALUE IF NOT EXISTS 'dessert';

CREATE TYPE "FoodSubCategory" AS ENUM ('seafood', 'grill', 'fried', 'small_dish', 'rice');
ALTER TABLE "menus" ADD COLUMN "food_sub_category" "FoodSubCategory";

UPDATE "menus"
SET "food_sub_category" = 'small_dish'
WHERE "category" = 'food' AND "food_sub_category" IS NULL;
