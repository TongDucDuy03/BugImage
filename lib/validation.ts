import { z } from "zod";

export const severityEnum = ["low", "medium", "high", "critical"] as const;

export const defectCreateSchema = z.object({
	code: z.string().min(1).max(50),
	name: z.string().min(1).max(200),
	slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
	shortDescription: z.string().max(200).optional().or(z.literal("")),
	description: z.string().optional().or(z.literal("")),
	cause: z.string().optional().or(z.literal("")),
	detectionMethod: z.string().optional().or(z.literal("")),
	solution: z.string().optional().or(z.literal("")),
	severity: z.enum(severityEnum),
	defectGroup: z.string().optional().or(z.literal("")),
	processStage: z.string().optional().or(z.literal("")),
	isActive: z.boolean().default(true),
	isFeatured: z.boolean().default(false),
	sortOrder: z.number().int().min(0).default(0)
});

export const defectUpdateSchema = defectCreateSchema.partial();

export const imageUploadSchema = z.object({
	defectId: z.string().cuid(),
	fileName: z.string(),
	originalName: z.string(),
	mimeType: z.string(),
	fileSize: z.number().int().positive(),
	path: z.string(),
	url: z.string().url().or(z.string().startsWith("/")),
	altText: z.string().optional().or(z.literal("")),
	isActive: z.boolean().default(true),
	isCover: z.boolean().default(false),
	sortOrder: z.number().int().min(0).default(0)
});

