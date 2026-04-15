import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import { parseWorkbook, type ParsedImportRow } from "@/lib/excel-daily-parse";
import { prisma } from "@/lib/db";
import { calcRate, enrichComputedRates, lineDuplicateFingerprint } from "@/lib/daily-report";
import { LocalStorageAdapter } from "@/lib/storage/local";

export type ImportMode = "new" | "append" | "replace";

function mapParsedRowToLineData(row: ParsedImportRow): Omit<Prisma.DailyReportLineCreateManyInput, "dailyReportId" | "lineNo"> {
	const inspectedQty = row.lotQuantity;
	const passedQty = row.okQuantity;
	const processedQty = row.repairQuantity;
	const scrapQty = row.scrapQuantity;
	const base = {
		productName: row.productName,
		customerName: row.customerName,
		steelGrade: row.materialCode,
		inspectedQty,
		passedQty,
		passedRate: row.okRate ?? calcRate(passedQty, inspectedQty),
		processedQty,
		processedRate: row.repairRate ?? calcRate(processedQty, inspectedQty),
		defectStatus: row.defectName,
		scrapQty,
		scrapRate: row.scrapRate ?? calcRate(scrapQty, inspectedQty),
		scrapStatus: row.scrapReason,
		workshopName: row.workshop,
		note: row.note,
		sourceType: "excel"
	};
	return enrichComputedRates(base) as Omit<Prisma.DailyReportLineCreateManyInput, "dailyReportId" | "lineNo">;
}

function validateLineData(
	data: ReturnType<typeof mapParsedRowToLineData>,
	rowNumber: number
): string | null {
	if (data.inspectedQty != null && data.inspectedQty < 0) return `Dòng ${rowNumber}: Số lượng đánh không hợp lệ.`;
	if (data.passedQty != null && data.passedQty < 0) return `Dòng ${rowNumber}: Số lượng đạt không hợp lệ.`;
	if (data.processedQty != null && data.processedQty < 0) return `Dòng ${rowNumber}: Số lượng xử lý không hợp lệ.`;
	if (data.scrapQty != null && data.scrapQty < 0) return `Dòng ${rowNumber}: Số lượng hỏng/hủy không hợp lệ.`;
	return null;
}

type ImportResult = {
	importLog: { id: string; errorFilePath: string | null };
	successRows: number;
	errorRows: number;
	skippedDuplicates: number;
	errors: Array<{ rowNumber: number; message: string }>;
};

export async function importExcelIntoDailyReport(options: {
	dailyReportId: string;
	fileName: string;
	buffer: Buffer;
	mode: ImportMode;
	importedById: string | null;
	allowReplace: boolean;
}): Promise<ImportResult> {
	const { dailyReportId, fileName, buffer, mode, importedById, allowReplace } = options;

	const parsed = parseWorkbook(buffer, { requireDefectLabel: false });
	const storage = new LocalStorageAdapter();

	const report = await prisma.dailyReport.findUnique({
		where: { id: dailyReportId },
		select: {
			id: true,
			_count: { select: { lines: true } }
		}
	});
	if (!report) {
		throw new Error("Không tìm thấy báo cáo.");
	}

	if (mode === "replace" && !allowReplace) {
		throw new Error("Chỉ tài khoản quản trị mới được import ghi đè.");
	}
	if (mode === "new" && report._count.lines > 0) {
		throw new Error("Báo cáo đã có dòng chi tiết — không thể import kiểu tạo mới toàn bộ.");
	}
	if (mode === "append" && report._count.lines === 0) {
		// Cho phép: coi như thêm vào báo cáo trống
	}

	const errors: Array<{ rowNumber: number; message: string }> = [];
	let skippedDuplicates = 0;

	const result = await prisma.$transaction(async (tx) => {
		if (mode === "replace") {
			await tx.dailyReportLine.deleteMany({ where: { dailyReportId } });
		}

		const existingLines =
			mode === "replace"
				? []
				: await tx.dailyReportLine.findMany({
						where: { dailyReportId },
						select: {
							productName: true,
							customerName: true,
							steelGrade: true,
							defectStatus: true,
							workshopName: true
						}
					});

		const fingerprintSet = new Set(existingLines.map((line) => lineDuplicateFingerprint(line)));

		let maxLine = await tx.dailyReportLine.aggregate({
			where: { dailyReportId },
			_max: { lineNo: true }
		});
		let nextLineNo = (maxLine._max.lineNo ?? 0) + 1;

		let successRows = 0;

		for (const row of parsed.rows) {
			const data = mapParsedRowToLineData(row);
			const validationError = validateLineData(data, row.rowNumber);
			if (validationError) {
				errors.push({ rowNumber: row.rowNumber, message: validationError });
				continue;
			}

			const fp = lineDuplicateFingerprint({
				productName: data.productName,
				customerName: data.customerName,
				steelGrade: data.steelGrade,
				defectStatus: data.defectStatus,
				workshopName: data.workshopName
			});

			if (fingerprintSet.has(fp)) {
				skippedDuplicates += 1;
				errors.push({
					rowNumber: row.rowNumber,
					message: "Trùng dữ liệu (cùng sản phẩm/khách/mác/lỗi/xưởng) — bỏ qua."
				});
				continue;
			}

			await tx.dailyReportLine.create({
				data: {
					dailyReportId,
					lineNo: nextLineNo,
					...data
				}
			});
			fingerprintSet.add(fp);
			nextLineNo += 1;
			successRows += 1;
		}

		let errorFilePath: string | null = null;
		if (errors.length > 0) {
			const sheetRows = errors.map((e) => ({
				"Dòng Excel": e.rowNumber,
				"Lỗi": e.message
			}));
			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.json_to_sheet(sheetRows);
			XLSX.utils.book_append_sheet(wb, ws, "Loi");
			const outBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
			const stored = await storage.save(outBuffer, {
				originalName: `import-loi-${dailyReportId.slice(-8)}.xlsx`,
				mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
			});
			errorFilePath = stored.path;
		}

		const importLog = await tx.importLog.create({
			data: {
				fileName,
				importedById,
				dailyReportId,
				totalRows: parsed.rows.length,
				successRows,
				errorRows: errors.length,
				errorFilePath
			}
		});

		return { importLog, successRows, errorRows: errors.length };
	});

	return {
		importLog: { id: result.importLog.id, errorFilePath: result.importLog.errorFilePath },
		successRows: result.successRows,
		errorRows: result.errorRows,
		skippedDuplicates,
		errors
	};
}

/** Ghi file mẫu Excel (cột theo template hiện có) — trả về buffer */
export function buildTemplateWorkbookBuffer(): Buffer {
	const headers = [
		"STT",
		"Tên sản phẩm",
		"Khách hàng",
		"Mác thép",
		"Số lượng đánh",
		"Đạt SL",
		"Đạt %",
		"Xử lý SL",
		"Xử lý %",
		"Tình trạng lỗi",
		"Hỏng/Hủy SL",
		"Hỏng/Hủy %",
		"Tình trạng hỏng",
		"Phân xưởng",
		"Ghi chú"
	];
	const wb = XLSX.utils.book_new();
	const ws = XLSX.utils.aoa_to_sheet([headers]);
	XLSX.utils.book_append_sheet(wb, ws, "Bao cao");
	return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
