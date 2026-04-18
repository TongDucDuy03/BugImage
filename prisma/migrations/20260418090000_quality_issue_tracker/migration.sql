CREATE TABLE "QualityIssueGroup" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productNameNormalized" TEXT NOT NULL,
    "customerName" TEXT,
    "customerNameNormalized" TEXT,
    "steelGrade" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hideFromTv" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityIssueGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QualityIssueImportLog" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedById" TEXT,
    "totalRows" INTEGER NOT NULL,
    "successRows" INTEGER NOT NULL,
    "errorRows" INTEGER NOT NULL,
    "createdNewGroups" INTEGER NOT NULL DEFAULT 0,
    "appendedExistingGroups" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'append',
    "errorDetailJson" JSONB,
    "errorFilePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityIssueImportLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QualityIssueLine" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "lineOrder" INTEGER NOT NULL,
    "defectRateText" TEXT,
    "defectName" TEXT,
    "actionPlan" TEXT,
    "progressStatus" TEXT,
    "deadlineText" TEXT,
    "ownerName" TEXT,
    "note" TEXT,
    "styles" JSONB,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "importLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityIssueLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QualityIssueGroup_sortOrder_idx" ON "QualityIssueGroup"("sortOrder");
CREATE INDEX "QualityIssueGroup_isActive_sortOrder_idx" ON "QualityIssueGroup"("isActive", "sortOrder");
CREATE INDEX "QualityIssueGroup_hideFromTv_sortOrder_idx" ON "QualityIssueGroup"("hideFromTv", "sortOrder");
CREATE INDEX "QualityIssueGroup_productNameNormalized_idx" ON "QualityIssueGroup"("productNameNormalized");
CREATE INDEX "QualityIssueGroup_productNameNormalized_customerNameNormalized_steelGrade_idx"
ON "QualityIssueGroup"("productNameNormalized", "customerNameNormalized", "steelGrade");

CREATE INDEX "QualityIssueLine_groupId_lineOrder_idx" ON "QualityIssueLine"("groupId", "lineOrder");
CREATE INDEX "QualityIssueLine_importLogId_idx" ON "QualityIssueLine"("importLogId");
CREATE UNIQUE INDEX "QualityIssueLine_groupId_lineOrder_key" ON "QualityIssueLine"("groupId", "lineOrder");

CREATE INDEX "QualityIssueImportLog_createdAt_idx" ON "QualityIssueImportLog"("createdAt");
CREATE INDEX "QualityIssueImportLog_importedById_createdAt_idx" ON "QualityIssueImportLog"("importedById", "createdAt");

ALTER TABLE "QualityIssueGroup"
ADD CONSTRAINT "QualityIssueGroup_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QualityIssueImportLog"
ADD CONSTRAINT "QualityIssueImportLog_importedById_fkey"
FOREIGN KEY ("importedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QualityIssueLine"
ADD CONSTRAINT "QualityIssueLine_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "QualityIssueGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QualityIssueLine"
ADD CONSTRAINT "QualityIssueLine_importLogId_fkey"
FOREIGN KEY ("importLogId") REFERENCES "QualityIssueImportLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
