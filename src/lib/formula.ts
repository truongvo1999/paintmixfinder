export type FormulaComponentInput = {
  tonerCode: string;
  tonerName: string;
  parts: number;
};

export type FormulaComponentResult = FormulaComponentInput & {
  grams: number;
  percent: number;
};

const roundTo = (value: number, step: number) => {
  return Math.round((value + Number.EPSILON) / step) * step;
};

export const computeFormula = (
  components: FormulaComponentInput[],
  totalGrams: number
) => {
  const totalParts = components.reduce((sum, item) => sum + item.parts, 0);
  if (totalParts <= 0) {
    return { totalParts: 0, items: [] as FormulaComponentResult[] };
  }

  const items = components.map((item) => {
    const grams = roundTo((item.parts / totalParts) * totalGrams, 0.01);
    const percent = roundTo((item.parts / totalParts) * 100, 0.01);
    return { ...item, grams, percent };
  });

  const gramsSum = roundTo(
    items.reduce((sum, item) => sum + item.grams, 0),
    0.01
  );
  const diff = roundTo(totalGrams - gramsSum, 0.01);

  if (diff !== 0 && items.length > 0) {
    const maxIndex = items.reduce((maxIdx, item, idx, arr) =>
      item.parts > arr[maxIdx].parts ? idx : maxIdx
    , 0);
    items[maxIndex] = {
      ...items[maxIndex],
      grams: roundTo(items[maxIndex].grams + diff, 0.01)
    };
  }

  return { totalParts, items };
};
