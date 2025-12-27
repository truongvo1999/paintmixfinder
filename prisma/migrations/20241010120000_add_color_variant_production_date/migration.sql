-- Add ColorVariant enum behavior and productionDate column.
-- Existing rows default to variant V1 and productionDate 2024-01-01.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Color" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'V1',
    "productionDate" DATETIME NOT NULL DEFAULT '2024-01-01T00:00:00.000Z',
    "notes" TEXT,
    CONSTRAINT "Color_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Color_variant_check" CHECK ("variant" IN ('V1', 'V2'))
);

INSERT INTO "new_Color" ("id", "brandId", "code", "name", "variant", "productionDate", "notes")
SELECT "id",
       "brandId",
       "code",
       "name",
       COALESCE("variant", 'V1'),
       '2024-01-01T00:00:00.000Z',
       "notes"
FROM "Color";

DROP TABLE "Color";
ALTER TABLE "new_Color" RENAME TO "Color";

CREATE UNIQUE INDEX "Color_brandId_code_variant_key" ON "Color"("brandId", "code", "variant");
CREATE INDEX "Color_brandId_code_idx" ON "Color"("brandId", "code");
CREATE INDEX "Color_brandId_name_idx" ON "Color"("brandId", "name");

PRAGMA foreign_keys=ON;
