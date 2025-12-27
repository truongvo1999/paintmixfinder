import type { PrismaClient } from "@prisma/client";

export type ImportStatus = {
  brandsDone: boolean;
  colorsDone: boolean;
  componentsDone: boolean;
  counts: {
    brands: number;
    colors: number;
    components: number;
  };
};

const STATE_ID = "singleton";

export const getImportStatus = async (client: PrismaClient): Promise<ImportStatus> => {
  const [existingState, brands, colors, components] = await Promise.all([
    client.importState.findUnique({ where: { id: STATE_ID } }),
    client.brand.count(),
    client.color.count(),
    client.formulaComponent.count()
  ]);

  const counts = { brands, colors, components };
  const nextState = {
    brandsDone: existingState?.brandsDone ?? false,
    colorsDone: existingState?.colorsDone ?? false,
    componentsDone: existingState?.componentsDone ?? false
  };

  if (counts.brands > 0) {
    nextState.brandsDone = true;
  }
  if (counts.colors > 0) {
    nextState.colorsDone = true;
  }
  if (counts.components > 0) {
    nextState.componentsDone = true;
  }

  const needsCreate = !existingState;
  const needsUpdate =
    !needsCreate &&
    (nextState.brandsDone !== existingState.brandsDone ||
      nextState.colorsDone !== existingState.colorsDone ||
      nextState.componentsDone !== existingState.componentsDone);

  if (needsCreate) {
    await client.importState.create({
      data: {
        id: STATE_ID,
        brandsDone: nextState.brandsDone,
        colorsDone: nextState.colorsDone,
        componentsDone: nextState.componentsDone
      }
    });
  } else if (needsUpdate) {
    await client.importState.update({
      where: { id: STATE_ID },
      data: nextState
    });
  }

  return {
    ...nextState,
    counts
  };
};

export const setImportState = async (
  client: PrismaClient,
  data: Partial<Omit<ImportStatus, "counts">>
) => {
  await client.importState.upsert({
    where: { id: STATE_ID },
    create: {
      id: STATE_ID,
      brandsDone: data.brandsDone ?? false,
      colorsDone: data.colorsDone ?? false,
      componentsDone: data.componentsDone ?? false
    },
    update: data
  });
};
