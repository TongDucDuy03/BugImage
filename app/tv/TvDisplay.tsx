"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { addLocalDays, localDateYMD } from "@/lib/date-local";

type LineItem = {
	id: string;
	lineNo: number;
	productName: string | null;
	customerName: string | null;
	steelGrade: string | null;
	inspectedQty: number | null;
	passedQty: number | null;
	defectStatus: string | null;
	passedRate: number | null;
	processedQty: number | null;
	processedRate: number | null;
	scrapQty: number | null;
	scrapRate: number | null;
	scrapStatus: string | null;
	workshopName: string | null;
	note: string | null;
	dailyReport: { reportDate: string };
};

type ApiResponse = {
	items: LineItem[];
	stats: {
		rows: number;
		scrap: number;
		topDefects: Array<{ name: string; count: number }>;
		topProducts: Array<{ name: string; count: number }>;
	};
};

function fmtPct(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return "—";
	return `${value}%`;
}

function fmtNum(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return "—";
	return String(value);
}

const tvColumnWidths = [
	"125px",
	"68px",
	"270px",
	"190px",
	"135px",
	"130px",
	"105px",
	"82px",
	"115px",
	"82px",
	"300px",
	"115px",
	"90px",
	"270px",
	"155px",
	"320px"
];

const headerMerged =
	"border border-white/15 px-3 py-2 align-middle text-[0.72em] font-semibold uppercase tracking-wide text-slate-100";
const headerGroup =
	"border border-white/15 px-3 py-2 text-center align-middle text-[0.72em] font-semibold uppercase tracking-wide text-white";
const headerSub =
	"border border-white/15 px-2 py-1.5 text-center align-middle text-[0.72em] font-semibold text-slate-100";
const tdBase = "border border-white/10 px-3 py-2 align-top";
const tdCenter = `${tdBase} text-center tabular-nums`;
const tdWrap = `${tdBase} whitespace-normal break-words`;
const tdGroupStart = "border-l-2";
const tdGroupEnd = "border-r-2";

