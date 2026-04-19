"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { QualityIssueGroupPayload, QualityIssueLinePayload, QualityIssueLineStyles, QualityIssueStyleField } from "@/lib/quality-issues";
import {
	QUALITY_ISSUE_IMPORTED_RED_TEXT_FIELDS,
	isQualityIssueWarningBgField,
	normalizeQualityLookupText,
	QUALITY_ISSUE_RED_TEXT_COLOR,
	QUALITY_ISSUE_WARNING_BG_COLOR
} from "@/lib/quality-issues";

type ImportLogItem = {
	id: string;
	fileName: string;
	totalRows: number;
	successRows: number;
	errorRows: number;
	createdNewGroups: number;
	appendedExistingGroups: number;
	skippedRows: number;
	mode: string;
	errorFilePath: string | null;
	createdAt: string;
	importedBy: string | null;
};

type ImportPreview = {
	sheetName: string;
	totalRows: number;
	validRows: number;
	createdNewGroups: number;
	appendedExistingGroups: number;
	skippedRows: number;
	errorRows: number;
	errors: Array<{ rowNumber: number; message: string }>;
	items: Array<{
		rowNumber: number;
		action: string;
		productName: string | null;
		defectName: string | null;
		groupLabel: string;
		message: string;
	}>;
};

type FormState = {
	productName: string;
	customerName: string;
	steelGrade: string;
	defectRateText: string;
	defectName: string;
	actionPlan: string;
	progressStatus: string;
	deadlineText: string;
	ownerName: string;
	note: string;
	warningBg: boolean;
	redText: boolean;
};

const emptyForm: FormState = {
	productName: "",
	customerName: "",
	steelGrade: "",
	defectRateText: "",
	defectName: "",
	actionPlan: "",
	progressStatus: "",
	deadlineText: "",
	ownerName: "",
	note: "",
	warningBg: false,
	redText: false
};

const tableColumnWidths = ["52px", "176px", "124px", "88px", "104px", "168px", "220px", "176px", "104px", "112px", "168px", "132px"];

const headerLinkClass = "text-[12px] font-medium text-sky-700 transition hover:text-sky-800 hover:underline";
const primaryButtonClass =
	"inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-[12px] font-medium text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
	"inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
const tinySecondaryButtonClass =
	"inline-flex h-7 items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
const tinyWarnButtonClass =
	"inline-flex h-7 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-2.5 text-[11px] font-medium text-amber-900 transition hover:bg-amber-100/70 disabled:cursor-not-allowed disabled:opacity-60";
const tinyDangerButtonClass =
	"inline-flex h-7 items-center justify-center rounded-md border border-red-200 bg-red-50 px-2.5 text-[11px] font-medium text-red-700 transition hover:bg-red-100/70 disabled:cursor-not-allowed disabled:opacity-60";
const dangerBadgeClass = "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700";
const tableHeadCellClass =
	"border-b border-r border-slate-200 bg-slate-100/95 px-2 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-slate-600 last:border-r-0";
const tableGroupCellClass = "border-r border-slate-200 px-2 py-2 align-top";
const tableLineCellClass = "border-r border-slate-200 px-2 py-2 align-top last:border-r-0";
const inlineCheckboxLabelClass = "flex items-center gap-2 text-[11px] leading-4 text-slate-600";
const redTextStyleFields: QualityIssueStyleField[] = [...QUALITY_ISSUE_IMPORTED_RED_TEXT_FIELDS];

function hasWarningBg(styles: QualityIssueLineStyles | null | undefined) {
	return Boolean(
		styles &&
			Object.entries(styles).some(([field, style]) => {
				if (!isQualityIssueWarningBgField(field as QualityIssueStyleField)) return false;
				const color = style?.bgColor?.toLowerCase();
				return Boolean(color && color !== "#ffffff");
			})
	);
}

