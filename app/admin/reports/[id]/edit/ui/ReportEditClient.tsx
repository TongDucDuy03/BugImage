"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type SerializableLine = {
	id: string;
	dailyReportId: string;
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
	sourceType: string;
	createdAt: string;
	updatedAt: string;
};

export type SerializableReport = {
	id: string;
	reportDate: string;
	receivedDate: string | null;
	summaryDate: string | null;
	departmentName: string;
	reportCode: string | null;
	createdById: string | null;
	status: string;
	generalNote: string | null;
	createdAt: string;
	updatedAt: string;
	lines: SerializableLine[];
	importLogs: Array<{
		id: string;
		fileName: string;
		totalRows: number;
		successRows: number;
		errorRows: number;
		errorFilePath: string | null;
		createdAt: string;
	}>;
};

function pct(part: number | null, whole: number | null) {
	if (part == null || whole == null || whole === 0) return null;
	return Math.round((part / whole) * 10000) / 100;
}

function formatPct(v: number | null | undefined) {
	if (v == null || Number.isNaN(v)) return "";
	return String(v);
}

export function ReportEditClient({ report: initial, role }: { report: SerializableReport; role: string }) {
	const [report, setReport] = useState(initial);
	const [meta, setMeta] = useState({
		receivedDate: initial.receivedDate?.slice(0, 10) ?? "",
		summaryDate: initial.summaryDate?.slice(0, 10) ?? "",
		departmentName: initial.departmentName,
		reportCode: initial.reportCode ?? "",
		generalNote: initial.generalNote ?? ""
	});
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [importMode, setImportMode] = useState<"append" | "new" | "replace">("append");

	const locked = report.status === "finalized" && role !== "admin";
	const canAdmin = role === "admin";

	const lineState = useMemo(() => report.lines.slice().sort((a, b) => a.lineNo - b.lineNo), [report.lines]);

	async function refresh() {
		const res = await fetch(`/api/daily-reports/${report.id}`);
		if (!res.ok) return;
		const data = await res.json();
		const asIso = (v: unknown) => (typeof v === "string" ? v : v instanceof Date ? v.toISOString() : String(v));
		setReport({
			...data,
			reportDate: asIso(data.reportDate),
			receivedDate: data.receivedDate ? asIso(data.receivedDate) : null,
			summaryDate: data.summaryDate ? asIso(data.summaryDate) : null,
			createdAt: asIso(data.createdAt),
			updatedAt: asIso(data.updatedAt),
			lines: (data.lines ?? []).map((l: SerializableLine) => ({
				...l,
				createdAt: asIso(l.createdAt),
				updatedAt: asIso(l.updatedAt)
			})),
			importLogs: (data.importLogs ?? []).map((log: SerializableReport["importLogs"][0]) => ({
				...log,
				createdAt: asIso(log.createdAt)
			}))
		});
	}

	async function saveMeta() {
		setBusy("meta");
		setError(null);
		const res = await fetch(`/api/daily-reports/${report.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				receivedDate: meta.receivedDate || null,
				summaryDate: meta.summaryDate || null,
				departmentName: meta.departmentName,
				reportCode: meta.reportCode || null,
				generalNote: meta.generalNote || null
			})
		});
		setBusy(null);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không lưu được.");
			return;
		}
		const data = await res.json();
		setReport((r) => ({ ...r, ...data, reportDate: data.reportDate ?? r.reportDate }));
	}

	async function setStatus(next: "draft" | "finalized") {
		if (next === "draft" && report.status === "finalized" && !canAdmin) {
			setError("Chỉ quản trị viên có thể mở lại báo cáo đã chốt.");
			return;
		}
		const ok = next === "finalized" ? window.confirm("Chốt báo cáo? Sau khi chốt, nhân viên thường không sửa được.") : true;
		if (!ok) return;
		setBusy("status");
		setError(null);
		const res = await fetch(`/api/daily-reports/${report.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: next })
		});
		setBusy(null);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không cập nhật trạng thái.");
			return;
		}
		const data = await res.json();
		setReport((r) => ({ ...r, ...data }));
	}

	async function addLine() {
		setBusy("add");
		setError(null);
		const res = await fetch(`/api/daily-reports/${report.id}/lines`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({})
		});
		setBusy(null);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không thêm được dòng.");
			return;
		}
		await refresh();
	}

	async function saveLine(line: SerializableLine, draft: Partial<SerializableLine>) {
		setBusy(`row-${line.id}`);
		setError(null);
		const body = {
			productName: draft.productName ?? line.productName,
			customerName: draft.customerName ?? line.customerName,
			steelGrade: draft.steelGrade ?? line.steelGrade,
			inspectedQty: draft.inspectedQty !== undefined ? draft.inspectedQty : line.inspectedQty,
			passedQty: draft.passedQty !== undefined ? draft.passedQty : line.passedQty,
			passedRate: draft.passedRate !== undefined ? draft.passedRate : line.passedRate,
			processedQty: draft.processedQty !== undefined ? draft.processedQty : line.processedQty,
			processedRate: draft.processedRate !== undefined ? draft.processedRate : line.processedRate,
			defectStatus: draft.defectStatus ?? line.defectStatus,
			scrapQty: draft.scrapQty !== undefined ? draft.scrapQty : line.scrapQty,
			scrapRate: draft.scrapRate !== undefined ? draft.scrapRate : line.scrapRate,
			scrapStatus: draft.scrapStatus ?? line.scrapStatus,
			workshopName: draft.workshopName ?? line.workshopName,
			note: draft.note ?? line.note
		};
		const res = await fetch(`/api/daily-report-lines/${line.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		});
		setBusy(null);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không lưu được dòng.");
			return;
		}
		await refresh();
	}

	async function removeLine(id: string) {
		if (!window.confirm("Xóa dòng này?")) return;
		setBusy(`del-${id}`);
		setError(null);
		const res = await fetch(`/api/daily-report-lines/${id}`, { method: "DELETE" });
		setBusy(null);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không xóa được.");
			return;
		}
		await refresh();
	}

	async function onImport(file: File | null) {
		if (!file) return;
		setBusy("import");
		setError(null);
		const fd = new FormData();
		fd.append("file", file);
		fd.append("mode", importMode);
		const res = await fetch(`/api/daily-reports/${report.id}/import`, {
			method: "POST",
			body: fd
		});
		setBusy(null);
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			setError(data?.error ?? "Import thất bại.");
			return;
		}
		await refresh();
		if (data?.errors?.length) {
			setError(`Import xong: ${data.successRows} dòng ghi nhận, ${data.errorRows} dòng ghi nhận lỗi (xem file lỗi nếu có).`);
		} else {
			setError(null);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="text-sm text-text-muted">
						<Link className="hover:underline" href="/admin/reports">
							← Danh sách
						</Link>
					</div>
					<h1 className="mt-2 text-2xl font-semibold tracking-tight">Báo cáo ngày</h1>
					<p className="text-sm text-text-muted">
						Ngày báo cáo:{" "}
						<strong>{new Date(report.reportDate).toLocaleDateString("vi-VN")}</strong> —{" "}
						{report.status === "finalized" ? (
							<span className="text-emerald-700">Đã chốt</span>
						) : (
							<span className="text-amber-800">Nháp</span>
						)}
					</p>
					<p className="mt-1 flex flex-wrap gap-3 text-xs text-primary">
						<Link className="hover:underline" href="/" target="_blank" rel="noreferrer">
							Mở Dashboard (tab mới)
						</Link>
						<Link className="hover:underline" href="/tv" target="_blank" rel="noreferrer">
							Mở màn TV (tab mới)
						</Link>
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<a
						className="rounded-xl border border-bg-muted px-3 py-2 text-sm hover:bg-bg-muted/50"
						href={`/api/daily-reports/${report.id}/export`}
					>
						Xuất Excel
					</a>
					<button
						type="button"
						disabled={!!busy || locked}
						onClick={saveMeta}
						className="rounded-xl border border-bg-muted px-3 py-2 text-sm hover:bg-bg-muted/50 disabled:opacity-50"
					>
						Lưu thông tin chung
					</button>
					{report.status === "draft" ? (
						<button
							type="button"
							disabled={!!busy || locked}
							onClick={() => setStatus("finalized")}
							className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
						>
							Chốt báo cáo
						</button>
					) : (
						canAdmin && (
							<button
								type="button"
								disabled={!!busy}
								onClick={() => setStatus("draft")}
								className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 hover:bg-amber-100 disabled:opacity-50"
							>
								Mở lại (admin)
							</button>
						)
					)}
				</div>
			</div>

			{error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}

			<div className="card grid gap-4 p-4 md:grid-cols-2">
				<label className="space-y-1 text-sm">
					<span className="text-text-muted">Ngày nhận báo</span>
					<input
						type="date"
						className="w-full rounded-xl border border-bg-muted px-3 py-2"
						value={meta.receivedDate}
						disabled={locked}
						onChange={(e) => setMeta((m) => ({ ...m, receivedDate: e.target.value }))}
					/>
				</label>
				<label className="space-y-1 text-sm">
					<span className="text-text-muted">Ngày tổng hợp</span>
					<input
						type="date"
						className="w-full rounded-xl border border-bg-muted px-3 py-2"
						value={meta.summaryDate}
						disabled={locked}
						onChange={(e) => setMeta((m) => ({ ...m, summaryDate: e.target.value }))}
					/>
				</label>
				<label className="space-y-1 text-sm md:col-span-2">
					<span className="text-text-muted">Phòng ban</span>
					<input
						className="w-full rounded-xl border border-bg-muted px-3 py-2"
						value={meta.departmentName}
						disabled={locked}
						onChange={(e) => setMeta((m) => ({ ...m, departmentName: e.target.value }))}
					/>
				</label>
				<label className="space-y-1 text-sm">
					<span className="text-text-muted">Mã báo cáo</span>
					<input
						className="w-full rounded-xl border border-bg-muted px-3 py-2"
						value={meta.reportCode}
						disabled={locked}
						onChange={(e) => setMeta((m) => ({ ...m, reportCode: e.target.value }))}
					/>
				</label>
				<label className="space-y-1 text-sm md:col-span-2">
					<span className="text-text-muted">Ghi chú chung</span>
					<textarea
						className="min-h-[72px] w-full rounded-xl border border-bg-muted px-3 py-2"
						value={meta.generalNote}
						disabled={locked}
						onChange={(e) => setMeta((m) => ({ ...m, generalNote: e.target.value }))}
					/>
				</label>
			</div>

			<div className="card space-y-3 p-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="text-sm font-medium">Import Excel</div>
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<a
							className="rounded-lg border border-bg-muted px-3 py-1.5 hover:bg-bg-muted/40"
							href="/api/daily-reports/excel-template"
						>
							Tải file mẫu
						</a>
						<select
							className="rounded-lg border border-bg-muted bg-white px-2 py-1.5"
							value={importMode}
							disabled={locked}
							onChange={(e) => setImportMode(e.target.value as typeof importMode)}
						>
							<option value="new">Tạo mới (báo cáo trống)</option>
							<option value="append">Bổ sung dòng</option>
							<option value="replace">Ghi đè toàn bộ (admin)</option>
						</select>
						<label className="inline-flex items-center gap-2 rounded-lg border border-bg-muted px-3 py-1.5 hover:bg-bg-muted/40">
							<input type="file" accept=".xlsx,.xls" className="hidden" disabled={locked || !!busy} onChange={(e) => onImport(e.target.files?.[0] ?? null)} />
							<span>{busy === "import" ? "Đang import…" : "Chọn file"}</span>
						</label>
					</div>
				</div>
				{report.importLogs?.length ? (
					<div className="text-xs text-text-muted">
						<p className="font-medium text-text-soft">Import gần đây</p>
						<ul className="mt-1 space-y-1">
							{report.importLogs.map((log) => (
								<li key={log.id} className="flex flex-wrap gap-x-3">
									<span>{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
									<span>{log.fileName}</span>
									<span>
										OK {log.successRows}/{log.totalRows} — lỗi {log.errorRows}
									</span>
									{log.errorFilePath ? (
										<a className="text-primary hover:underline" href={log.errorFilePath}>
											Tải file lỗi
										</a>
									) : null}
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-lg font-semibold">Chi tiết lỗi</h2>
				<button
					type="button"
					disabled={!!busy || locked}
					onClick={addLine}
					className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
				>
					Thêm dòng
				</button>
			</div>

			<div className="card overflow-auto">
				<table className="min-w-[1400px] w-full border-collapse text-xs">
					<thead className="sticky top-0 z-10 bg-bg-soft shadow-sm">
						<tr className="border-b border-bg-muted text-left text-text-muted">
							<th className="sticky left-0 z-20 bg-bg-soft px-2 py-2 font-medium">STT</th>
							<th className="sticky left-10 z-20 min-w-[140px] bg-bg-soft px-2 py-2 font-medium">Sản phẩm</th>
							<th className="min-w-[120px] px-2 py-2 font-medium">Khách</th>
							<th className="min-w-[90px] px-2 py-2 font-medium">Mác thép</th>
							<th className="min-w-[72px] px-2 py-2 font-medium">SL đánh</th>
							<th className="min-w-[64px] px-2 py-2 font-medium">Đạt</th>
							<th className="min-w-[56px] px-2 py-2 font-medium">Đạt %</th>
							<th className="min-w-[64px] px-2 py-2 font-medium">XL SL</th>
							<th className="min-w-[56px] px-2 py-2 font-medium">XL %</th>
							<th className="min-w-[140px] px-2 py-2 font-medium">Tình trạng lỗi</th>
							<th className="min-w-[64px] px-2 py-2 font-medium">Hỏng SL</th>
							<th className="min-w-[56px] px-2 py-2 font-medium">Hỏng %</th>
							<th className="min-w-[120px] px-2 py-2 font-medium">Tình trạng hỏng</th>
							<th className="min-w-[100px] px-2 py-2 font-medium">Phân xưởng</th>
							<th className="min-w-[140px] px-2 py-2 font-medium">Ghi chú</th>
							<th className="px-2 py-2 font-medium"> </th>
						</tr>
					</thead>
					<tbody>
						{lineState.map((line, idx) => (
							<LineRow
								key={line.id}
								line={line}
								index={idx}
								locked={locked}
								busy={busy}
								onSave={(draft) => saveLine(line, draft)}
								onDelete={() => removeLine(line.id)}
								highScrap={(line.scrapRate ?? 0) >= 10}
							/>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function LineRow({
	line,
	index,
	locked,
	busy,
	onSave,
	onDelete,
	highScrap
}: {
	line: SerializableLine;
	index: number;
	locked: boolean;
	busy: string | null;
	onSave: (draft: Partial<SerializableLine>) => void;
	onDelete: () => void;
	highScrap: boolean;
}) {
	const [draft, setDraft] = useState<Partial<SerializableLine>>({});

	const merged = { ...line, ...draft };
	const autoPassed = pct(merged.passedQty, merged.inspectedQty);
	const autoProcessed = pct(merged.processedQty, merged.inspectedQty);
	const autoScrap = pct(merged.scrapQty, merged.inspectedQty);

	return (
		<tr className={`border-b border-bg-muted/60 ${highScrap ? "bg-red-50/80" : index % 2 ? "bg-white" : "bg-bg-muted/20"}`}>
			<td className="sticky left-0 bg-inherit px-2 py-1 text-text-muted">{line.lineNo}</td>
			<td className="sticky left-10 bg-inherit px-2 py-1">
				<input
					className="w-full min-w-[120px] rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					defaultValue={line.productName ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, productName: e.target.value || null }))}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-full rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					defaultValue={line.customerName ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, customerName: e.target.value || null }))}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-full rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					defaultValue={line.steelGrade ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, steelGrade: e.target.value || null }))}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-16 rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					type="number"
					defaultValue={line.inspectedQty ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, inspectedQty: e.target.value === "" ? null : Number(e.target.value) }))}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-16 rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					type="number"
					defaultValue={line.passedQty ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, passedQty: e.target.value === "" ? null : Number(e.target.value) }))}
				/>
			</td>
			<td className={`px-2 py-1 ${(autoPassed ?? 0) < 60 ? "text-red-700 font-semibold" : ""}`}>
				<input
					className="w-14 rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					title="Để trống để hệ thống tự tính"
					placeholder={autoPassed != null ? String(autoPassed) : ""}
					defaultValue={line.passedRate != null ? formatPct(line.passedRate) : ""}
					onBlur={(e) =>
						setDraft((d) => ({
							...d,
							passedRate: e.target.value === "" ? null : Number(e.target.value)
						}))
					}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-16 rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					type="number"
					defaultValue={line.processedQty ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, processedQty: e.target.value === "" ? null : Number(e.target.value) }))}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-14 rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					placeholder={autoProcessed != null ? String(autoProcessed) : ""}
					defaultValue={line.processedRate != null ? formatPct(line.processedRate) : ""}
					onBlur={(e) =>
						setDraft((d) => ({
							...d,
							processedRate: e.target.value === "" ? null : Number(e.target.value)
						}))
					}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-full rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					defaultValue={line.defectStatus ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, defectStatus: e.target.value || null }))}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-16 rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					type="number"
					defaultValue={line.scrapQty ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, scrapQty: e.target.value === "" ? null : Number(e.target.value) }))}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-14 rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					placeholder={autoScrap != null ? String(autoScrap) : ""}
					defaultValue={line.scrapRate != null ? formatPct(line.scrapRate) : ""}
					onBlur={(e) =>
						setDraft((d) => ({
							...d,
							scrapRate: e.target.value === "" ? null : Number(e.target.value)
						}))
					}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-full rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					defaultValue={line.scrapStatus ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, scrapStatus: e.target.value || null }))}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-full rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					defaultValue={line.workshopName ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, workshopName: e.target.value || null }))}
				/>
			</td>
			<td className="px-2 py-1">
				<input
					className="w-full rounded border border-transparent px-1 py-0.5 hover:border-bg-muted"
					disabled={locked}
					defaultValue={line.note ?? ""}
					onBlur={(e) => setDraft((d) => ({ ...d, note: e.target.value || null }))}
				/>
			</td>
			<td className="whitespace-nowrap px-2 py-1">
				<button
					type="button"
					disabled={locked || busy === `row-${line.id}`}
					className="rounded-lg border border-bg-muted px-2 py-1 hover:bg-bg-muted/50 disabled:opacity-50"
					onClick={() => onSave(draft)}
				>
					Lưu
				</button>{" "}
				<button
					type="button"
					disabled={locked}
					className="rounded-lg border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
					onClick={onDelete}
				>
					Xóa
				</button>
			</td>
		</tr>
	);
}
