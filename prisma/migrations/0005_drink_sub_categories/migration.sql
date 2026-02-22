CREATE TYPE "DrinkSubCategory" AS ENUM (
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
);

ALTER TABLE "menus" ADD COLUMN "drink_sub_category" "DrinkSubCategory";

UPDATE "menus"
SET "drink_sub_category" = 'soft_drink'
WHERE "category" = 'drink' AND "drink_sub_category" IS NULL;
