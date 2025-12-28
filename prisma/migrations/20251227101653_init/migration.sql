-- RedefineTables
CREATE TABLE "new_ImportState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "brandsDone" BOOLEAN NOT NULL DEFAULT false,
    "colorsDone" BOOLEAN NOT NULL DEFAULT false,
    "componentsDone" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ImportState" ("brandsDone", "colorsDone", "componentsDone", "id", "updatedAt") SELECT "brandsDone", "colorsDone", "componentsDone", "id", "updatedAt" FROM "ImportState";
DROP TABLE "ImportState";
ALTER TABLE "new_ImportState" RENAME TO "ImportState";

