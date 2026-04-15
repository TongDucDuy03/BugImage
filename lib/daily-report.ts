import type { Session } from "@/lib/auth";

export function calcRate(part: number | null | undefined, whole: number | null | undefined): number | null {
	if (part == null || whole == null || whole === 0) return null;
	return Math.round((part / whole) * 10000) / 100;
}

export function normalizeKeyPart(input: string | null | undefined) {
	return String(input ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}

/** Khóa chống trùng theo nghiệp vụ: cùng SP + KH + mác + tình trạng lỗi + phân xưởng */
export function lineDuplicateFingerprint(line: {
	productName?: string | null;
	customerName?: string | null;
	steelGrade?: string | null;
	defectStatus?: string | null;
	workshopName?: string | null;
}) {
	return [
		normalizeKeyPart(line.productName),
		normalizeKeyPart(line.customerName),
		normalizeKeyPart(line.steelGrade),
		normalizeKeyPart(line.defectStatus),
		normalizeKeyPart(line.workshopName)
	].join("\x1f");
}

export function canEditDailyReport(session: Session, status: string): boolean {
	if (status !== "finalized") return true;
	return session.role === "admin";
}

export type LineNumericFields = {
	inspectedQty: number | null;
	passedQty: number | null;
	processedQty: number | null;
	scrapQty: number | null;
	passedRate: number | null;
	processedRate: number | null;
	scrapRate: number | null;
};

export function enrichComputedRates<T extends LineNumericFields>(line: T): T {
	const passedRate = line.passedRate ?? calcRate(line.passedQty, line.inspectedQty);
	const processedRate = line.processedRate ?? calcRate(line.processedQty, line.inspectedQty);
	const scrapRate = line.scrapRate ?? calcRate(line.scrapQty, line.inspectedQty);
	return { ...line, passedRate, processedRate, scrapRate };
}
