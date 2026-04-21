import { Prisma, type PrismaClient, type QualityIssueGroup, type QualityIssueLine } from "@prisma/client";

export const QUALITY_ISSUE_STYLE_FIELDS = [
	"defectRateText",
	"defectName",
	"actionPlan",
	"progressStatus",
	"deadlineText",
	"ownerName",
	"note"
] as const;

export const QUALITY_ISSUE_WARNING_BG_FIELDS = ["defectRateText", "defectName"] as const;
export const QUALITY_ISSUE_WARNING_BG_COLOR = "#5A0B2B";
export const QUALITY_ISSUE_AUTO_RED_TEXT_FIELDS = ["actionPlan", "progressStatus", "deadlineText", "note"] as const;
export const QUALITY_ISSUE_AUTO_RED_TEXT_COLOR = "#C00000";
export const QUALITY_ISSUE_AUTO_BLUE_TEXT_COLOR = "#2F75B5";

export type QualityIssueStyleField = (typeof QUALITY_ISSUE_STYLE_FIELDS)[number];
export type QualityIssueWarningBgField = (typeof QUALITY_ISSUE_WARNING_BG_FIELDS)[number];
export type QualityIssueAutoRedTextField = (typeof QUALITY_ISSUE_AUTO_RED_TEXT_FIELDS)[number];

export type QualityIssueCellStyle = {
	bgColor?: string | null;
	fontColor?: string | null;
	bold?: boolean | null;
};

export type QualityIssueLineStyles = Partial<Record<QualityIssueStyleField, QualityIssueCellStyle>>;

export type QualityIssueGroupWithLines = QualityIssueGroup & {
	lines: QualityIssueLine[];
};

export type QualityIssueLinePayload = {
	id: string;
	lineOrder: number;
	defectRateText: string | null;
	defectName: string | null;
	actionPlan: string | null;
	progressStatus: string | null;
	deadlineText: string | null;
	ownerName: string | null;
	note: string | null;
	styles: QualityIssueLineStyles | null;
	sourceType: string;
	createdAt: string;
	updatedAt: string;
};

export type QualityIssueGroupPayload = {
	groupId: string;
	stt: number;
	productName: string;
	customerName: string | null;
	steelGrade: string | null;
	sortOrder: number;
	hideFromTv: boolean;
	lines: QualityIssueLinePayload[];
};

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function normalizeWhitespace(input: string) {
	return input.replace(/\s+/g, " ").trim();
}

export function normalizeQualityLookupText(input: string | null | undefined) {
	if (!input) return null;
	const value = normalizeWhitespace(String(input))
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D")
		.toLowerCase();
	return value || null;
}

export function normalizeSteelGrade(input: string | null | undefined) {
	if (!input) return null;
	return normalizeWhitespace(String(input)).toLowerCase() || null;
}

export function buildQualityGroupLookup(input: {
	productName: string | null | undefined;
	customerName?: string | null | undefined;
	steelGrade?: string | null | undefined;
}) {
	return {
		productNameNormalized: normalizeQualityLookupText(input.productName),
		customerNameNormalized: normalizeQualityLookupText(input.customerName),
		steelGradeNormalized: normalizeSteelGrade(input.steelGrade)
	};
}

