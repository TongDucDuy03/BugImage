-- Drop legacy defect / import tables (data no longer used; app uses DailyReport + DailyReportLine)
DROP TABLE IF EXISTS "DefectImportRow" CASCADE;
DROP TABLE IF EXISTS "DefectImportBatch" CASCADE;
DROP TABLE IF EXISTS "DefectImage" CASCADE;
DROP TABLE IF EXISTS "Defect" CASCADE;
