-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "receivedDate" DATE,
    "summaryDate" DATE,
    "departmentName" TEXT NOT NULL DEFAULT 'Phòng nghiên cứu và công nghệ',
    "reportCode" TEXT,
    "createdById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "generalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReportLine" (
    "id" TEXT NOT NULL,
    "dailyReportId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "productName" TEXT,
    "customerName" TEXT,
    "steelGrade" TEXT,
    "inspectedQty" INTEGER,
    "passedQty" INTEGER,
    "passedRate" DOUBLE PRECISION,
    "processedQty" INTEGER,
    "processedRate" DOUBLE PRECISION,
    "defectStatus" TEXT,
    "scrapQty" INTEGER,
    "scrapRate" DOUBLE PRECISION,
    "scrapStatus" TEXT,
    "workshopName" TEXT,
    "note" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReportLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedById" TEXT,
    "dailyReportId" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "successRows" INTEGER NOT NULL,
    "errorRows" INTEGER NOT NULL,
    "errorFilePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogItem_kind_isActive_sortOrder_idx" ON "CatalogItem"("kind", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_kind_name_key" ON "CatalogItem"("kind", "name");

-- CreateIndex
CREATE INDEX "DailyReport_status_reportDate_idx" ON "DailyReport"("status", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_reportDate_key" ON "DailyReport"("reportDate");

-- CreateIndex
CREATE INDEX "DailyReportLine_dailyReportId_idx" ON "DailyReportLine"("dailyReportId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReportLine_dailyReportId_lineNo_key" ON "DailyReportLine"("dailyReportId", "lineNo");

-- CreateIndex
CREATE INDEX "ImportLog_dailyReportId_createdAt_idx" ON "ImportLog"("dailyReportId", "createdAt");

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReportLine" ADD CONSTRAINT "DailyReportLine_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
