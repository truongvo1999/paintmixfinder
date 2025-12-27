-- Move variant from Color to FormulaComponent and remove duplicate Color rows by variant.

PRAGMA foreign_keys=OFF;

ALTER TABLE "FormulaComponent" ADD COLUMN "variant" TEXT;

UPDATE "FormulaComponent"
SET "variant" = (
  SELECT "variant" FROM "Color" WHERE "Color"."id" = "FormulaComponent"."colorId"
);

UPDATE "FormulaComponent"
SET "colorId" = (
  SELECT MIN("id")
  FROM "Color"
  WHERE "Color"."brandId" = (SELECT "brandId" FROM "Color" WHERE "id" = "FormulaComponent"."colorId")
    AND "Color"."code" = (SELECT "code" FROM "Color" WHERE "id" = "FormulaComponent"."colorId")
);

CREATE TABLE "new_FormulaComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colorId" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'V1',
    "tonerCode" TEXT NOT NULL,
    "tonerName" TEXT NOT NULL,
    "parts" DECIMAL NOT NULL,
    CONSTRAINT "FormulaComponent_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FormulaComponent_variant_check" CHECK ("variant" IN ('V1', 'V2'))
);

INSERT INTO "new_FormulaComponent" ("id", "colorId", "variant", "tonerCode", "tonerName", "parts")
SELECT
  "id",
  "colorId",
  COALESCE("variant", 'V1'),
  "tonerCode",
  "tonerName",
  "parts"
FROM "FormulaComponent";

DROP TABLE "FormulaComponent";
ALTER TABLE "new_FormulaComponent" RENAME TO "FormulaComponent";

CREATE TABLE "new_Color" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productionDate" DATETIME,
    "notes" TEXT,
    CONSTRAINT "Color_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Color" ("id", "brandId", "code", "name", "productionDate", "notes")
SELECT
  MIN("id") AS "id",
  "brandId",
  "code",
  "name",
  MAX("productionDate") AS "productionDate",
  MAX("notes") AS "notes"
FROM "Color"
GROUP BY "brandId", "code";

DROP TABLE "Color";
ALTER TABLE "new_Color" RENAME TO "Color";

CREATE UNIQUE INDEX "Color_brandId_code_key" ON "Color"("brandId", "code");
CREATE INDEX "Color_brandId_code_idx" ON "Color"("brandId", "code");
CREATE INDEX "Color_brandId_name_idx" ON "Color"("brandId", "name");
CREATE INDEX "FormulaComponent_colorId_variant_idx" ON "FormulaComponent"("colorId", "variant");

PRAGMA foreign_keys=ON;
