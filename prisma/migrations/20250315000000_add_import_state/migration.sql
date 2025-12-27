PRAGMA foreign_keys=OFF;

CREATE TABLE "ImportState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandsDone" BOOLEAN NOT NULL DEFAULT false,
    "colorsDone" BOOLEAN NOT NULL DEFAULT false,
    "componentsDone" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

PRAGMA foreign_keys=ON;
