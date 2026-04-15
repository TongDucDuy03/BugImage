ALTER TABLE "DailyReport" ADD COLUMN "hideFromTv" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "DailyReport_hideFromTv_reportDate_idx" ON "DailyReport"("hideFromTv", "reportDate");
