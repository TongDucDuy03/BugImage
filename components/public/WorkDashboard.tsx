"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addLocalDays, localDateYMD } from "@/lib/date-local";

type LineItem = {
	id: string;
	lineNo: number;
	productName: string | null;
	customerName: string | null;
	steelGrade: string | null;
	inspectedQty: number | null;
	passedQty: number | null;
	passedRate: number | null;
	processedQty: number | null;
	processedRate: number | null;
	defectStatus: string | null;
	scrapQty: number | null;
	scrapRate: number | null;
	scrapStatus: string | null;
	workshopName: string | null;
	note: string | null;
	dailyReport: { id: string; reportDate: string; status: string; reportCode: string | null };
};

type ApiResponse = {
	items: LineItem[];
	stats: {
		rows: number;
		inspected: number;
		passed: number;
		processed: number;
		scrap: number;
		topDefects: Array<{ name: string; count: number }>;
		topProducts: Array<{ name: string; count: number }>;
	};
};

function formatDateLabel(iso: string) {
	return new Date(iso).toLocaleDateString("vi-VN");
}

function fmtPct(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return "—";
	return `${value}%`;
}

function fmtNum(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return "—";
	return String(value);
}

const dashboardColumnWidths = [
	"120px",
	"64px",
	"230px",
	"165px",
	"120px",
	"125px",
	"95px",
	"72px",
	"105px",
	"72px",
	"250px",
	"105px",
	"80px",
	"230px",
	"145px",
	"280px"
];

const dashboardHeaderMerged =
	"border border-slate-200 px-3 py-2 align-middle text-[11px] font-semibold uppercase tracking-wide text-slate-700";
const dashboardHeaderGroup =
	"border border-slate-200 px-3 py-2 text-center align-middle text-[11px] font-semibold uppercase tracking-wide text-slate-800";
const dashboardHeaderSub =
	"border border-slate-200 px-2 py-1.5 text-center align-middle text-[11px] font-semibold text-slate-700";
const dashboardTdBase = "border border-slate-200 px-3 py-2 align-top";
const dashboardTdCenter = `${dashboardTdBase} text-center tabular-nums`;
const dashboardTdWrap = `${dashboardTdBase} whitespace-normal break-words`;
const dashboardGroupStart = "border-l-2";
const dashboardGroupEnd = "border-r-2";

