-- RedefineTables

CREATE TABLE "new_Color" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'V1',
    "productionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "Color_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Color" ("brandId", "code", "id", "name", "notes", "productionDate", "variant") SELECT "brandId", "code", "id", "name", "notes", "productionDate", "variant" FROM "Color";
DROP TABLE "Color";
ALTER TABLE "new_Color" RENAME TO "Color";
CREATE INDEX "Color_brandId_code_idx" ON "Color"("brandId", "code");
CREATE INDEX "Color_brandId_name_idx" ON "Color"("brandId", "name");
CREATE UNIQUE INDEX "Color_brandId_code_variant_key" ON "Color"("brandId", "code", "variant");
