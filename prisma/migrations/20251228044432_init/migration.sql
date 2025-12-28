-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productionDate" TIMESTAMP(3),
    "notes" TEXT,
    "colorCar" TEXT,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulaComponent" (
    "id" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "tonerCode" TEXT NOT NULL,
    "tonerName" TEXT NOT NULL,
    "parts" DECIMAL NOT NULL,

    CONSTRAINT "FormulaComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "brandsDone" BOOLEAN NOT NULL DEFAULT false,
    "colorsDone" BOOLEAN NOT NULL DEFAULT false,
    "componentsDone" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Color_brandId_code_key" ON "Color"("brandId", "code");

-- CreateIndex
CREATE INDEX "Color_brandId_code_idx" ON "Color"("brandId", "code");

-- CreateIndex
CREATE INDEX "Color_brandId_name_idx" ON "Color"("brandId", "name");

-- CreateIndex
CREATE INDEX "FormulaComponent_colorId_variant_idx" ON "FormulaComponent"("colorId", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaComponent_colorId_variant_tonerCode_key" ON "FormulaComponent"("colorId", "variant", "tonerCode");

-- AddForeignKey
ALTER TABLE "Color" ADD CONSTRAINT "Color_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaComponent" ADD CONSTRAINT "FormulaComponent_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