export function WorkDashboard() {
	const today = useMemo(() => localDateYMD(), []);
	const defaultFrom = useMemo(() => localDateYMD(addLocalDays(new Date(), -30)), []);

	const [from, setFrom] = useState(defaultFrom);
	const [to, setTo] = useState(today);
	const [customer, setCustomer] = useState("");
	const [product, setProduct] = useState("");
	const [steelGrade, setSteelGrade] = useState("");
	const [defectStatus, setDefectStatus] = useState("");
	const [scrapStatus, setScrapStatus] = useState("");
	const [workshop, setWorkshop] = useState("");
	const [onlyScrap, setOnlyScrap] = useState(false);
	const [noImproveNote, setNoImproveNote] = useState(false);
	const [q, setQ] = useState("");
	const [groupByDay, setGroupByDay] = useState(true);

	const [data, setData] = useState<ApiResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		const params = new URLSearchParams();
		if (from) params.set("from", from);
		if (to) params.set("to", to);
		if (customer.trim()) params.set("customer", customer.trim());
		if (product.trim()) params.set("product", product.trim());
		if (steelGrade.trim()) params.set("steelGrade", steelGrade.trim());
		if (defectStatus.trim()) params.set("defectStatus", defectStatus.trim());
		if (scrapStatus.trim()) params.set("scrapStatus", scrapStatus.trim());
		if (workshop.trim()) params.set("workshop", workshop.trim());
		if (onlyScrap) params.set("onlyScrap", "1");
		if (noImproveNote) params.set("noImproveNote", "1");
		if (q.trim()) params.set("q", q.trim());

		const res = await fetch(`/api/public/daily-report-lines?${params.toString()}`);
		if (!res.ok) {
			setError("Không tải được dữ liệu.");
			setLoading(false);
			return;
		}
		const json = (await res.json()) as ApiResponse;
		setData(json);
		setLoading(false);
	}, [from, to, customer, product, steelGrade, defectStatus, scrapStatus, workshop, onlyScrap, noImproveNote, q]);

	useEffect(() => {
		void load();
	}, [load]);

	const grouped = useMemo(() => {
		if (!data?.items) return [];
		if (!groupByDay) return [{ key: "all", label: "Tất cả", items: data.items }];
		const map = new Map<string, LineItem[]>();
		for (const row of data.items) {
			const key = row.dailyReport.reportDate.slice(0, 10);
			const list = map.get(key) ?? [];
			list.push(row);
			map.set(key, list);
		}
		return [...map.entries()]
			.sort((a, b) => (a[0] < b[0] ? 1 : -1))
			.map(([key, items]) => ({ key, label: formatDateLabel(items[0]!.dailyReport.reportDate), items }));
	}, [data, groupByDay]);

	return (
		<div className="min-h-screen bg-bg">
			<header className="border-b border-bg-muted bg-bg-soft">
				<div className="mx-auto w-full max-w-none px-4 py-6 sm:px-6 lg:px-10">
					<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Dashboard lỗi hàng ngày</h1>
						<p className="text-sm text-text-muted">Lọc theo điều kiện — dữ liệu từ báo cáo đã nhập.</p>
					</div>
					<div className="flex flex-wrap gap-2 text-sm">
						<Link className="rounded-xl border border-bg-muted px-3 py-2 hover:bg-bg-muted/50" href="/tv">
							Màn hình TV
						</Link>
						<Link className="rounded-xl bg-primary px-3 py-2 font-medium text-primary-foreground hover:opacity-95" href="/admin/reports">
							Quản trị / nhập liệu
						</Link>
					</div>
					</div>
				</div>
			</header>

			<div className="mx-auto w-full max-w-none space-y-6 px-4 py-8 sm:px-6 lg:px-10">
				<section className="card grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
					<label className="text-sm">
						<span className="text-text-muted">Từ ngày</span>
						<input className="mt-1 w-full rounded-xl border border-bg-muted px-3 py-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
					</label>
					<label className="text-sm">
						<span className="text-text-muted">Đến ngày</span>
						<input className="mt-1 w-full rounded-xl border border-bg-muted px-3 py-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
					</label>
					<label className="text-sm md:col-span-2">
						<span className="text-text-muted">Tìm nhanh (ô chung)</span>
						<input
							className="mt-1 w-full rounded-xl border border-bg-muted px-3 py-2"
							placeholder="SP, KH, ghi chú..."
							value={q}
							onChange={(e) => setQ(e.target.value)}
						/>
					</label>
					<label className="text-sm">
						<span className="text-text-muted">Khách hàng</span>
						<input className="mt-1 w-full rounded-xl border border-bg-muted px-3 py-2" value={customer} onChange={(e) => setCustomer(e.target.value)} />
					</label>
					<label className="text-sm">
						<span className="text-text-muted">Sản phẩm</span>
						<input className="mt-1 w-full rounded-xl border border-bg-muted px-3 py-2" value={product} onChange={(e) => setProduct(e.target.value)} />
					</label>
					<label className="text-sm">
						<span className="text-text-muted">Mác thép</span>
						<input className="mt-1 w-full rounded-xl border border-bg-muted px-3 py-2" value={steelGrade} onChange={(e) => setSteelGrade(e.target.value)} />
					</label>
					<label className="text-sm">
						<span className="text-text-muted">Tình trạng lỗi</span>
						<input className="mt-1 w-full rounded-xl border border-bg-muted px-3 py-2" value={defectStatus} onChange={(e) => setDefectStatus(e.target.value)} />
					</label>
					<label className="text-sm">
						<span className="text-text-muted">Tình trạng hỏng</span>
						<input className="mt-1 w-full rounded-xl border border-bg-muted px-3 py-2" value={scrapStatus} onChange={(e) => setScrapStatus(e.target.value)} />
					</label>
					<label className="text-sm">
						<span className="text-text-muted">Phân xưởng</span>
						<input className="mt-1 w-full rounded-xl border border-bg-muted px-3 py-2" value={workshop} onChange={(e) => setWorkshop(e.target.value)} />
					</label>
					<label className="flex items-center gap-2 text-sm md:col-span-2">
						<input type="checkbox" checked={onlyScrap} onChange={(e) => setOnlyScrap(e.target.checked)} />
						Chỉ dòng có hỏng/hủy (&gt;0)
					</label>
					<label className="flex items-center gap-2 text-sm md:col-span-2">
						<input type="checkbox" checked={noImproveNote} onChange={(e) => setNoImproveNote(e.target.checked)} />
						Ghi chú chứa “không cải thiện”
					</label>
					<label className="flex items-center gap-2 text-sm md:col-span-2">
						<input type="checkbox" checked={groupByDay} onChange={(e) => setGroupByDay(e.target.checked)} />
						Group theo ngày
					</label>
					<div className="flex items-end md:col-span-2">
						<button type="button" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" onClick={() => void load()}>
							Áp dụng lọc
						</button>
					</div>
				</section>

				{error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}

				{data ? (
					<section className="grid gap-4 lg:grid-cols-[1fr_320px]">
						<div className="card overflow-auto">
							<div className="border-b border-bg-muted px-4 py-3 text-sm font-medium">Danh sách lỗi</div>
							<div className="max-h-[70vh] overflow-auto">
								{loading ? <div className="p-6 text-sm text-text-muted">Đang tải…</div> : null}
								{!loading &&
									grouped.map((group) => (
										<div key={group.key}>
											{groupByDay ? (
												<div className="sticky top-0 z-20 bg-bg-muted/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted backdrop-blur">
													{group.label}
												</div>
											) : null}
											<table className="min-w-[2240px] w-full table-fixed border-collapse text-xs">
												<colgroup>
													{dashboardColumnWidths.map((width, index) => (
														<col key={index} style={{ width }} />
													))}
												</colgroup>
												<thead className={`${groupByDay ? "sticky top-8" : "sticky top-0"} z-10 bg-white text-slate-700 shadow-sm`}>
													<tr>
														<th rowSpan={2} className={`${dashboardHeaderMerged} bg-slate-100 text-center`}>
															Ngày
														</th>
														<th rowSpan={2} className={`${dashboardHeaderMerged} bg-slate-100 text-center`}>
															STT
														</th>
														<th rowSpan={2} className={`${dashboardHeaderMerged} bg-slate-100 text-left`}>
															Tên sản phẩm
														</th>
														<th rowSpan={2} className={`${dashboardHeaderMerged} bg-slate-100 text-left`}>
															Khách hàng
														</th>
														<th rowSpan={2} className={`${dashboardHeaderMerged} bg-slate-100 text-center`}>
															Mác thép
														</th>
														<th rowSpan={2} className={`${dashboardHeaderMerged} bg-slate-100 text-center`}>
															Số lượng đánh giá
														</th>
														<th
															colSpan={2}
															className={`${dashboardHeaderGroup} border-l-2 border-r-2 border-l-emerald-300 border-r-emerald-300 bg-emerald-100`}
														>
															Đạt
														</th>
														<th
															colSpan={3}
															className={`${dashboardHeaderGroup} border-l-2 border-r-2 border-l-amber-300 border-r-amber-300 bg-amber-100`}
														>
															Sản phẩm xử lý
														</th>
														<th
															colSpan={3}
															className={`${dashboardHeaderGroup} border-l-2 border-r-2 border-l-rose-300 border-r-rose-300 bg-rose-100`}
														>
															Sản phẩm hỏng/Hủy
														</th>
														<th rowSpan={2} className={`${dashboardHeaderMerged} border-l-2 border-l-sky-300 bg-sky-100 text-center`}>
															Phân xưởng BC
														</th>
														<th rowSpan={2} className={`${dashboardHeaderMerged} border-r-2 border-r-sky-300 bg-sky-100 text-left`}>
															Ghi chú
														</th>
													</tr>
													<tr>
														<th className={`${dashboardHeaderSub} border-l-2 border-l-emerald-300 bg-emerald-50`}>Số lượng</th>
														<th className={`${dashboardHeaderSub} border-r-2 border-r-emerald-300 bg-emerald-50`}>%</th>
														<th className={`${dashboardHeaderSub} border-l-2 border-l-amber-300 bg-amber-50`}>Số lượng</th>
														<th className={`${dashboardHeaderSub} bg-amber-50`}>%</th>
														<th className={`${dashboardHeaderSub} border-r-2 border-r-amber-300 bg-amber-50 text-left`}>Tình trạng lỗi</th>
														<th className={`${dashboardHeaderSub} border-l-2 border-l-rose-300 bg-rose-50`}>Số lượng</th>
														<th className={`${dashboardHeaderSub} bg-rose-50`}>%</th>
														<th className={`${dashboardHeaderSub} border-r-2 border-r-rose-300 bg-rose-50 text-left`}>Tình trạng hỏng</th>
													</tr>
												</thead>
												<tbody>
													{group.items.map((row, rowIndex) => (
														<tr key={row.id} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
															<td className={`${dashboardTdBase} whitespace-nowrap bg-slate-50 text-center`}>{formatDateLabel(row.dailyReport.reportDate)}</td>
															<td className={`${dashboardTdCenter} bg-slate-50`}>{fmtNum(row.lineNo)}</td>
															<td className={`${dashboardTdWrap} bg-slate-50 font-medium text-slate-950`}>{row.productName ?? "—"}</td>
															<td className={`${dashboardTdWrap} bg-slate-50`}>{row.customerName ?? "—"}</td>
															<td className={`${dashboardTdWrap} bg-slate-50 text-center`}>{row.steelGrade ?? "—"}</td>
															<td className={`${dashboardTdCenter} bg-slate-50`}>{fmtNum(row.inspectedQty)}</td>
															<td className={`${dashboardTdCenter} ${dashboardGroupStart} border-l-emerald-300 bg-emerald-50 text-emerald-950`}>
																{fmtNum(row.passedQty)}
															</td>
															<td className={`${dashboardTdCenter} ${dashboardGroupEnd} border-r-emerald-300 bg-emerald-50 text-emerald-950`}>
																{fmtPct(row.passedRate)}
															</td>
															<td className={`${dashboardTdCenter} ${dashboardGroupStart} border-l-amber-300 bg-amber-50 text-amber-950`}>
																{fmtNum(row.processedQty)}
															</td>
															<td className={`${dashboardTdCenter} bg-amber-50 text-amber-950`}>{fmtPct(row.processedRate)}</td>
															<td className={`${dashboardTdWrap} ${dashboardGroupEnd} border-r-amber-300 bg-amber-50 text-amber-950`}>
																{row.defectStatus ?? "—"}
															</td>
															<td className={`${dashboardTdCenter} ${dashboardGroupStart} border-l-rose-300 bg-rose-50 text-rose-950`}>
																{fmtNum(row.scrapQty)}
															</td>
															<td className={`${dashboardTdCenter} bg-rose-50 text-rose-950`}>{fmtPct(row.scrapRate)}</td>
															<td className={`${dashboardTdWrap} ${dashboardGroupEnd} border-r-rose-300 bg-rose-50 text-rose-950`}>
																{row.scrapStatus ?? "—"}
															</td>
															<td className={`${dashboardTdWrap} ${dashboardGroupStart} border-l-sky-300 bg-sky-50 text-sky-950`}>
																{row.workshopName ?? "—"}
															</td>
															<td className={`${dashboardTdWrap} ${dashboardGroupEnd} border-r-sky-300 bg-sky-50`} title={row.note ?? ""}>
																{row.note ?? "—"}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									))}
							</div>
						</div>

						<aside className="space-y-4">
							<div className="card p-4">
								<div className="text-sm font-semibold">Thống kê nhanh</div>
								<dl className="mt-3 space-y-2 text-sm">
									<div className="flex justify-between gap-2">
										<dt className="text-text-muted">Tổng dòng</dt>
										<dd className="font-medium">{data.stats.rows}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-text-muted">Tổng SL đánh giá</dt>
										<dd className="font-medium">{data.stats.inspected}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-text-muted">Tổng đạt</dt>
										<dd className="font-medium">{data.stats.passed}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-text-muted">Tổng xử lý</dt>
										<dd className="font-medium">{data.stats.processed}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-text-muted">Tổng hỏng/hủy</dt>
										<dd className="font-medium">{data.stats.scrap}</dd>
									</div>
								</dl>
							</div>
							<div className="card p-4">
								<div className="text-sm font-semibold">Top 5 tình trạng lỗi</div>
								<ol className="mt-3 list-decimal space-y-1 pl-4 text-sm">
									{data.stats.topDefects.map((t) => (
										<li key={t.name}>
											{t.name}{" "}
											<span className="text-text-muted">
												({t.count})
											</span>
										</li>
									))}
								</ol>
							</div>
							<div className="card p-4">
								<div className="text-sm font-semibold">Top 5 sản phẩm</div>
								<ol className="mt-3 list-decimal space-y-1 pl-4 text-sm">
									{data.stats.topProducts.map((t) => (
										<li key={t.name}>
											{t.name}{" "}
											<span className="text-text-muted">
												({t.count})
											</span>
										</li>
									))}
								</ol>
							</div>
						</aside>
					</section>
				) : null}
			</div>
		</div>
	);
}