export function sanitizeStyleColor(input: string | null | undefined) {
	if (!input) return null;
	const raw = input.replace(/^#/, "").trim();
	if (!raw) return null;
	if (/^[0-9a-fA-F]{8}$/.test(raw)) return `#${raw.slice(2).toUpperCase()}`;
	if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
	return null;
}

export function isQualityIssueWarningBgField(field: QualityIssueStyleField): field is QualityIssueWarningBgField {
	return (QUALITY_ISSUE_WARNING_BG_FIELDS as readonly string[]).includes(field);
}

export function isQualityIssueAutoRedTextField(field: QualityIssueStyleField): field is QualityIssueAutoRedTextField {
	return (QUALITY_ISSUE_AUTO_RED_TEXT_FIELDS as readonly string[]).includes(field);
}

function normalizeQualityHighlightText(input: string | null | undefined) {
	if (!input) return null;
	const normalized = String(input)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
	return normalized || null;
}

export function shouldAutoRedText(field: QualityIssueStyleField, value: string | null | undefined) {
	if (!isQualityIssueAutoRedTextField(field)) return false;
	const normalized = normalizeQualityHighlightText(value);
	if (!normalized) return false;

	return (
		normalized === "dang tim hieu" ||
		normalized === "dang cap nhat" ||
		normalized === "chua co bien phap" ||
		normalized === "chua thong nhat" ||
		normalized === "chua co" ||
		normalized.startsWith("cho") ||
		normalized.includes("dang tim nguyen nhan")
	);
}

export function shouldAutoBlueText(field: QualityIssueStyleField, value: string | null | undefined) {
	if (!isQualityIssueAutoRedTextField(field)) return false;
	const normalized = normalizeQualityHighlightText(value);
	if (!normalized) return false;
	return normalized.includes("da duc het");
}

export function getQualityIssueAutoTextColor(field: QualityIssueStyleField, value: string | null | undefined) {
	if (shouldAutoBlueText(field, value)) return QUALITY_ISSUE_AUTO_BLUE_TEXT_COLOR;
	if (shouldAutoRedText(field, value)) return QUALITY_ISSUE_AUTO_RED_TEXT_COLOR;
	return null;
}

export function sanitizeLineStyles(styles: QualityIssueLineStyles | null | undefined) {
	if (!styles) return null;
	const out: QualityIssueLineStyles = {};
	for (const field of QUALITY_ISSUE_STYLE_FIELDS) {
		const style = styles[field];
		if (!style) continue;
		const bgColor = sanitizeStyleColor(style.bgColor ?? undefined);
		const bold = typeof style.bold === "boolean" ? style.bold : null;
		const normalizedBgColor = bgColor && isQualityIssueWarningBgField(field) ? QUALITY_ISSUE_WARNING_BG_COLOR : null;
		if (normalizedBgColor || bold != null) {
			out[field] = { bgColor: normalizedBgColor, fontColor: null, bold };
		}
	}
	return Object.keys(out).length ? out : null;
}

export function toPrismaNullableJson(value: Prisma.JsonValue | QualityIssueLineStyles | null | undefined) {
	if (value == null) return Prisma.DbNull;
	return value as Prisma.InputJsonValue;
}

export async function getNextQualityGroupSortOrder(db: PrismaLike) {
	const max = await db.qualityIssueGroup.aggregate({
		_max: { sortOrder: true }
	});
	return (max._max.sortOrder ?? 0) + 1;
}

export async function getNextQualityLineOrder(db: PrismaLike, groupId: string) {
	const max = await db.qualityIssueLine.aggregate({
		where: { groupId },
		_max: { lineOrder: true }
	});
	return (max._max.lineOrder ?? 0) + 1;
}

export async function findMatchingQualityIssueGroup(
	db: PrismaLike,
	input: {
		productName: string | null | undefined;
		customerName?: string | null | undefined;
		steelGrade?: string | null | undefined;
	}
) {
	const lookup = buildQualityGroupLookup(input);
	if (!lookup.productNameNormalized) return null;

	const normalizedSteel = lookup.steelGradeNormalized;

	if (lookup.customerNameNormalized || normalizedSteel) {
		const exact = await db.qualityIssueGroup.findFirst({
			where: {
				isActive: true,
				productNameNormalized: lookup.productNameNormalized,
				customerNameNormalized: lookup.customerNameNormalized,
				steelGrade: input.steelGrade?.trim() || null
			},
			orderBy: [{ sortOrder: "asc" }]
		});
		if (exact) return exact;
	}

	if (lookup.customerNameNormalized) {
		const customerMatches = await db.qualityIssueGroup.findMany({
			where: {
				isActive: true,
				productNameNormalized: lookup.productNameNormalized,
				customerNameNormalized: lookup.customerNameNormalized
			},
			orderBy: [{ sortOrder: "asc" }],
			take: 5
		});
		if (customerMatches.length === 1) return customerMatches[0]!;
		const steelMatch = customerMatches.find((group) => normalizeSteelGrade(group.steelGrade) === normalizedSteel);
		if (steelMatch) return steelMatch;
	}

	const productMatches = await db.qualityIssueGroup.findMany({
		where: {
			isActive: true,
			productNameNormalized: lookup.productNameNormalized
		},
		orderBy: [{ sortOrder: "asc" }],
		take: 5
	});

	if (productMatches.length === 1) return productMatches[0]!;
	const exactSteelMatch = productMatches.find(
		(group) =>
			normalizeQualityLookupText(group.customerName) === lookup.customerNameNormalized &&
			normalizeSteelGrade(group.steelGrade) === normalizedSteel
	);
	return exactSteelMatch ?? null;
}

export async function createQualityIssueGroup(
	db: PrismaLike,
	input: {
		productName: string;
		customerName?: string | null;
		steelGrade?: string | null;
		createdById?: string | null;
	}
) {
	const sortOrder = await getNextQualityGroupSortOrder(db);
	return db.qualityIssueGroup.create({
		data: {
			productName: normalizeWhitespace(input.productName),
			productNameNormalized: normalizeQualityLookupText(input.productName)!,
			customerName: input.customerName ? normalizeWhitespace(input.customerName) : null,
			customerNameNormalized: normalizeQualityLookupText(input.customerName),
			steelGrade: input.steelGrade ? normalizeWhitespace(input.steelGrade) : null,
			sortOrder,
			createdById: input.createdById ?? null
		}
	});
}

export function buildQualityIssueListResponse(groups: Array<QualityIssueGroupWithLines>) {
	return groups.map((group, index) => ({
		groupId: group.id,
		stt: index + 1,
		productName: group.productName,
		customerName: group.customerName,
		steelGrade: group.steelGrade,
		sortOrder: group.sortOrder,
		hideFromTv: group.hideFromTv,
		lines: group.lines
			.slice()
			.sort((a, b) => a.lineOrder - b.lineOrder)
			.map((line) => ({
				id: line.id,
				lineOrder: line.lineOrder,
				defectRateText: line.defectRateText,
				defectName: line.defectName,
				actionPlan: line.actionPlan,
				progressStatus: line.progressStatus,
				deadlineText: line.deadlineText,
				ownerName: line.ownerName,
				note: line.note,
				styles: sanitizeLineStyles((line.styles as QualityIssueLineStyles | null) ?? null),
				sourceType: line.sourceType,
				createdAt: line.createdAt.toISOString(),
				updatedAt: line.updatedAt.toISOString()
			}))
	})) satisfies QualityIssueGroupPayload[];
}