function hasRedText(styles: QualityIssueLineStyles | null | undefined) {
	return Boolean(
		styles &&
			redTextStyleFields.some((field) => {
				const color = styles[field]?.fontColor?.toLowerCase();
				return Boolean(color && [QUALITY_ISSUE_RED_TEXT_COLOR.toLowerCase(), "#ff0000", "#9c0006"].includes(color));
			})
	);
}

function buildPresetStyles(warningBg: boolean, redText: boolean): QualityIssueLineStyles | null {
	if (!warningBg && !redText) return null;
	const styles: QualityIssueLineStyles = {};

	if (redText) {
		for (const field of redTextStyleFields) {
			styles[field] = {
				bgColor: null,
				fontColor: QUALITY_ISSUE_RED_TEXT_COLOR,
				bold: true
			};
		}
	}

	if (warningBg) {
		for (const field of ["defectRateText", "defectName"] as const) {
			styles[field] = {
				...(styles[field] ?? {}),
				bgColor: QUALITY_ISSUE_WARNING_BG_COLOR,
				bold: true
			};
		}
	}

	return Object.keys(styles).length ? styles : null;
}

function defaultLineDraft(line: QualityIssueLinePayload) {
	return {
		defectRateText: line.defectRateText ?? "",
		defectName: line.defectName ?? "",
		actionPlan: line.actionPlan ?? "",
		progressStatus: line.progressStatus ?? "",
		deadlineText: line.deadlineText ?? "",
		ownerName: line.ownerName ?? "",
		note: line.note ?? "",
		warningBg: hasWarningBg(line.styles),
		redText: hasRedText(line.styles)
	};
}

