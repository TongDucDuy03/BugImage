-- CreateTable
CREATE TABLE "DefectImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "pendingRows" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefectImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "defectId" TEXT,
    "rowNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "rawData" JSONB NOT NULL,
    "stt" TEXT,
    "productName" TEXT,
    "customerName" TEXT,
    "materialCode" TEXT,
    "lotQuantity" INTEGER,
    "okQuantity" INTEGER,
    "okRate" DOUBLE PRECISION,
    "repairQuantity" INTEGER,
    "repairRate" DOUBLE PRECISION,
    "defectName" TEXT,
    "scrapQuantity" INTEGER,
    "scrapRate" DOUBLE PRECISION,
    "scrapReason" TEXT,
    "workshop" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefectImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefectImportBatch_status_createdAt_idx" ON "DefectImportBatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DefectImportRow_batchId_status_rowNumber_idx" ON "DefectImportRow"("batchId", "status", "rowNumber");

-- CreateIndex
CREATE INDEX "DefectImportRow_defectId_idx" ON "DefectImportRow"("defectId");

-- AddForeignKey
ALTER TABLE "DefectImportRow" ADD CONSTRAINT "DefectImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DefectImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectImportRow" ADD CONSTRAINT "DefectImportRow_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
