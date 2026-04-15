/** Ngày theo lịch máy (không dùng UTC như toISOString) — tránh lệch ngày khi lọc báo cáo. */
export function localDateYMD(d: Date = new Date()): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function addLocalDays(base: Date, deltaDays: number): Date {
	const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays);
	return d;
}
