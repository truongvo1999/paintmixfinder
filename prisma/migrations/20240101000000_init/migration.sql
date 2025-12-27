-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT,
    "notes" TEXT,
    CONSTRAINT "Color_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormulaComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colorId" TEXT NOT NULL,
    "tonerCode" TEXT NOT NULL,
    "tonerName" TEXT NOT NULL,
    "parts" DECIMAL NOT NULL,
    CONSTRAINT "FormulaComponent_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Color_brandId_code_idx" ON "Color"("brandId", "code");

-- CreateIndex
CREATE INDEX "Color_brandId_name_idx" ON "Color"("brandId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Color_brandId_code_variant_key" ON "Color"("brandId", "code", "variant");