export function QualityIssueTrackerClient({
	groups,
	importLogs
}: {
	groups: QualityIssueGroupPayload[];
	importLogs: ImportLogItem[];
}) {
	const router = useRouter();
	const [form, setForm] = useState<FormState>(emptyForm);
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [importMode, setImportMode] = useState<"append" | "upsert">("append");
	const [importFile, setImportFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<ImportPreview | null>(null);
	const [groupDrafts, setGroupDrafts] = useState<Record<string, { productName: string; customerName: string; steelGrade: string }>>({});
	const [lineDrafts, setLineDrafts] = useState<
		Record<
			string,
			{
				defectRateText: string;
				defectName: string;
				actionPlan: string;
				progressStatus: string;
				deadlineText: string;
				ownerName: string;
				note: string;
				warningBg: boolean;
				redText: boolean;
			}
		>
	>({});

	const existingGroupMatch = useMemo(() => {
		const productKey = normalizeQualityLookupText(form.productName);
		if (!productKey) return null;
		const customerKey = normalizeQualityLookupText(form.customerName);
		const steelKey = form.steelGrade.trim().toLowerCase() || null;
		return (
			groups.find(
				(group) =>
					normalizeQualityLookupText(group.productName) === productKey &&
					(normalizeQualityLookupText(group.customerName) === customerKey || !customerKey) &&
					((group.steelGrade ?? "").trim().toLowerCase() === steelKey || !steelKey)
			) ?? null
		);
	}, [form.customerName, form.productName, form.steelGrade, groups]);

	const totalLines = useMemo(() => groups.reduce((sum, group) => sum + group.lines.length, 0), [groups]);

	function groupDraft(group: QualityIssueGroupPayload) {
		return groupDrafts[group.groupId] ?? {
			productName: group.productName,
			customerName: group.customerName ?? "",
			steelGrade: group.steelGrade ?? ""
		};
	}

	function lineDraft(line: QualityIssueLinePayload) {
		return lineDrafts[line.id] ?? defaultLineDraft(line);
	}

	function setGroupField(groupId: string, field: "productName" | "customerName" | "steelGrade", value: string, group: QualityIssueGroupPayload) {
		setGroupDrafts((drafts) => ({
			...drafts,
			[groupId]: {
				...(drafts[groupId] ?? {
					productName: group.productName,
					customerName: group.customerName ?? "",
					steelGrade: group.steelGrade ?? ""
				}),
				[field]: value
			}
		}));
	}

	function setLineField(lineId: string, field: keyof ReturnType<typeof defaultLineDraft>, value: string | boolean, line: QualityIssueLinePayload) {
		setLineDrafts((drafts) => ({
			...drafts,
			[lineId]: {
				...(drafts[lineId] ?? defaultLineDraft(line)),
				[field]: value as never
			}
		}));
	}

	async function refreshPage() {
		router.refresh();
	}

	async function createManualLine() {
		setBusy("create");
		setError(null);
		const res = await fetch("/api/quality-issues/lines", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				productName: form.productName,
				customerName: form.customerName || null,
				steelGrade: form.steelGrade || null,
				defectRateText: form.defectRateText || null,
				defectName: form.defectName || null,
				actionPlan: form.actionPlan || null,
				progressStatus: form.progressStatus || null,
				deadlineText: form.deadlineText || null,
				ownerName: form.ownerName || null,
				note: form.note || null,
				styles: buildPresetStyles(form.warningBg, form.redText),
				sourceType: "manual"
			})
		});
		setBusy(null);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không thêm được dòng theo dõi lỗi.");
			return;
		}
		setForm(emptyForm);
		await refreshPage();
	}

	async function saveGroup(group: QualityIssueGroupPayload) {
		const draft = groupDraft(group);
		setBusy(`group-${group.groupId}`);
		setError(null);
		const res = await fetch(`/api/quality-issues/groups/${group.groupId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				productName: draft.productName,
				customerName: draft.customerName || null,
				steelGrade: draft.steelGrade || null
			})
		});
		setBusy(null);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không lưu được nhóm sản phẩm.");
			return;
		}
		await refreshPage();
	}

	async function toggleTv(group: QualityIssueGroupPayload) {
		setBusy(`tv-${group.groupId}`);
		setError(null);
		const res = await fetch(`/api/quality-issues/groups/${group.groupId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ hideFromTv: !group.hideFromTv })
		});
		setBusy(null);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không cập nhật được hiển thị TV.");
			return;
		}
		await refreshPage();
	}

	async function saveLine(line: QualityIssueLinePayload) {
		const draft = lineDraft(line);
		setBusy(`line-${line.id}`);
		setError(null);
		const res = await fetch(`/api/quality-issues/lines/${line.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				defectRateText: draft.defectRateText || null,
				defectName: draft.defectName || null,
				actionPlan: draft.actionPlan || null,
				progressStatus: draft.progressStatus || null,
				deadlineText: draft.deadlineText || null,
				ownerName: draft.ownerName || null,
				note: draft.note || null,
				styles: buildPresetStyles(draft.warningBg, draft.redText)
			})
		});
		setBusy(null);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không lưu được dòng.");
			return;
		}
		await refreshPage();
	}

	async function removeLine(lineId: string) {
		if (!window.confirm("Xóa dòng theo dõi lỗi này?")) return;
		setBusy(`del-${lineId}`);
		setError(null);
		const res = await fetch(`/api/quality-issues/lines/${lineId}`, { method: "DELETE" });
		setBusy(null);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không xóa được dòng.");
			return;
		}
		await refreshPage();
	}

	async function runPreview() {
		if (!importFile) return;
		setBusy("preview");
		setError(null);
		const fd = new FormData();
		fd.append("file", importFile);
		fd.append("mode", importMode);
		fd.append("dryRun", "1");
		const res = await fetch("/api/quality-issues/import", {
			method: "POST",
			body: fd
		});
		setBusy(null);
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			setError(data?.error ?? "Không preview được file import.");
			return;
		}
		setPreview(data);
	}

	async function commitImport() {
		if (!importFile) return;
		setBusy("commit");
		setError(null);
		const fd = new FormData();
		fd.append("file", importFile);
		fd.append("mode", importMode);
		const res = await fetch("/api/quality-issues/import", {
			method: "POST",
			body: fd
		});
		setBusy(null);
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			setError(data?.error ?? "Import thất bại.");
			return;
		}
		setPreview(data);
		setImportFile(null);
		await refreshPage();
	}

	return (
		<div className="space-y-4 xl:space-y-5">
			<div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
				<div className="min-w-0 space-y-2">
					<div className="space-y-1">
						<h1 className="admin-page-title">Danh sách theo dõi hàng lỗi chất lượng</h1>
						<p className="admin-copy max-w-4xl">
							Dữ liệu được theo dõi liên tục theo nhóm sản phẩm. Bản chỉnh sửa này ưu tiên hiển thị gọn ở zoom 100% trên màn hình laptop/desktop
							mà vẫn giữ nguyên đầy đủ các thao tác thêm dòng, import Excel, preview và sửa trực tiếp trên bảng.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="admin-badge">{groups.length} nhóm sản phẩm</span>
						<span className="admin-badge">{totalLines} dòng chi tiết</span>
						<Link className={headerLinkClass} href="/" target="_blank" rel="noreferrer">
							Mở dashboard công khai
						</Link>
						<Link className={headerLinkClass} href="/tv" target="_blank" rel="noreferrer">
							Mở màn hình TV
						</Link>
					</div>
				</div>
				<a className={secondaryButtonClass} href="/api/quality-issues/excel-template">
					Tải template Excel mới
				</a>
			</div>

			{error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-800">{error}</div> : null}

			<section className="admin-card admin-card-pad space-y-4">
				<div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
					<div className="min-w-0 space-y-1">
						<h2 className="admin-section-title">Thêm dòng theo dõi thủ công</h2>
						<p className="admin-copy">Biểu mẫu được nén lại để nhập nhanh hơn trên màn hình 1366px trở lên, không cần zoom trình duyệt.</p>
					</div>
					<div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
						{existingGroupMatch ? (
							<span className="admin-badge">
								Sẽ thêm vào nhóm sẵn có: <strong className="ml-1 text-slate-800">{existingGroupMatch.productName}</strong>
							</span>
						) : form.productName.trim() ? (
							<span className="admin-badge">Sẽ tạo nhóm sản phẩm mới</span>
						) : null}
					</div>
				</div>

				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
					<label className="text-[12px] font-medium text-slate-700 xl:col-span-2">
						<span className="admin-label">Tên sản phẩm hỏng/lỗi</span>
						<input className="admin-input" value={form.productName} onChange={(e) => setForm((draft) => ({ ...draft, productName: e.target.value }))} />
					</label>
					<label className="text-[12px] font-medium text-slate-700">
						<span className="admin-label">Khách hàng</span>
						<input className="admin-input" value={form.customerName} onChange={(e) => setForm((draft) => ({ ...draft, customerName: e.target.value }))} />
					</label>
					<label className="text-[12px] font-medium text-slate-700">
						<span className="admin-label">Mác thép</span>
						<input className="admin-input" value={form.steelGrade} onChange={(e) => setForm((draft) => ({ ...draft, steelGrade: e.target.value }))} />
					</label>
					<label className="text-[12px] font-medium text-slate-700">
						<span className="admin-label">Tỉ lệ hỏng & xử lý</span>
						<input className="admin-input" value={form.defectRateText} onChange={(e) => setForm((draft) => ({ ...draft, defectRateText: e.target.value }))} />
					</label>
					<label className="text-[12px] font-medium text-slate-700">
						<span className="admin-label">Hạn định</span>
						<input className="admin-input" value={form.deadlineText} onChange={(e) => setForm((draft) => ({ ...draft, deadlineText: e.target.value }))} />
					</label>
					<label className="text-[12px] font-medium text-slate-700 xl:col-span-3">
						<span className="admin-label">Tên lỗi</span>
						<input className="admin-input" value={form.defectName} onChange={(e) => setForm((draft) => ({ ...draft, defectName: e.target.value }))} />
					</label>
					<label className="text-[12px] font-medium text-slate-700">
						<span className="admin-label">Phụ trách</span>
						<input className="admin-input" value={form.ownerName} onChange={(e) => setForm((draft) => ({ ...draft, ownerName: e.target.value }))} />
					</label>
					<label className="text-[12px] font-medium text-slate-700 xl:col-span-2">
						<span className="admin-label">Biện pháp</span>
						<textarea className="admin-textarea admin-textarea-sm" value={form.actionPlan} onChange={(e) => setForm((draft) => ({ ...draft, actionPlan: e.target.value }))} />
					</label>
					<label className="text-[12px] font-medium text-slate-700 xl:col-span-3">
						<span className="admin-label">Tình trạng tiến độ</span>
						<textarea className="admin-textarea admin-textarea-sm" value={form.progressStatus} onChange={(e) => setForm((draft) => ({ ...draft, progressStatus: e.target.value }))} />
					</label>
					<label className="text-[12px] font-medium text-slate-700 xl:col-span-3">
						<span className="admin-label">Ghi chú</span>
						<textarea className="admin-textarea admin-textarea-sm" value={form.note} onChange={(e) => setForm((draft) => ({ ...draft, note: e.target.value }))} />
					</label>
				</div>

				<div className="flex flex-col gap-3 border-t border-slate-100 pt-3 xl:flex-row xl:items-center xl:justify-between">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<label className={inlineCheckboxLabelClass}>
							<input
								type="checkbox"
								className="admin-checkbox"
								checked={form.warningBg}
								onChange={(e) => setForm((draft) => ({ ...draft, warningBg: e.target.checked }))}
							/>
							Nền cảnh báo
						</label>
						<label className={inlineCheckboxLabelClass}>
							<input
								type="checkbox"
								className="admin-checkbox"
								checked={form.redText}
								onChange={(e) => setForm((draft) => ({ ...draft, redText: e.target.checked }))}
							/>
							Chữ đỏ
						</label>
					</div>
					<button type="button" disabled={busy === "create" || !form.productName.trim()} className={primaryButtonClass} onClick={() => void createManualLine()}>
						{busy === "create" ? "Đang thêm..." : "Thêm dòng"}
					</button>
				</div>
			</section>

			<section className="admin-card admin-card-pad space-y-4">
				<div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
					<div className="min-w-0 space-y-1">
						<h2 className="admin-section-title">Import Excel theo mẫu mới</h2>
						<p className="admin-copy">
							Hỗ trợ file có merge cell theo sản phẩm và cố gắng giữ nền màu hoặc chữ đỏ tại các ô cần theo dõi, nhưng giao diện preview được nén gọn hơn để
							dễ xem trên laptop.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2 xl:justify-end">
						<div className="min-w-[138px]">
							<select className="admin-select" value={importMode} onChange={(e) => setImportMode(e.target.value as "append" | "upsert")}>
								<option value="append">Append mode</option>
								<option value="upsert">Upsert mode</option>
							</select>
						</div>
						<label className={`${secondaryButtonClass} cursor-pointer gap-2`}>
							<input
								type="file"
								accept=".xlsx,.xls"
								className="hidden"
								onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
							/>
							<span className="max-w-[220px] truncate">{importFile ? importFile.name : "Chọn file Excel"}</span>
						</label>
						<button type="button" disabled={!importFile || busy === "preview"} className={secondaryButtonClass} onClick={() => void runPreview()}>
							{busy === "preview" ? "Đang preview..." : "Preview import"}
						</button>
						<button type="button" disabled={!importFile || busy === "commit"} className={primaryButtonClass} onClick={() => void commitImport()}>
							{busy === "commit" ? "Đang import..." : "Import chính thức"}
						</button>
					</div>
				</div>

				<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-3 py-3">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<div className="text-[13px] font-semibold text-slate-900">Chưa có file mẫu để import?</div>
							<p className="admin-copy mt-1">
								Tải đúng template Excel mới để nhập tay hoặc cập nhật lại dữ liệu rồi import, tránh phát sinh cột thừa làm bảng bị rộng bất hợp lý.
							</p>
						</div>
						<a className={secondaryButtonClass} href="/api/quality-issues/excel-template">
							Tải file mẫu Excel
						</a>
					</div>
				</div>

				{preview ? (
					<div className="grid gap-3 xl:grid-cols-[250px_minmax(0,1fr)]">
						<div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[12px] leading-5 text-slate-700">
							<div className="text-[13px] font-semibold text-slate-900">Kết quả preview</div>
							<dl className="mt-3 space-y-2">
								<div className="flex items-center justify-between gap-4">
									<dt className="text-slate-500">Sheet</dt>
									<dd className="text-right font-medium text-slate-800">{preview.sheetName}</dd>
								</div>
								<div className="flex items-center justify-between gap-4">
									<dt className="text-slate-500">Tổng dòng</dt>
									<dd className="font-medium text-slate-800">{preview.totalRows}</dd>
								</div>
								<div className="flex items-center justify-between gap-4">
									<dt className="text-slate-500">Hợp lệ</dt>
									<dd className="font-medium text-slate-800">{preview.validRows}</dd>
								</div>
								<div className="flex items-center justify-between gap-4">
									<dt className="text-slate-500">Nhóm mới</dt>
									<dd className="font-medium text-slate-800">{preview.createdNewGroups}</dd>
								</div>
								<div className="flex items-center justify-between gap-4">
									<dt className="text-slate-500">Append nhóm cũ</dt>
									<dd className="font-medium text-slate-800">{preview.appendedExistingGroups}</dd>
								</div>
								<div className="flex items-center justify-between gap-4">
									<dt className="text-slate-500">Bỏ qua</dt>
									<dd className="font-medium text-slate-800">{preview.skippedRows}</dd>
								</div>
								<div className="flex items-center justify-between gap-4">
									<dt className="text-slate-500">Lỗi</dt>
									<dd className={`font-medium ${preview.errorRows ? "text-red-700" : "text-slate-800"}`}>{preview.errorRows}</dd>
								</div>
							</dl>
						</div>

						<div className="space-y-3">
							<div className="rounded-xl border border-slate-200 bg-white p-3">
								<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
									<div className="text-[13px] font-semibold text-slate-900">Các dòng import dự kiến</div>
									<span className="text-[11px] text-slate-500">Hiển thị tối đa 30 dòng</span>
								</div>
								<div className="max-h-[260px] overflow-auto rounded-lg border border-slate-100">
									<table className="admin-mini-table min-w-[640px]">
										<thead>
											<tr>
												<th>Dòng</th>
												<th>Hành động</th>
												<th>Nhóm</th>
												<th>Mô tả</th>
											</tr>
										</thead>
										<tbody>
											{preview.items.slice(0, 30).map((item) => (
												<tr key={`${item.rowNumber}-${item.action}-${item.groupLabel}`}>
													<td>{item.rowNumber}</td>
													<td>{item.action}</td>
													<td>{item.groupLabel}</td>
													<td>{item.message}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							{preview.errors.length ? (
								<div className="rounded-xl border border-red-200 bg-red-50 p-3">
									<div className="mb-2 text-[13px] font-semibold text-red-900">Lỗi cần xử lý</div>
									<ul className="max-h-[190px] space-y-1 overflow-auto text-[12px] leading-5 text-red-800">
										{preview.errors.map((item) => (
											<li key={`${item.rowNumber}-${item.message}`}>
												Dòng {item.rowNumber}: {item.message}
											</li>
										))}
									</ul>
								</div>
							) : null}
						</div>
					</div>
				) : null}

				{importLogs.length ? (
					<div className="rounded-xl border border-slate-200 bg-white p-3">
						<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
							<div className="text-[13px] font-semibold text-slate-900">Import gần đây</div>
							<span className="text-[11px] text-slate-500">Lịch sử mới nhất: {Math.min(importLogs.length, 12)} file</span>
						</div>
						<ul className="admin-log-list">
							{importLogs.map((log) => (
								<li key={log.id} className="admin-log-item">
									<span>{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
									<span className="font-medium text-slate-800">{log.fileName}</span>
									<span className="admin-badge">OK {log.successRows}/{log.totalRows}</span>
									<span className={log.errorRows ? dangerBadgeClass : "admin-badge"}>Lỗi {log.errorRows}</span>
									<span className="admin-badge">Nhóm mới {log.createdNewGroups}</span>
									<span className="admin-badge">Append {log.appendedExistingGroups}</span>
									<span className="admin-badge">Skip {log.skippedRows}</span>
									<span className="admin-badge">Mode {log.mode}</span>
									{log.importedBy ? <span>Người import: {log.importedBy}</span> : null}
									{log.errorFilePath ? (
										<a className="font-medium text-sky-700 hover:underline" href={log.errorFilePath}>
											Tải file lỗi
										</a>
									) : null}
								</li>
							))}
						</ul>
					</div>
				) : null}
			</section>

			<section className="space-y-3">
				<div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
					<div className="space-y-1">
						<h2 className="admin-section-title">Bảng theo dõi hàng lỗi chất lượng</h2>
						<p className="admin-copy">
							Bảng edit được thu gọn theo kiểu dashboard nội bộ: cột ngắn không còn bị phình rộng, hàng mặc định thấp hơn và textarea chỉ mở rộng thêm khi
							bạn focus để chỉnh sửa.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="admin-badge">{groups.length} nhóm sản phẩm</span>
						<span className="admin-badge">{totalLines} dòng chi tiết</span>
					</div>
				</div>

				<div className="admin-table-shell">
					<table className="min-w-[1624px] w-full table-fixed border-collapse text-[12px] leading-[1.35] text-slate-700 xl:text-[12.5px]">
						<colgroup>
							{tableColumnWidths.map((width, index) => (
								<col key={index} style={{ width }} />
							))}
						</colgroup>
						<thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
							<tr>
								<th className={`${tableHeadCellClass} text-center`}>STT</th>
								<th className={tableHeadCellClass}>Tên sản phẩm hỏng/lỗi</th>
								<th className={tableHeadCellClass}>Khách hàng</th>
								<th className={`${tableHeadCellClass} text-center`}>Mác thép</th>
								<th className={`${tableHeadCellClass} text-center`}>Tỉ lệ hỏng & xử lý</th>
								<th className={tableHeadCellClass}>Tên lỗi</th>
								<th className={tableHeadCellClass}>Biện pháp</th>
								<th className={tableHeadCellClass}>Tình trạng tiến độ</th>
								<th className={tableHeadCellClass}>Hạn định</th>
								<th className={tableHeadCellClass}>Phụ trách</th>
								<th className={tableHeadCellClass}>Ghi chú</th>
								<th className={`${tableHeadCellClass} text-center`}>Thao tác</th>
							</tr>
						</thead>
						<tbody>
							{groups.length === 0 ? (
								<tr>
									<td colSpan={12} className="px-4 py-10 text-center text-[12px] text-slate-500">
										Chưa có dữ liệu theo dõi lỗi chất lượng.
									</td>
								</tr>
							) : (
								groups.map((group, groupIndex) => {
									const currentGroupDraft = groupDraft(group);
									const rowToneClass = groupIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50";

									return group.lines.map((line, lineIndex) => {
										const currentLineDraft = lineDraft(line);
										return (
											<tr key={line.id} className={`${rowToneClass} border-b border-slate-200/80`}>
												{lineIndex === 0 ? (
													<>
														<td rowSpan={group.lines.length} className={`${tableGroupCellClass} text-center font-semibold text-slate-900`}>
															{group.stt}
														</td>
														<td rowSpan={group.lines.length} className={tableGroupCellClass}>
															<div className="space-y-2">
																<input
																	className="admin-inline-input font-medium"
																	value={currentGroupDraft.productName}
																	onChange={(e) => setGroupField(group.groupId, "productName", e.target.value, group)}
																/>
																<div className="flex flex-wrap gap-1.5">
																	<button
																		type="button"
																		disabled={busy === `group-${group.groupId}`}
																		className={tinySecondaryButtonClass}
																		onClick={() => void saveGroup(group)}
																	>
																		Lưu nhóm
																	</button>
																	<button
																		type="button"
																		disabled={busy === `tv-${group.groupId}`}
																		className={tinyWarnButtonClass}
																		onClick={() => void toggleTv(group)}
																	>
																		{group.hideFromTv ? "Hiện TV" : "Ẩn TV"}
																	</button>
																</div>
															</div>
														</td>
														<td rowSpan={group.lines.length} className={tableGroupCellClass}>
															<input
																className="admin-inline-input"
																value={currentGroupDraft.customerName}
																onChange={(e) => setGroupField(group.groupId, "customerName", e.target.value, group)}
															/>
														</td>
														<td rowSpan={group.lines.length} className={`${tableGroupCellClass} text-center`}>
															<input
																className="admin-inline-input text-center"
																value={currentGroupDraft.steelGrade}
																onChange={(e) => setGroupField(group.groupId, "steelGrade", e.target.value, group)}
															/>
														</td>
													</>
												) : null}

												<td className={`${tableLineCellClass} bg-amber-50/80`}>
													<input
														className="admin-inline-input text-center"
														value={currentLineDraft.defectRateText}
														onChange={(e) => setLineField(line.id, "defectRateText", e.target.value, line)}
													/>
												</td>
												<td className={`${tableLineCellClass} bg-rose-50/80`}>
													<textarea
														className="admin-inline-textarea admin-inline-textarea-compact"
														value={currentLineDraft.defectName}
														onChange={(e) => setLineField(line.id, "defectName", e.target.value, line)}
													/>
												</td>
												<td className={tableLineCellClass}>
													<textarea
														className="admin-inline-textarea"
														value={currentLineDraft.actionPlan}
														onChange={(e) => setLineField(line.id, "actionPlan", e.target.value, line)}
													/>
												</td>
												<td className={`${tableLineCellClass} bg-sky-50/75`}>
													<textarea
														className="admin-inline-textarea admin-inline-textarea-compact"
														value={currentLineDraft.progressStatus}
														onChange={(e) => setLineField(line.id, "progressStatus", e.target.value, line)}
													/>
												</td>
												<td className={tableLineCellClass}>
													<input
														className="admin-inline-input"
														value={currentLineDraft.deadlineText}
														onChange={(e) => setLineField(line.id, "deadlineText", e.target.value, line)}
													/>
												</td>
												<td className={tableLineCellClass}>
													<input
														className="admin-inline-input"
														value={currentLineDraft.ownerName}
														onChange={(e) => setLineField(line.id, "ownerName", e.target.value, line)}
													/>
												</td>
												<td className={tableLineCellClass}>
													<textarea
														className="admin-inline-textarea"
														value={currentLineDraft.note}
														onChange={(e) => setLineField(line.id, "note", e.target.value, line)}
													/>
												</td>
												<td className={`${tableLineCellClass} bg-slate-50/80`}>
													<div className="space-y-1.5">
														<label className={inlineCheckboxLabelClass}>
															<input
																type="checkbox"
																className="admin-checkbox"
																checked={currentLineDraft.warningBg}
																onChange={(e) => setLineField(line.id, "warningBg", e.target.checked, line)}
															/>
															Nền cảnh báo
														</label>
														<label className={inlineCheckboxLabelClass}>
															<input
																type="checkbox"
																className="admin-checkbox"
																checked={currentLineDraft.redText}
																onChange={(e) => setLineField(line.id, "redText", e.target.checked, line)}
															/>
															Chữ đỏ
														</label>
														<div className="flex flex-wrap gap-1.5 pt-0.5">
															<button
																type="button"
																disabled={busy === `line-${line.id}`}
																className={tinySecondaryButtonClass}
																onClick={() => void saveLine(line)}
															>
																Lưu dòng
															</button>
															<button
																type="button"
																disabled={busy === `del-${line.id}`}
																className={tinyDangerButtonClass}
																onClick={() => void removeLine(line.id)}
															>
																Xóa
															</button>
														</div>
													</div>
												</td>
											</tr>
										);
									});
								})
							)}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}
