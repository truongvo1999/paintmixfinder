/*
  Warnings:

  - You are about to drop the column `variant` on the `Color` table. All the data in the column will be lost.

*/
-- RedefineTables
CREATE TABLE "new_Color" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productionDate" DATETIME,
    "notes" TEXT,
    CONSTRAINT "Color_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Color" ("brandId", "code", "id", "name", "notes", "productionDate") SELECT "brandId", "code", "id", "name", "notes", "productionDate" FROM "Color";
DROP TABLE "Color";
ALTER TABLE "new_Color" RENAME TO "Color";
CREATE INDEX "Color_brandId_code_idx" ON "Color"("brandId", "code");
CREATE INDEX "Color_brandId_name_idx" ON "Color"("brandId", "name");
CREATE UNIQUE INDEX "Color_brandId_code_key" ON "Color"("brandId", "code");
CREATE TABLE "new_FormulaComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colorId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "tonerCode" TEXT NOT NULL,
    "tonerName" TEXT NOT NULL,
    "parts" DECIMAL NOT NULL,
    CONSTRAINT "FormulaComponent_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FormulaComponent" ("colorId", "id", "parts", "tonerCode", "tonerName", "variant") SELECT "colorId", "id", "parts", "tonerCode", "tonerName", "variant" FROM "FormulaComponent";
DROP TABLE "FormulaComponent";
ALTER TABLE "new_FormulaComponent" RENAME TO "FormulaComponent";
CREATE INDEX "FormulaComponent_colorId_variant_idx" ON "FormulaComponent"("colorId", "variant");

