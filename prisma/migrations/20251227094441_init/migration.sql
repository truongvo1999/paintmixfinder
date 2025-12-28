/*
  Warnings:

  - A unique constraint covering the columns `[colorId,variant,tonerCode]` on the table `FormulaComponent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FormulaComponent_colorId_variant_tonerCode_key" ON "FormulaComponent"("colorId", "variant", "tonerCode");
