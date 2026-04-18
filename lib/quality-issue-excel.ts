import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LocalStorageAdapter } from "@/lib/storage/local";
import {
	buildQualityGroupLookup,
	createQualityIssueGroup,
	findMatchingQualityIssueGroup,
	getNextQualityLineOrder,
	normalizeQualityLookupText,
	sanitizeLineStyles,
	toPrismaNullableJson,
	type QualityIssueLineStyles,
	type QualityIssueStyleField
} from "@/lib/quality-issues";

export type QualityIssueImportMode = "append" | "upsert";

export type ParsedQualityIssueRow = {
	rowNumber: number;
	stt: string | null;
	productName: string | null;
	customerName: string | null;
	steelGrade: string | null;
	defectRateText: string | null;
	defectName: string | null;
	actionPlan: string | null;
	progressStatus: string | null;
	deadlineText: string | null;
	ownerName: string | null;
	note: string | null;
	styles: QualityIssueLineStyles | null;
	rawData: Record<string, string | null>;
};

type ParsedWorkbook = {
	sheetName: string;
	rows: ParsedQualityIssueRow[];
};

type ImportPreviewItem = {
	rowNumber: number;
	action: "create_group" | "append_group" | "update_line" | "skip";
	productName: string | null;
	defectName: string | null;
	groupLabel: string;
	message: string;
};

export type QualityIssueImportPreview = {
	sheetName: string;
	totalRows: number;
	validRows: number;
	createdNewGroups: number;
	appendedExistingGroups: number;
	skippedRows: number;
	errorRows: number;
	errors: Array<{ rowNumber: number; message: string }>;
	items: ImportPreviewItem[];
};

export type QualityIssueImportCommitResult = QualityIssueImportPreview & {
	importLog: { id: string; errorFilePath: string | null };
	successRows: number;
};

const HEADER_SCORE_TOKENS = [
	"stt",
	"ten san pham",
	"khach hang",
	"mac thep",
	"ten loi",
	"bien phap",
	"tinh trang tien do"
];

const STYLE_FIELD_TO_COLUMN: Record<QualityIssueStyleField, keyof ReturnType<typeof mapColumnIndex>> = {
	defectRateText: "defectRateText",
	defectName: "defectName",
	actionPlan: "actionPlan",
	progressStatus: "progressStatus",
	deadlineText: "deadlineText",
	ownerName: "ownerName",
	note: "note"
};

