import { z } from "zod";

export const dailyReportStatusEnum = ["draft", "finalized"] as const;
export const qualityIssueImportModeEnum = ["append", "upsert"] as const;

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

const qualityIssueCellStyleSchema = z.object({
	bgColor: z.string().regex(/^#?[0-9a-fA-F]{6,8}$/).optional().nullable(),
	fontColor: z.string().regex(/^#?[0-9a-fA-F]{6,8}$/).optional().nullable(),
	bold: z.boolean().optional().nullable()
});

export const qualityIssueLineStylesSchema = z
	.object({
		defectRateText: qualityIssueCellStyleSchema.optional(),
		defectName: qualityIssueCellStyleSchema.optional(),
		actionPlan: qualityIssueCellStyleSchema.optional(),
		progressStatus: qualityIssueCellStyleSchema.optional(),
		deadlineText: qualityIssueCellStyleSchema.optional(),
		ownerName: qualityIssueCellStyleSchema.optional(),
		note: qualityIssueCellStyleSchema.optional()
	})
	.partial();

export const qualityIssueLineCreateSchema = z.object({
	productName: z.string().min(1).max(1000),
	customerName: z.string().max(500).optional().nullable(),
	steelGrade: z.string().max(200).optional().nullable(),
	defectRateText: z.string().max(200).optional().nullable(),
	defectName: z.string().max(2000).optional().nullable(),
	actionPlan: z.string().max(4000).optional().nullable(),
	progressStatus: z.string().max(2000).optional().nullable(),
	deadlineText: z.string().max(500).optional().nullable(),
	ownerName: z.string().max(500).optional().nullable(),
	note: z.string().max(4000).optional().nullable(),
	styles: qualityIssueLineStylesSchema.optional().nullable(),
	sourceType: z.enum(["manual", "excel_import"]).optional()
});

export const qualityIssueLineUpdateSchema = z.object({
	productName: z.string().min(1).max(1000).optional(),
	customerName: z.string().max(500).optional().nullable(),
	steelGrade: z.string().max(200).optional().nullable(),
	defectRateText: z.string().max(200).optional().nullable(),
	defectName: z.string().max(2000).optional().nullable(),
	actionPlan: z.string().max(4000).optional().nullable(),
	progressStatus: z.string().max(2000).optional().nullable(),
	deadlineText: z.string().max(500).optional().nullable(),
	ownerName: z.string().max(500).optional().nullable(),
	note: z.string().max(4000).optional().nullable(),
	styles: qualityIssueLineStylesSchema.optional().nullable(),
	groupId: z.string().optional(),
	sourceType: z.enum(["manual", "excel_import"]).optional()
});

export const qualityIssueGroupUpdateSchema = z.object({
	productName: z.string().min(1).max(1000).optional(),
	customerName: z.string().max(500).optional().nullable(),
	steelGrade: z.string().max(200).optional().nullable(),
	hideFromTv: z.boolean().optional(),
	isActive: z.boolean().optional()
});