export function TvDisplay() {
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const [items, setItems] = useState<LineItem[]>([]);
	const [stats, setStats] = useState<ApiResponse["stats"] | null>(null);
	const [clock, setClock] = useState(() => new Date());
	const [layout] = useState<"table" | "summary">("table");
	const [config, setConfig] = useState({
		scrollPxPerTick: 0.8,
		pauseMs: 3000,
		refreshSec: 120,
		range: "week" as "today" | "week"
	});

	useEffect(() => {
		const p = new URLSearchParams(window.location.search);
		setConfig({
			scrollPxPerTick: Number(p.get("speed") ?? "0.8") || 0.8,
			pauseMs: Number(p.get("pause") ?? "3000") || 3000,
			refreshSec: Number(p.get("refresh") ?? "120") || 120,
			range: p.get("range") === "today" ? "today" : "week"
		});
	}, []);

	const { scrollPxPerTick, pauseMs, refreshSec, range } = config;

	const load = useCallback(async () => {
		const params = new URLSearchParams();
		const to = localDateYMD();
		if (range === "today") {
			params.set("from", to);
		} else {
			params.set("from", localDateYMD(addLocalDays(new Date(), -30)));
		}
		params.set("to", to);
		params.set("tv", "1");
		const res = await fetch(`/api/public/daily-report-lines?${params.toString()}`);
		if (!res.ok) return;
		const data = (await res.json()) as ApiResponse;
		setItems(data.items);
		setStats(data.stats);
	}, [range]);

	useEffect(() => {
		void load();
		const id = window.setInterval(() => void load(), refreshSec * 1000);
		return () => window.clearInterval(id);
	}, [load, refreshSec]);

	useEffect(() => {
		const id = window.setInterval(() => setClock(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	useEffect(() => {
		const el = scrollerRef.current;
		if (!el || layout !== "table") return;

		let raf = 0;
		let pauseUntil = 0;
		let position = 0; // ← tích lũy float ở đây, không dùng scrollTop trực tiếp

		el.scrollTo({ top: 0 });

		const tick = () => {
			const now = performance.now();
			if (now < pauseUntil) {
				raf = requestAnimationFrame(tick);
				return;
			}

			const max = el.scrollHeight - el.clientHeight;
			if (max <= 0) {
				raf = requestAnimationFrame(tick);
				return;
			}

			if (position >= max - 1) {
				pauseUntil = now + pauseMs;
				position = 0;
				el.scrollTo({ top: 0 });
			} else {
				position += scrollPxPerTick; // tích lũy float
				el.scrollTo({ top: position }); // scrollTo chấp nhận float
			}

			raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(raf);
		};
	}, [layout, pauseMs, scrollPxPerTick, items.length]);

	return (
		<div className="fixed inset-0 flex flex-col bg-slate-950 text-slate-50">
			<header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
				<div>
					<div className="text-xs uppercase tracking-[0.2em] text-slate-400">Báo cáo lỗi</div>
					<div className="text-3xl font-semibold tracking-tight">Trình chiếu TV</div>
					<div className="mt-1 text-sm text-slate-300">
						{clock.toLocaleString("vi-VN")} — Phạm vi: {range === "today" ? "Hôm nay" : "30 ngày gần nhất (theo lịch máy)"}
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2 text-sm text-slate-300">
					<div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						Tổng dòng: <span className="font-semibold text-white">{stats?.rows ?? "—"}</span>
					</div>
					<div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5">
						Hỏng/hủy: <span className="font-semibold text-amber-200">{stats?.scrap ?? "—"}</span>
					</div>
					<Link className="mt-2 inline-block text-sky-300 hover:underline" href="/">
						← Dashboard
					</Link>
				</div>
			</header>

			<main className="min-h-0 flex-1 px-4 pb-4 pt-3">
				{layout === "summary" ? (
					<div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
						<section className="rounded-2xl border border-white/10 bg-white/5 p-6">
							<h2 className="text-xl font-semibold text-white">Top lỗi</h2>
							<ol className="mt-4 list-decimal space-y-2 pl-6 text-lg">
								{stats?.topDefects?.map((t) => (
									<li key={t.name}>
										{t.name}{" "}
										<span className="text-slate-400">
											({t.count})
										</span>
									</li>
								)) ?? <li className="text-slate-400">Chưa có dữ liệu</li>}
							</ol>
						</section>
						<section className="rounded-2xl border border-white/10 bg-white/5 p-6">
							<h2 className="text-xl font-semibold text-white">Top sản phẩm</h2>
							<ol className="mt-4 list-decimal space-y-2 pl-6 text-lg">
								{stats?.topProducts?.map((t) => (
									<li key={t.name}>
										{t.name}{" "}
										<span className="text-slate-400">
											({t.count})
										</span>
									</li>
								)) ?? <li className="text-slate-400">Chưa có dữ liệu</li>}
							</ol>
						</section>
					</div>
				) : (
					<div ref={scrollerRef} className="h-full overflow-auto rounded-2xl border border-white/10 bg-white/[0.03]">
						<table className="min-w-[2550px] w-full table-fixed border-collapse text-left text-[clamp(13px,0.95vw,20px)] leading-snug">
							<colgroup>
								{tvColumnWidths.map((width, index) => (
									<col key={index} style={{ width }} />
								))}
							</colgroup>
							<thead className="sticky top-0 z-10 bg-slate-950/95 text-slate-200 backdrop-blur">
								<tr>
									<th rowSpan={2} className={`${headerMerged} bg-slate-800/95 text-center`}>
										Ngày
									</th>
									<th rowSpan={2} className={`${headerMerged} bg-slate-800/95 text-center`}>
										STT
									</th>
									<th rowSpan={2} className={`${headerMerged} bg-slate-800/95 text-left`}>
										Tên sản phẩm
									</th>
									<th rowSpan={2} className={`${headerMerged} bg-slate-800/95 text-left`}>
										Khách hàng
									</th>
									<th rowSpan={2} className={`${headerMerged} bg-slate-800/95 text-center`}>
										Mác thép
									</th>
									<th rowSpan={2} className={`${headerMerged} bg-slate-800/95 text-center`}>
										Số lượng đánh giá
									</th>
									<th
										colSpan={2}
										className={`${headerGroup} border-l-2 border-r-2 border-l-emerald-300/60 border-r-emerald-300/60 bg-emerald-600/30`}
									>
										Đạt
									</th>
									<th
										colSpan={3}
										className={`${headerGroup} border-l-2 border-r-2 border-l-amber-300/60 border-r-amber-300/60 bg-amber-600/30`}
									>
										Sản phẩm xử lý
									</th>
									<th
										colSpan={3}
										className={`${headerGroup} border-l-2 border-r-2 border-l-rose-300/60 border-r-rose-300/60 bg-rose-600/30`}
									>
										Sản phẩm hỏng/Hủy
									</th>
									<th rowSpan={2} className={`${headerMerged} border-l-2 border-l-sky-300/50 bg-sky-900/70 text-center`}>
										Phân xưởng BC
									</th>
									<th rowSpan={2} className={`${headerMerged} border-r-2 border-r-sky-300/50 bg-sky-900/70 text-left`}>
										Ghi chú
									</th>
								</tr>
								<tr>
									<th className={`${headerSub} border-l-2 border-l-emerald-300/60 bg-emerald-700/35`}>Số lượng</th>
									<th className={`${headerSub} border-r-2 border-r-emerald-300/60 bg-emerald-700/35`}>%</th>
									<th className={`${headerSub} border-l-2 border-l-amber-300/60 bg-amber-700/35`}>Số lượng</th>
									<th className={`${headerSub} bg-amber-700/35`}>%</th>
									<th className={`${headerSub} border-r-2 border-r-amber-300/60 bg-amber-700/35 text-left`}>Tình trạng lỗi</th>
									<th className={`${headerSub} border-l-2 border-l-rose-300/60 bg-rose-700/35`}>Số lượng</th>
									<th className={`${headerSub} bg-rose-700/35`}>%</th>
									<th className={`${headerSub} border-r-2 border-r-rose-300/60 bg-rose-700/35 text-left`}>Tình trạng hỏng</th>
								</tr>
							</thead>
							<tbody>
								{items.length === 0 ? (
									<tr>
										<td colSpan={16} className="px-4 py-10 text-center text-slate-400">
											Chưa có dữ liệu để trình chiếu.
										</td>
									</tr>
								) : (
									items.map((row, index) => (
										<tr key={row.id} className={`${index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"}`}>
											<td className={`${tdBase} whitespace-nowrap bg-slate-900/30 text-center text-slate-200`}>
												{new Date(row.dailyReport.reportDate).toLocaleDateString("vi-VN")}
											</td>
											<td className={`${tdCenter} bg-slate-900/30 text-slate-200`}>{fmtNum(row.lineNo)}</td>
											<td className={`${tdWrap} bg-slate-900/25 font-semibold text-white`}>{row.productName ?? "—"}</td>
											<td className={`${tdWrap} bg-slate-900/25 text-slate-200`}>{row.customerName ?? "—"}</td>
											<td className={`${tdWrap} bg-slate-900/25 text-center text-slate-200`}>{row.steelGrade ?? "—"}</td>
											<td className={`${tdCenter} bg-slate-900/30 text-slate-100`}>{fmtNum(row.inspectedQty)}</td>
											<td className={`${tdCenter} ${tdGroupStart} border-l-emerald-300/50 bg-emerald-500/10 text-emerald-50`}>
												{fmtNum(row.passedQty)}
											</td>
											<td className={`${tdCenter} ${tdGroupEnd} border-r-emerald-300/50 bg-emerald-500/10 text-emerald-50`}>
												{fmtPct(row.passedRate)}
											</td>
											<td className={`${tdCenter} ${tdGroupStart} border-l-amber-300/50 bg-amber-500/10 text-amber-50`}>
												{fmtNum(row.processedQty)}
											</td>
											<td className={`${tdCenter} bg-amber-500/10 text-amber-50`}>{fmtPct(row.processedRate)}</td>
											<td className={`${tdWrap} ${tdGroupEnd} border-r-amber-300/50 bg-amber-500/10 text-amber-100`}>
												{row.defectStatus ?? "—"}
											</td>
											<td className={`${tdCenter} ${tdGroupStart} border-l-rose-300/50 bg-rose-500/10 text-rose-100`}>
												{fmtNum(row.scrapQty)}
											</td>
											<td className={`${tdCenter} bg-rose-500/10 text-rose-100`}>{fmtPct(row.scrapRate)}</td>
											<td className={`${tdWrap} ${tdGroupEnd} border-r-rose-300/50 bg-rose-500/10 text-rose-100`}>
												{row.scrapStatus ?? "—"}
											</td>
											<td className={`${tdWrap} ${tdGroupStart} border-l-sky-300/40 bg-sky-500/10 text-sky-100`}>
												{row.workshopName ?? "—"}
											</td>
											<td className={`${tdBase} ${tdGroupEnd} border-r-sky-300/40 bg-sky-500/10 text-slate-200`} title={row.note ?? ""}>
												<div className="line-clamp-2 whitespace-normal break-words">{row.note ?? "—"}</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</main>
		</div>
	);
}