function normalizeHeaderText(input: unknown) {
	return String(input ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D")
		.toLowerCase()
		.replace(/[&/\\()\-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function cleanText(input: unknown) {
	const value = String(input ?? "").replace(/\s+/g, " ").trim();
	return value || null;
}

function readCellDisplayValue(cell: (XLSX.CellObject & { s?: unknown }) | undefined) {
	if (!cell) return "";
	if (cell.w != null && String(cell.w).trim()) return String(cell.w);
	if (cell.v == null) return "";
	if (cell.v instanceof Date) return cell.v.toISOString().slice(0, 10);
	return String(cell.v);
}

function normalizeStyleColor(value: unknown) {
	if (!value || typeof value !== "string") return null;
	const raw = value.replace(/^#/, "").trim();
	if (/^[0-9a-fA-F]{8}$/.test(raw)) return `#${raw.slice(2).toUpperCase()}`;
	if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
	return null;
}

function extractCellStyle(cell: (XLSX.CellObject & { s?: any }) | undefined) {
	if (!cell?.s || typeof cell.s !== "object") return null;
	const style = cell.s;
	const bgColor =
		normalizeStyleColor(style.fill?.fgColor?.rgb) ??
		normalizeStyleColor(style.fill?.bgColor?.rgb) ??
		normalizeStyleColor(style.fgColor?.rgb) ??
		null;
	const fontColor =
		normalizeStyleColor(style.font?.color?.rgb) ??
		normalizeStyleColor(style.color?.rgb) ??
		null;
	const bold = typeof style.font?.bold === "boolean" ? style.font.bold : typeof style.bold === "boolean" ? style.bold : null;
	if (!bgColor && !fontColor && bold == null) return null;
	return { bgColor, fontColor, bold };
}

function buildSheetMatrices(sheet: XLSX.WorkSheet) {
	const ref = sheet["!ref"];
	if (!ref) throw new Error("Sheet Excel không có vùng dữ liệu.");
	const range = XLSX.utils.decode_range(ref);
	const rowCount = range.e.r + 1;
	const columnCount = range.e.c + 1;
	const values: string[][] = Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => ""));
	const styles: Array<Array<ReturnType<typeof extractCellStyle>>> = Array.from({ length: rowCount }, () =>
		Array.from({ length: columnCount }, () => null)
	);

	for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
		for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
			const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
			const cell = sheet[address] as (XLSX.CellObject & { s?: any }) | undefined;
			values[rowIndex]![columnIndex] = readCellDisplayValue(cell);
			styles[rowIndex]![columnIndex] = extractCellStyle(cell);
		}
	}

	for (const merge of sheet["!merges"] ?? []) {
		const topValue = values[merge.s.r]?.[merge.s.c] ?? "";
		const topStyle = styles[merge.s.r]?.[merge.s.c] ?? null;
		for (let rowIndex = merge.s.r; rowIndex <= merge.e.r; rowIndex += 1) {
			for (let columnIndex = merge.s.c; columnIndex <= merge.e.c; columnIndex += 1) {
				if (!values[rowIndex]![columnIndex]) values[rowIndex]![columnIndex] = topValue;
				if (!styles[rowIndex]![columnIndex]) styles[rowIndex]![columnIndex] = topStyle;
			}
		}
	}

	return { values, styles };
}

function scoreHeaderRow(row: string[]) {
	const normalized = row.map((cell) => normalizeHeaderText(cell));
	return HEADER_SCORE_TOKENS.reduce((score, token) => score + (normalized.some((cell) => cell.includes(token)) ? 1 : 0), 0);
}

function findHeaderRowIndex(values: string[][]) {
	let bestIndex = -1;
	let bestScore = -1;
	for (let index = 0; index < Math.min(values.length, 20); index += 1) {
		const score = scoreHeaderRow(values[index] ?? []);
		if (score > bestScore) {
			bestScore = score;
			bestIndex = index;
		}
	}
	if (bestIndex < 0 || bestScore < 4) {
		throw new Error("Không tìm thấy hàng tiêu đề hợp lệ theo mẫu theo dõi hàng lỗi chất lượng.");
	}
	return bestIndex;
}

function findColumnIndex(headers: string[], matchers: string[][], label: string) {
	const normalizedHeaders = headers.map((header) => normalizeHeaderText(header));
	for (let index = 0; index < normalizedHeaders.length; index += 1) {
		const value = normalizedHeaders[index]!;
		if (matchers.some((matcher) => matcher.every((token) => value.includes(token)))) {
			return index;
		}
	}
	throw new Error(`Không tìm thấy cột "${label}" trong file Excel.`);
}

function mapColumnIndex(headers: string[]) {
	return {
		stt: findColumnIndex(headers, [["stt"]], "STT"),
		productName: findColumnIndex(headers, [["ten san pham", "hong"], ["ten san pham", "loi"]], "Tên sản phẩm hỏng/lỗi"),
		customerName: findColumnIndex(headers, [["khach hang"]], "Khách hàng"),
		steelGrade: findColumnIndex(headers, [["mac thep"]], "Mác thép"),
		defectRateText: findColumnIndex(headers, [["ti le", "hong", "xu ly"]], "Tỉ lệ hỏng & xử lý"),
		defectName: findColumnIndex(headers, [["ten loi"]], "Tên lỗi"),
		actionPlan: findColumnIndex(headers, [["bien phap"]], "Biện pháp"),
		progressStatus: findColumnIndex(headers, [["tinh trang", "tien do"]], "Tình trạng tiến độ"),
		deadlineText: findColumnIndex(headers, [["han dinh"]], "Hạn định"),
		ownerName: findColumnIndex(headers, [["phu trach"]], "Phụ trách"),
		note: findColumnIndex(headers, [["ghi chu"]], "Ghi chú")
	};
}

function isMeaningfulDataRow(cells: string[]) {
	return cells.some((cell) => cleanText(cell));
}

function buildRowStyles(
	styleRow: Array<ReturnType<typeof extractCellStyle>>,
	columnIndex: ReturnType<typeof mapColumnIndex>
) {
	const styles: QualityIssueLineStyles = {};
	for (const [field, columnKey] of Object.entries(STYLE_FIELD_TO_COLUMN) as Array<[QualityIssueStyleField, keyof ReturnType<typeof mapColumnIndex>]>) {
		const style = styleRow[columnIndex[columnKey]];
		if (style) styles[field] = style;
	}
	return sanitizeLineStyles(styles);
}

export function parseQualityIssueWorkbook(buffer: Buffer): ParsedWorkbook {
	const workbook = XLSX.read(buffer, {
		type: "buffer",
		cellDates: true,
		cellStyles: true,
		cellNF: true,
		cellHTML: false
	});
	const firstSheetName = workbook.SheetNames[0];
	if (!firstSheetName) throw new Error("File Excel không có sheet nào.");
	const sheet = workbook.Sheets[firstSheetName];
	const { values, styles } = buildSheetMatrices(sheet);
	const headerRowIndex = findHeaderRowIndex(values);
	const headers = values[headerRowIndex] ?? [];
	const columnIndex = mapColumnIndex(headers);
	const rows: ParsedQualityIssueRow[] = [];
	let previousContext: Partial<ParsedQualityIssueRow> = {};

	for (let rowIndex = headerRowIndex + 1; rowIndex < values.length; rowIndex += 1) {
		const rawRow = values[rowIndex] ?? [];
		if (!isMeaningfulDataRow(rawRow)) continue;

		const row: ParsedQualityIssueRow = {
			rowNumber: rowIndex + 1,
			stt: cleanText(rawRow[columnIndex.stt]) ?? previousContext.stt ?? null,
			productName: cleanText(rawRow[columnIndex.productName]) ?? previousContext.productName ?? null,
			customerName: cleanText(rawRow[columnIndex.customerName]) ?? previousContext.customerName ?? null,
			steelGrade: cleanText(rawRow[columnIndex.steelGrade]) ?? previousContext.steelGrade ?? null,
			defectRateText: cleanText(rawRow[columnIndex.defectRateText]),
			defectName: cleanText(rawRow[columnIndex.defectName]),
			actionPlan: cleanText(rawRow[columnIndex.actionPlan]),
			progressStatus: cleanText(rawRow[columnIndex.progressStatus]),
			deadlineText: cleanText(rawRow[columnIndex.deadlineText]),
			ownerName: cleanText(rawRow[columnIndex.ownerName]),
			note: cleanText(rawRow[columnIndex.note]),
			styles: buildRowStyles(styles[rowIndex] ?? [], columnIndex),
			rawData: {
				stt: cleanText(rawRow[columnIndex.stt]),
				productName: cleanText(rawRow[columnIndex.productName]),
				customerName: cleanText(rawRow[columnIndex.customerName]),
				steelGrade: cleanText(rawRow[columnIndex.steelGrade]),
				defectRateText: cleanText(rawRow[columnIndex.defectRateText]),
				defectName: cleanText(rawRow[columnIndex.defectName]),
				actionPlan: cleanText(rawRow[columnIndex.actionPlan]),
				progressStatus: cleanText(rawRow[columnIndex.progressStatus]),
				deadlineText: cleanText(rawRow[columnIndex.deadlineText]),
				ownerName: cleanText(rawRow[columnIndex.ownerName]),
				note: cleanText(rawRow[columnIndex.note])
			}
		};

		if (!row.productName) {
			throw new Error(`Dòng ${row.rowNumber}: thiếu "Tên sản phẩm hỏng/lỗi" sau khi xử lý merged cells.`);
		}

		const hasDetail =
			row.defectRateText ||
			row.defectName ||
			row.actionPlan ||
			row.progressStatus ||
			row.deadlineText ||
			row.ownerName ||
			row.note;
		if (!hasDetail) continue;

		rows.push(row);
		previousContext = {
			stt: row.stt,
			productName: row.productName,
			customerName: row.customerName,
			steelGrade: row.steelGrade
		};
	}

	if (rows.length === 0) {
		throw new Error("Không đọc được dòng theo dõi lỗi chất lượng nào từ file Excel.");
	}

	return { sheetName: firstSheetName, rows };
}

function lineFingerprint(row: Pick<ParsedQualityIssueRow, "defectRateText" | "defectName" | "actionPlan" | "progressStatus" | "deadlineText" | "ownerName" | "note">) {
	return [
		normalizeQualityLookupText(row.defectRateText),
		normalizeQualityLookupText(row.defectName),
		normalizeQualityLookupText(row.actionPlan),
		normalizeQualityLookupText(row.progressStatus),
		normalizeQualityLookupText(row.deadlineText),
		normalizeQualityLookupText(row.ownerName),
		normalizeQualityLookupText(row.note)
	]
		.map((value) => value ?? "")
		.join("||");
}

type GroupState = {
	id?: string;
	productName: string;
	productNameNormalized: string;
	customerName: string | null;
	customerNameNormalized: string | null;
	steelGrade: string | null;
	lines: Array<{ id?: string; fingerprint: string }>;
	existing: boolean;
};

function findMatchingGroupState(
	groups: GroupState[],
	row: ParsedQualityIssueRow
) {
	const lookup = buildQualityGroupLookup(row);
	if (!lookup.productNameNormalized) return null;

	const exact = groups.find(
		(group) =>
			group.productNameNormalized === lookup.productNameNormalized &&
			group.customerNameNormalized === lookup.customerNameNormalized &&
			(group.steelGrade?.trim().toLowerCase() ?? null) === lookup.steelGradeNormalized
	);
	if (exact) return exact;

	if (lookup.customerNameNormalized) {
		const customerMatches = groups.filter(
			(group) => group.productNameNormalized === lookup.productNameNormalized && group.customerNameNormalized === lookup.customerNameNormalized
		);
		if (customerMatches.length === 1) return customerMatches[0]!;
	}

	const productMatches = groups.filter((group) => group.productNameNormalized === lookup.productNameNormalized);
	if (productMatches.length === 1) return productMatches[0]!;
	return null;
}

async function buildImportErrorsFile(errors: Array<{ rowNumber: number; message: string }>) {
	if (errors.length === 0) return null;
	const storage = new LocalStorageAdapter();
	const workbook = XLSX.utils.book_new();
	const worksheet = XLSX.utils.json_to_sheet(
		errors.map((error) => ({
			"Dòng Excel": error.rowNumber,
			"Lỗi": error.message
		}))
	);
	XLSX.utils.book_append_sheet(workbook, worksheet, "Loi");
	const outBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
	return storage.save(outBuffer, {
		originalName: `quality-issue-import-errors-${Date.now()}.xlsx`,
		mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	});
}

async function analyzeImportRows(rows: ParsedQualityIssueRow[], mode: QualityIssueImportMode) {
	const existingGroups = await prisma.qualityIssueGroup.findMany({
		where: { isActive: true },
		orderBy: [{ sortOrder: "asc" }],
		include: {
			lines: { orderBy: { lineOrder: "asc" } }
		}
	});
	const groupStates: GroupState[] = existingGroups.map((group) => ({
		id: group.id,
		productName: group.productName,
		productNameNormalized: group.productNameNormalized,
		customerName: group.customerName,
		customerNameNormalized: group.customerNameNormalized,
		steelGrade: group.steelGrade,
		existing: true,
		lines: group.lines.map((line) => ({
			id: line.id,
			fingerprint: lineFingerprint({
				defectRateText: line.defectRateText,
				defectName: line.defectName,
				actionPlan: line.actionPlan,
				progressStatus: line.progressStatus,
				deadlineText: line.deadlineText,
				ownerName: line.ownerName,
				note: line.note
			})
		}))
	}));

	const errors: Array<{ rowNumber: number; message: string }> = [];
	const items: ImportPreviewItem[] = [];
	const appendedExistingGroups = new Set<string>();
	let createdNewGroups = 0;
	let skippedRows = 0;

	for (const row of rows) {
		const group = findMatchingGroupState(groupStates, row);
		const fingerprint = lineFingerprint(row);

		if (!group) {
			const newGroup: GroupState = {
				productName: row.productName!,
				productNameNormalized: buildQualityGroupLookup(row).productNameNormalized!,
				customerName: row.customerName,
				customerNameNormalized: buildQualityGroupLookup(row).customerNameNormalized,
				steelGrade: row.steelGrade,
				existing: false,
				lines: [{ fingerprint }]
			};
			groupStates.push(newGroup);
			createdNewGroups += 1;
			items.push({
				rowNumber: row.rowNumber,
				action: "create_group",
				productName: row.productName,
				defectName: row.defectName,
				groupLabel: row.productName!,
				message: "Tạo nhóm sản phẩm mới."
			});
			continue;
		}

		const lineMatch = group.lines.find((line) => line.fingerprint === fingerprint);
		if (mode === "upsert" && lineMatch) {
			items.push({
				rowNumber: row.rowNumber,
				action: "update_line",
				productName: row.productName,
				defectName: row.defectName,
				groupLabel: group.productName,
				message: "Cập nhật dòng cũ trong nhóm hiện có."
			});
			continue;
		}

		if (mode === "append" && lineMatch) {
			skippedRows += 1;
			items.push({
				rowNumber: row.rowNumber,
				action: "skip",
				productName: row.productName,
				defectName: row.defectName,
				groupLabel: group.productName,
				message: "Dòng trùng nội dung trong cùng nhóm - bỏ qua."
			});
			continue;
		}

		group.lines.push({ fingerprint });
		if (group.id) appendedExistingGroups.add(group.id);
		items.push({
			rowNumber: row.rowNumber,
			action: "append_group",
			productName: row.productName,
			defectName: row.defectName,
			groupLabel: group.productName,
			message: group.existing ? "Thêm dòng mới vào nhóm sản phẩm cũ." : "Thêm dòng vào nhóm vừa tạo trong file import."
		});
	}

	return {
		errors,
		items,
		createdNewGroups,
		appendedExistingGroups: appendedExistingGroups.size,
		skippedRows
	};
}

export async function previewQualityIssueImport(options: {
	fileName: string;
	buffer: Buffer;
	mode: QualityIssueImportMode;
}) {
	const parsed = parseQualityIssueWorkbook(options.buffer);
	const analysis = await analyzeImportRows(parsed.rows, options.mode);
	return {
		sheetName: parsed.sheetName,
		totalRows: parsed.rows.length,
		validRows: parsed.rows.length - analysis.errors.length,
		createdNewGroups: analysis.createdNewGroups,
		appendedExistingGroups: analysis.appendedExistingGroups,
		skippedRows: analysis.skippedRows,
		errorRows: analysis.errors.length,
		errors: analysis.errors,
		items: analysis.items
	} satisfies QualityIssueImportPreview;
}

export async function commitQualityIssueImport(options: {
	fileName: string;
	buffer: Buffer;
	mode: QualityIssueImportMode;
	importedById: string | null;
}) {
	const { fileName, buffer, mode, importedById } = options;
	const parsed = parseQualityIssueWorkbook(buffer);
	const preview = await analyzeImportRows(parsed.rows, mode);

	const txResult = await prisma.$transaction(async (tx) => {
		const appendedGroupIds = new Set<string>();
		let createdNewGroups = 0;
		let successRows = 0;
		let skippedRows = preview.skippedRows;

		const importLog = await tx.qualityIssueImportLog.create({
			data: {
				fileName,
				importedById,
				totalRows: parsed.rows.length,
				successRows: 0,
				errorRows: preview.errors.length,
				createdNewGroups: 0,
				appendedExistingGroups: 0,
				skippedRows,
				mode,
				errorDetailJson: preview.errors
			}
		});

		for (const row of parsed.rows) {
			if (preview.errors.some((error) => error.rowNumber === row.rowNumber)) continue;

			let group = await findMatchingQualityIssueGroup(tx, row);
			if (!group) {
				group = await createQualityIssueGroup(tx, {
					productName: row.productName!,
					customerName: row.customerName,
					steelGrade: row.steelGrade,
					createdById: importedById
				});
				createdNewGroups += 1;
			}

			const existingLines = await tx.qualityIssueLine.findMany({
				where: { groupId: group.id },
				orderBy: [{ lineOrder: "asc" }]
			});
			const fingerprint = lineFingerprint(row);
			const duplicate = existingLines.find(
				(line) =>
					lineFingerprint({
						defectRateText: line.defectRateText,
						defectName: line.defectName,
						actionPlan: line.actionPlan,
						progressStatus: line.progressStatus,
						deadlineText: line.deadlineText,
						ownerName: line.ownerName,
						note: line.note
					}) === fingerprint
			);

			if (mode === "append" && duplicate) {
				skippedRows += 1;
				continue;
			}

			if (mode === "upsert" && duplicate) {
				await tx.qualityIssueLine.update({
					where: { id: duplicate.id },
					data: {
						defectRateText: row.defectRateText,
						defectName: row.defectName,
						actionPlan: row.actionPlan,
						progressStatus: row.progressStatus,
						deadlineText: row.deadlineText,
						ownerName: row.ownerName,
						note: row.note,
						styles: toPrismaNullableJson(row.styles),
						sourceType: "excel_import",
						importLogId: importLog.id
					}
				});
				if (group.id) appendedGroupIds.add(group.id);
				successRows += 1;
				continue;
			}

			const nextLineOrder = await getNextQualityLineOrder(tx, group.id);
			await tx.qualityIssueLine.create({
				data: {
					groupId: group.id,
					lineOrder: nextLineOrder,
					defectRateText: row.defectRateText,
					defectName: row.defectName,
					actionPlan: row.actionPlan,
					progressStatus: row.progressStatus,
					deadlineText: row.deadlineText,
					ownerName: row.ownerName,
					note: row.note,
					styles: toPrismaNullableJson(row.styles),
					sourceType: "excel_import",
					importLogId: importLog.id
				}
			});
			if (group.id) appendedGroupIds.add(group.id);
			successRows += 1;
		}

		return tx.qualityIssueImportLog.update({
			where: { id: importLog.id },
			data: {
				successRows,
				errorRows: preview.errors.length,
				createdNewGroups,
				appendedExistingGroups: appendedGroupIds.size,
				skippedRows,
				errorDetailJson: preview.errors
			}
		});
	});

	let errorFilePath: string | null = null;
	if (preview.errors.length > 0) {
		const stored = await buildImportErrorsFile(preview.errors);
		errorFilePath = stored?.path ?? null;
		await prisma.qualityIssueImportLog.update({
			where: { id: txResult.id },
			data: { errorFilePath }
		});
	}

	return {
		sheetName: parsed.sheetName,
		totalRows: parsed.rows.length,
		validRows: parsed.rows.length - preview.errors.length,
		createdNewGroups: txResult.createdNewGroups,
		appendedExistingGroups: txResult.appendedExistingGroups,
		skippedRows: txResult.skippedRows,
		errorRows: preview.errors.length,
		errors: preview.errors,
		items: preview.items,
		importLog: { id: txResult.id, errorFilePath },
		successRows: txResult.successRows
	} satisfies QualityIssueImportCommitResult;
}

export function buildQualityIssueTemplateWorkbookBuffer() {
	const workbook = XLSX.utils.book_new();
	const titleRow = ["CÁC HẠNG MỤC THEO DÕI HÀNG LỖI CHẤT LƯỢNG"];
	const headerRow = [
		"STT",
		"Tên sản phẩm hỏng/lỗi",
		"Khách hàng",
		"Mác thép",
		"Tỉ lệ hỏng & xử lý",
		"Tên lỗi (hỏng & xử lý)",
		"Biện pháp",
		"Tình trạng tiến độ",
		"Hạn định",
		"Phụ trách",
		"Ghi chú"
	];
	const exampleRows = [
		["1", "Cánh bơm", "QLTB", "Chịu nhiệt", "100%", "Sập khuôn", "Đang tìm hiểu", "Chưa", "Chưa", "Đại", ""],
		["2", "Srohr", "Z179", "Hợp kim", "100%", "Nứt", "Bổ sung thêm", "Chưa", "Chưa", "Bình", ""]
	];

	const dataSheet = XLSX.utils.aoa_to_sheet([titleRow, headerRow, ...exampleRows]);
	dataSheet["!merges"] = [XLSX.utils.decode_range("A1:K1")];
	dataSheet["!cols"] = [
		{ wch: 6 },
		{ wch: 30 },
		{ wch: 18 },
		{ wch: 16 },
		{ wch: 16 },
		{ wch: 24 },
		{ wch: 32 },
		{ wch: 22 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 24 }
	];

	const guideSheet = XLSX.utils.aoa_to_sheet([
		["Hướng dẫn"],
		["1. Có thể merge ô theo sản phẩm ở các cột STT / Tên sản phẩm hỏng/lỗi / Khách hàng / Mác thép."],
		["2. Hệ thống sẽ cố gắng giữ màu nền, chữ đỏ và chữ đậm ở các cột nội dung chính."],
		["3. Chỉ cần có Tên sản phẩm hỏng/lỗi để nhận diện nhóm; các cột chi tiết khác có thể để trống nếu chưa có dữ liệu."],
		["4. Nếu cùng sản phẩm nhiều dòng, khi import hệ thống sẽ thêm các dòng đó vào cùng một nhóm sản phẩm."]
	]);

	XLSX.utils.book_append_sheet(workbook, dataSheet, "Theo doi");
	XLSX.utils.book_append_sheet(workbook, guideSheet, "Huong dan");
	return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
