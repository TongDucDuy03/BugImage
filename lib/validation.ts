import { z } from "zod";

export const dailyReportStatusEnum = ["draft", "finalized"] as const;

export const dailyReportCreateSchema = z.object({
	reportDate: z.string().min(1),
	receivedDate: z.string().optional().nullable(),
	summaryDate: z.string().optional().nullable(),
	departmentName: z.string().max(200).optional(),
	reportCode: z.string().max(100).optional().nullable(),
	generalNote: z.string().optional().nullable()
});

export const dailyReportUpdateSchema = z.object({
	receivedDate: z.string().optional().nullable(),
	summaryDate: z.string().optional().nullable(),
	departmentName: z.string().max(200).optional(),
	reportCode: z.string().max(100).optional().nullable(),
	generalNote: z.string().optional().nullable(),
	status: z.enum(dailyReportStatusEnum).optional()
});

export const dailyReportLineUpsertSchema = z.object({
	lineNo: z.number().int().positive().optional(),
	productName: z.string().max(500).optional().nullable(),
	customerName: z.string().max(500).optional().nullable(),
	steelGrade: z.string().max(200).optional().nullable(),
	inspectedQty: z.number().int().min(0).optional().nullable(),
	passedQty: z.number().int().min(0).optional().nullable(),
	passedRate: z.number().min(0).max(100).optional().nullable(),
	processedQty: z.number().int().min(0).optional().nullable(),
	processedRate: z.number().min(0).max(100).optional().nullable(),
	defectStatus: z.string().max(500).optional().nullable(),
	scrapQty: z.number().int().min(0).optional().nullable(),
	scrapRate: z.number().min(0).max(100).optional().nullable(),
	scrapStatus: z.string().max(500).optional().nullable(),
	workshopName: z.string().max(200).optional().nullable(),
	note: z.string().max(2000).optional().nullable(),
	sourceType: z.enum(["manual", "excel"]).optional()
});
