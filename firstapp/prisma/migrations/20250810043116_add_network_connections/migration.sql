-- CreateTable
CREATE TABLE "NetworkConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'business',
    "strength" INTEGER NOT NULL DEFAULT 0,
    "sharedProjects" INTEGER NOT NULL DEFAULT 0,
    "meetingCount" INTEGER NOT NULL DEFAULT 0,
    "emailExchanges" INTEGER NOT NULL DEFAULT 0,
    "introductionDate" DATETIME,
    "lastInteraction" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NetworkConnection_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NetworkConnection_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "companyId" TEXT,
    "notes" TEXT,
    "businessCardImage" TEXT,
    "profileImage" TEXT,
    "introducedById" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "importance" INTEGER NOT NULL DEFAULT 1,
    "lastContactAt" DATETIME,
    "networkDegree" INTEGER NOT NULL DEFAULT 0,
    "networkBetweenness" REAL NOT NULL DEFAULT 0.0,
    "networkCloseness" REAL NOT NULL DEFAULT 0.0,
    "networkPageRank" REAL NOT NULL DEFAULT 0.0,
    "networkValue" INTEGER NOT NULL DEFAULT 0,
    "networkLastAnalyzed" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_introducedById_fkey" FOREIGN KEY ("introducedById") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("businessCardImage", "companyId", "createdAt", "email", "fullName", "id", "importance", "introducedById", "lastContactAt", "notes", "phone", "position", "profileImage", "tags", "updatedAt") SELECT "businessCardImage", "companyId", "createdAt", "email", "fullName", "id", "importance", "introducedById", "lastContactAt", "notes", "phone", "position", "profileImage", "tags", "updatedAt" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "NetworkConnection_fromId_toId_key" ON "NetworkConnection"("fromId", "toId");
