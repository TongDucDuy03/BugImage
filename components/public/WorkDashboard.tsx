"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { QualityIssueTable } from "@/components/shared/QualityIssueTable";
import type { QualityIssueGroupPayload } from "@/lib/quality-issues";

type ApiResponse = {
	items: QualityIssueGroupPayload[];
	stats: {
		groups: number;
		lines: number;
		topDefects: Array<{ name: string; count: number }>;
		topProducts: Array<{ name: string; count: number }>;
	};
};

export function WorkDashboard() {
	const [customer, setCustomer] = useState("");
	const [product, setProduct] = useState("");
	const [steelGrade, setSteelGrade] = useState("");
	const [defectName, setDefectName] = useState("");
	const [progressStatus, setProgressStatus] = useState("");
	const [owner, setOwner] = useState("");
	const [q, setQ] = useState("");

	const [data, setData] = useState<ApiResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);

		const params = new URLSearchParams();
		if (customer.trim()) params.set("customer", customer.trim());
		if (product.trim()) params.set("product", product.trim());
		if (steelGrade.trim()) params.set("steelGrade", steelGrade.trim());
		if (defectName.trim()) params.set("defectName", defectName.trim());
		if (progressStatus.trim()) params.set("progressStatus", progressStatus.trim());
		if (owner.trim()) params.set("owner", owner.trim());
		if (q.trim()) params.set("q", q.trim());

		const res = await fetch(`/api/public/quality-issues?${params.toString()}`);
		if (!res.ok) {
			setError("Không tải được danh sách theo dõi hàng lỗi chất lượng.");
			setLoading(false);
			return;
		}

		const json = (await res.json()) as ApiResponse;
		setData(json);
		setLoading(false);
	}, [customer, defectName, owner, product, progressStatus, q, steelGrade]);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<div className="min-h-screen bg-[#f4efe6]">
			<header className="border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
				<div className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 xl:px-8">
					<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
						<div className="space-y-1">
							<div className="text-xs uppercase tracking-[0.18em] text-slate-500">Quality Issue Tracker</div>
							<h1 className="text-[1.85rem] font-semibold tracking-tight text-slate-900">Bảng theo dõi hàng lỗi chất lượng</h1>
							<p className="text-sm text-slate-600">
								Danh sách theo dõi liên tục theo nhóm sản phẩm, giữ logic gộp dòng và trình bày theo tông sáng giống biểu mẫu Excel.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2 text-sm">
							{data ? (
								<>
									<span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 shadow-sm">
										{data.stats.groups} nhóm sản phẩm
									</span>
									<span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-900 shadow-sm">
										{data.stats.lines} dòng chi tiết
									</span>
								</>
							) : null}
							<Link className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm transition hover:bg-slate-50" href="/tv">
								Màn hình TV
							</Link>
							<Link className="rounded-xl bg-primary px-3 py-2 font-medium text-primary-foreground shadow-sm transition hover:opacity-95" href="/admin/reports">
								Quản trị / nhập liệu
							</Link>
						</div>
					</div>
				</div>
			</header>

			<div className="mx-auto w-full max-w-[1680px] space-y-5 px-4 py-6 sm:px-6 xl:px-8">
				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
						<label className="text-sm md:col-span-2 xl:col-span-2">
							<span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Tìm nhanh</span>
							<input
								className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[13px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
								placeholder="Sản phẩm, khách hàng, lỗi, biện pháp, ghi chú..."
								value={q}
								onChange={(e) => setQ(e.target.value)}
							/>
						</label>
						<label className="text-sm">
							<span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Khách hàng</span>
							<input className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[13px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={customer} onChange={(e) => setCustomer(e.target.value)} />
						</label>
						<label className="text-sm">
							<span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Tên sản phẩm hỏng/lỗi</span>
							<input className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[13px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={product} onChange={(e) => setProduct(e.target.value)} />
						</label>
						<label className="text-sm">
							<span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Mác thép</span>
							<input className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[13px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={steelGrade} onChange={(e) => setSteelGrade(e.target.value)} />
						</label>
						<label className="text-sm">
							<span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Tên lỗi</span>
							<input className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[13px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={defectName} onChange={(e) => setDefectName(e.target.value)} />
						</label>
						<label className="text-sm">
							<span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Tình trạng tiến độ</span>
							<input
								className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[13px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
								value={progressStatus}
								onChange={(e) => setProgressStatus(e.target.value)}
							/>
						</label>
						<label className="text-sm">
							<span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Phụ trách</span>
							<input className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[13px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" value={owner} onChange={(e) => setOwner(e.target.value)} />
						</label>
						<div className="flex items-end">
							<button
								type="button"
								disabled={loading}
								className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-60"
								onClick={() => void load()}
							>
								{loading ? "Đang tải..." : "Áp dụng lọc"}
							</button>
						</div>
					</div>
				</section>

				{error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}

				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
						<div className="text-[15px] font-semibold text-slate-900">Bảng theo dõi hàng lỗi chất lượng</div>
						{data ? (
							<div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
								<span>{data.stats.groups} nhóm sản phẩm</span>
								<span>·</span>
								<span>{data.stats.lines} dòng chi tiết</span>
							</div>
						) : null}
					</div>
					<div className="max-h-[74vh] overflow-y-auto overflow-x-hidden">
						{loading && !data ? <div className="p-6 text-sm text-slate-500">Đang tải...</div> : null}
						{data ? <QualityIssueTable groups={data.items} variant="public" /> : null}
					</div>
				</section>

				<section className="grid gap-4 xl:grid-cols-3">
					<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<div className="text-sm font-semibold text-slate-900">Thống kê nhanh</div>
						<dl className="mt-3 space-y-2 text-sm">
							<div className="flex justify-between gap-2">
								<dt className="text-slate-500">Nhóm sản phẩm</dt>
								<dd className="font-medium text-slate-900">{data?.stats.groups ?? "—"}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-slate-500">Dòng chi tiết</dt>
								<dd className="font-medium text-slate-900">{data?.stats.lines ?? "—"}</dd>
							</div>
						</dl>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<div className="text-sm font-semibold text-slate-900">Top 5 tên lỗi</div>
						<ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-slate-800">
							{data?.stats.topDefects.length ? (
								data.stats.topDefects.map((item) => (
									<li key={item.name}>
										{item.name} <span className="text-slate-500">({item.count})</span>
									</li>
								))
							) : (
								<li className="text-slate-500">Chưa có dữ liệu</li>
							)}
						</ol>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<div className="text-sm font-semibold text-slate-900">Top 5 sản phẩm</div>
						<ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-slate-800">
							{data?.stats.topProducts.length ? (
								data.stats.topProducts.map((item) => (
									<li key={item.name}>
										{item.name} <span className="text-slate-500">({item.count})</span>
									</li>
								))
							) : (
								<li className="text-slate-500">Chưa có dữ liệu</li>
							)}
						</ol>
					</div>
				</section>
			</div>
		</div>
	);
}
