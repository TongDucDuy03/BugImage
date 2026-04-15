import * as XLSX from "xlsx";

export type ParsedImportRow = {
	rowNumber: number;
	stt: string | null;
	productName: string | null;
	customerName: string | null;
	materialCode: string | null;
	lotQuantity: number | null;
	okQuantity: number | null;
	okRate: number | null;
	repairQuantity: number | null;
	repairRate: number | null;
	defectName: string | null;
	scrapQuantity: number | null;
	scrapRate: number | null;
	scrapReason: string | null;
	workshop: string | null;
	note: string | null;
	rawData: Record<string, string | number | null>;
};

const KNOWN_HEADER_TOKENS = ["stt", "ten san pham", "khach hang", "tinh trang loi", "ghi chu"];
const DEFAULT_COLUMN_INDEX = {
	stt: 0,
	productName: 1,
	customerName: 2,
	materialCode: 3,
	lotQuantity: 4,
	okQuantity: 5,
	okRate: 6,
	repairQuantity: 7,
	repairRate: 8,
	defectName: 9,
	scrapQuantity: 10,
	scrapRate: 11,
	scrapReason: 12,
	workshop: 13,
	note: 14
} as const;

function normalizeText(input: unknown) {
	return String(input ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}

function cleanCell(input: unknown) {
	const value = String(input ?? "").replace(/\s+/g, " ").trim();
	return value || null;
}

function parseInteger(input: unknown) {
	const raw = cleanCell(input);
	if (!raw) return null;
	const sanitized = raw.replace(/[^0-9,.-]/g, "");
	if (!sanitized) return null;
	const normalized =
		sanitized.includes(",") && sanitized.includes(".")
			? sanitized.replace(/\./g, "").replace(",", ".")
			: sanitized.replace(",", ".");
	const parsed = Number(normalized);
	if (!Number.isFinite(parsed)) return null;
	return Math.round(parsed);
}

function parsePercent(input: unknown) {
	const raw = cleanCell(input);
	if (!raw) return null;
	const sanitized = raw.replace(/[^0-9,.-]/g, "");
	if (!sanitized) return null;
	const normalized =
		sanitized.includes(",") && sanitized.includes(".")
			? sanitized.replace(/\./g, "").replace(",", ".")
			: sanitized.replace(",", ".");
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function pickDefectLabel(row: Pick<ParsedImportRow, "defectName" | "scrapReason" | "note" | "productName">) {
	return row.defectName || row.scrapReason || row.note || row.productName || null;
}

function hasDailyReportRowContent(row: ParsedImportRow) {
	return !!(
		(row.productName && row.productName.trim()) ||
		(row.customerName && row.customerName.trim()) ||
		(row.defectName && row.defectName.trim()) ||
		(row.materialCode && row.materialCode.trim()) ||
		(row.workshop && row.workshop.trim()) ||
		(row.note && row.note.trim())
	);
}

function scoreHeaderRow(row: unknown[]) {
	const normalized = row.map((cell) => normalizeText(cell));
	return KNOWN_HEADER_TOKENS.reduce((score, token) => score + (normalized.some((cell) => cell.includes(token)) ? 1 : 0), 0);
}

function findHeaderRowIndex(matrix: unknown[][]) {
	let bestIndex = -1;
	let bestScore = -1;
	for (let index = 0; index < Math.min(matrix.length, 30); index += 1) {
		const score = scoreHeaderRow(matrix[index] ?? []);
		if (score > bestScore) {
			bestScore = score;
			bestIndex = index;
		}
	}
	if (bestScore < 2 || bestIndex < 0) {
		throw new Error("Không tìm thấy hàng tiêu đề hợp lệ trong file Excel.");
	}
	return bestIndex;
}

function looksLikeSubHeader(row: unknown[]) {
	const normalized = row.map((cell) => normalizeText(cell)).filter(Boolean);
	if (normalized.length === 0) return false;
	return normalized.some(
		(cell) =>
			cell.includes("so luong") ||
			cell === "%" ||
			cell.includes("tinh trang") ||
			cell.includes("ghi chu") ||
			cell.includes("phan xuong")
	);
}

function buildHeaders(headerRows: unknown[][]) {
	const width = Math.max(15, ...headerRows.map((row) => row.length));
	return Array.from({ length: width }, (_, columnIndex) => {
		const parts = headerRows
			.map((row) => cleanCell(row[columnIndex]))
			.filter((part, position, array) => Boolean(part) && array.indexOf(part) === position) as string[];
		return parts.join(" ").trim();
	});
}

function findColumnIndex(headers: string[], matchers: string[][], fallback: number) {
	const normalizedHeaders = headers.map((header) => normalizeText(header));
	for (let index = 0; index < normalizedHeaders.length; index += 1) {
		const header = normalizedHeaders[index];
		const matched = matchers.some((matcher) => matcher.every((token) => header.includes(token)));
		if (matched) return index;
	}
	return fallback;
}

function isMeaningfulRow(cells: unknown[]) {
	const values = cells.map((cell) => cleanCell(cell)).filter(Boolean) as string[];
	if (values.length === 0) return false;
	return values.some((value) => !KNOWN_HEADER_TOKENS.includes(normalizeText(value)));
}

export type ParseWorkbookOptions = {
	/** true: chỉ giữ dòng có “nhãn lỗi” (tên lỗi/ghi chú/SP…). false: dùng cho báo cáo ngày. */
	requireDefectLabel?: boolean;
};

export function parseWorkbook(buffer: Buffer, options?: ParseWorkbookOptions) {
	const requireDefectLabel = options?.requireDefectLabel !== false;
	const workbook = XLSX.read(buffer, {
		type: "buffer",
		cellDates: true,
		dense: false
	});
	const firstSheetName = workbook.SheetNames[0];
	if (!firstSheetName) {
		throw new Error("File Excel không có sheet nào.");
	}

	const sheet = workbook.Sheets[firstSheetName];
	const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
		header: 1,
		raw: false,
		defval: "",
		blankrows: false
	});
	const headerRowIndex = findHeaderRowIndex(matrix);
	const secondHeaderRow = matrix[headerRowIndex + 1] ?? [];
	const headerRows = looksLikeSubHeader(secondHeaderRow)
		? [matrix[headerRowIndex] ?? [], secondHeaderRow]
		: [matrix[headerRowIndex] ?? []];
	const dataStartIndex = headerRowIndex + headerRows.length;
	const headers = buildHeaders(headerRows);
	const columnIndex = {
		stt: findColumnIndex(headers, [["stt"]], DEFAULT_COLUMN_INDEX.stt),
		productName: findColumnIndex(headers, [["ten san pham"]], DEFAULT_COLUMN_INDEX.productName),
		customerName: findColumnIndex(headers, [["khach hang"]], DEFAULT_COLUMN_INDEX.customerName),
		materialCode: findColumnIndex(headers, [["mac thep"]], DEFAULT_COLUMN_INDEX.materialCode),
		lotQuantity: findColumnIndex(headers, [["so luong dan"], ["tong", "so luong"]], DEFAULT_COLUMN_INDEX.lotQuantity),
		okQuantity: findColumnIndex(headers, [["dat", "so luong"]], DEFAULT_COLUMN_INDEX.okQuantity),
		okRate: findColumnIndex(headers, [["dat", "%"]], DEFAULT_COLUMN_INDEX.okRate),
		repairQuantity: findColumnIndex(
			headers,
			[["xu ly", "so luong"], ["san pham xu ly", "so luong"]],
			DEFAULT_COLUMN_INDEX.repairQuantity
		),
		repairRate: findColumnIndex(
			headers,
			[["xu ly", "%"], ["san pham xu ly", "%"]],
			DEFAULT_COLUMN_INDEX.repairRate
		),
		defectName: findColumnIndex(headers, [["tinh trang loi"]], DEFAULT_COLUMN_INDEX.defectName),
		scrapQuantity: findColumnIndex(
			headers,
			[["hong", "so luong"], ["huy", "so luong"], ["san pham hong huy", "so luong"]],
			DEFAULT_COLUMN_INDEX.scrapQuantity
		),
		scrapRate: findColumnIndex(
			headers,
			[["hong", "%"], ["huy", "%"], ["san pham hong huy", "%"]],
			DEFAULT_COLUMN_INDEX.scrapRate
		),
		scrapReason: findColumnIndex(
			headers,
			[
				["tinh trang hong"],
				["tinh trang huy"],
				["trang thai hong"],
				["trang thai huy"],
				["ghi chu", "hong"]
			],
			DEFAULT_COLUMN_INDEX.scrapReason
		),
		workshop: findColumnIndex(headers, [["phan xuong"], ["xuong", "bc"]], DEFAULT_COLUMN_INDEX.workshop),
		note: findColumnIndex(headers, [["ghi chu"]], DEFAULT_COLUMN_INDEX.note)
	};

	const rows: ParsedImportRow[] = [];
	let previousContext: Partial<ParsedImportRow> = {};

	for (let rowIndex = dataStartIndex; rowIndex < matrix.length; rowIndex += 1) {
		const rawRow = matrix[rowIndex] ?? [];
		if (!isMeaningfulRow(rawRow)) continue;

		const parsedRow: ParsedImportRow = {
			rowNumber: rowIndex + 1,
			stt: cleanCell(rawRow[columnIndex.stt]) ?? previousContext.stt ?? null,
			productName: cleanCell(rawRow[columnIndex.productName]) ?? previousContext.productName ?? null,
			customerName: cleanCell(rawRow[columnIndex.customerName]) ?? previousContext.customerName ?? null,
			materialCode: cleanCell(rawRow[columnIndex.materialCode]) ?? previousContext.materialCode ?? null,
			lotQuantity: parseInteger(rawRow[columnIndex.lotQuantity]) ?? previousContext.lotQuantity ?? null,
			okQuantity: parseInteger(rawRow[columnIndex.okQuantity]),
			okRate: parsePercent(rawRow[columnIndex.okRate]),
			repairQuantity: parseInteger(rawRow[columnIndex.repairQuantity]),
			repairRate: parsePercent(rawRow[columnIndex.repairRate]),
			defectName: cleanCell(rawRow[columnIndex.defectName]),
			scrapQuantity: parseInteger(rawRow[columnIndex.scrapQuantity]),
			scrapRate: parsePercent(rawRow[columnIndex.scrapRate]),
			scrapReason: cleanCell(rawRow[columnIndex.scrapReason]),
			workshop: cleanCell(rawRow[columnIndex.workshop]) ?? previousContext.workshop ?? null,
			note: cleanCell(rawRow[columnIndex.note]),
			rawData: {
				stt: cleanCell(rawRow[columnIndex.stt]),
				productName: cleanCell(rawRow[columnIndex.productName]),
				customerName: cleanCell(rawRow[columnIndex.customerName]),
				materialCode: cleanCell(rawRow[columnIndex.materialCode]),
				lotQuantity: parseInteger(rawRow[columnIndex.lotQuantity]),
				okQuantity: parseInteger(rawRow[columnIndex.okQuantity]),
				okRate: parsePercent(rawRow[columnIndex.okRate]),
				repairQuantity: parseInteger(rawRow[columnIndex.repairQuantity]),
				repairRate: parsePercent(rawRow[columnIndex.repairRate]),
				defectName: cleanCell(rawRow[columnIndex.defectName]),
				scrapQuantity: parseInteger(rawRow[columnIndex.scrapQuantity]),
				scrapRate: parsePercent(rawRow[columnIndex.scrapRate]),
				scrapReason: cleanCell(rawRow[columnIndex.scrapReason]),
				workshop: cleanCell(rawRow[columnIndex.workshop]),
				note: cleanCell(rawRow[columnIndex.note])
			}
		};

		if (requireDefectLabel) {
			if (!pickDefectLabel(parsedRow)) continue;
		} else if (!hasDailyReportRowContent(parsedRow)) {
			continue;
		}

		rows.push(parsedRow);
		previousContext = {
			stt: parsedRow.stt,
			productName: parsedRow.productName,
			customerName: parsedRow.customerName,
			materialCode: parsedRow.materialCode,
			lotQuantity: parsedRow.lotQuantity,
			workshop: parsedRow.workshop
		};
	}

	if (rows.length === 0) {
		throw new Error("Không đọc được dòng lỗi nào từ file Excel.");
	}

	return {
		sheetName: firstSheetName,
		rows
	};
}
