 "use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { severityEnum } from "@/lib/validation";
import type { Defect } from "@prisma/client";
import MediaManager from "../[id]/edit/ui/MediaManager";
import StagedMediaManager, { StagedItem } from "./StagedMediaManager";

export default function NewDefectPage() {
	const router = useRouter();

	function normalizeSlug(input: string) {
		return input
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9-]+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");
	}

	const slugRegex = /^[a-z0-9-]+$/;

	const [form, setForm] = useState({
		code: "",
		name: "",
		slug: "",
		shortDescription: "",
		description: "",
		cause: "",
		detectionMethod: "",
		solution: "",
		defectGroup: "",
		processStage: "",
		severity: "medium",
		isActive: true,
		isFeatured: false,
		sortOrder: 0
	});
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [created, setCreated] = useState<Defect | null>(null);
	const [staged, setStaged] = useState<StagedItem[]>([]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (submitting) return;
		if (staged.length === 0) {
			setError("Vui lòng thêm ít nhất 1 media trước khi tạo.");
			return;
		}

		const finalSlug = normalizeSlug(form.slug);
		if (!finalSlug || !slugRegex.test(finalSlug)) {
			setError("Slug không hợp lệ. Chỉ cho phép chữ thường, số và dấu '-'. Ví dụ: solder-bridge");
			return;
		}

		setSubmitting(true);
		setError(null);
		// Tạo defect
		const res = await fetch("/api/defects", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...form, slug: finalSlug })
		});
		if (!res.ok) {
			setSubmitting(false);
			const data = await res.json().catch(() => ({}));
			setError(
				data?.issues?.formErrors?.[0] ||
					data?.error ||
					"Tạo thất bại (vui lòng kiểm tra các trường: code/name/slug/severity)"
			);
			return;
		}
		const d: Defect = await res.json();
		// Upload staged images theo thứ tự + set cover
		for (let i = 0; i < staged.length; i++) {
			const fd = new FormData();
			fd.append("file", staged[i].file);
			fd.append("defectId", d.id);
			if (staged[i].isCover) fd.append("isCover", "true");
			await fetch("/api/uploads", { method: "POST", body: fd });
		}
		setSubmitting(false);
		// Về danh sách lỗi sau khi tạo xong
		router.push("/admin/defects");
	}

	return (
		<div className="max-w-2xl">
			<h1 className="text-xl font-semibold mb-4">Tạo lỗi mới</h1>
			<form onSubmit={onSubmit} className="space-y-4">
				{error ? <div className="text-danger text-sm">{error}</div> : null}
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="text-sm">Mã lỗi</label>
						<input
							className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2"
							required
							value={form.code}
							onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
						/>
					</div>
					<div>
						<label className="text-sm">Tên lỗi</label>
						<input
							className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2"
							required
							value={form.name}
							onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
						/>
					</div>
				</div>
				<div>
					<label className="text-sm">Đường dẫn (slug)</label>
					<input
						className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2"
						required
						value={form.slug}
						onChange={(e) => setForm((f) => ({ ...f, slug: normalizeSlug(e.target.value) }))}
					/>
				</div>
				<div>
					<label className="text-sm">Mô tả ngắn</label>
					<textarea
						className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2"
						value={form.shortDescription}
						onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
					/>
				</div>
				<div>
					<label className="text-sm">Mô tả chi tiết</label>
					<textarea
						className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2 min-h-24"
						value={form.description}
						onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
					/>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label className="text-sm">Nguyên nhân</label>
						<textarea
							className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2 min-h-24"
							value={form.cause}
							onChange={(e) => setForm((f) => ({ ...f, cause: e.target.value }))}
						/>
					</div>
					<div>
						<label className="text-sm">Cách nhận biết</label>
						<textarea
							className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2 min-h-24"
							value={form.detectionMethod}
							onChange={(e) => setForm((f) => ({ ...f, detectionMethod: e.target.value }))}
						/>
					</div>
				</div>
				<div>
					<label className="text-sm">Xử lý / Phòng tránh</label>
					<textarea
						className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2 min-h-24"
						value={form.solution}
						onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
					/>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label className="text-sm">Nhóm lỗi</label>
						<input
							className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2"
							value={form.defectGroup}
							onChange={(e) => setForm((f) => ({ ...f, defectGroup: e.target.value }))}
							placeholder="Ví dụ: Electrical / Appearance"
						/>
					</div>
					<div>
						<label className="text-sm">Công đoạn</label>
						<input
							className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2"
							value={form.processStage}
							onChange={(e) => setForm((f) => ({ ...f, processStage: e.target.value }))}
							placeholder="Ví dụ: SMT / Assembly / Packaging"
						/>
					</div>
				</div>
				<div className="grid grid-cols-3 gap-3">
					<div>
						<label className="text-sm">Mức độ</label>
						<select
							className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2"
							value={form.severity}
							onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
						>
							<option value="low">Thấp</option>
							<option value="medium">Trung bình</option>
							<option value="high">Cao</option>
							<option value="critical">Nghiêm trọng</option>
						</select>
					</div>
					<div>
						<label className="text-sm">Thứ tự</label>
						<input
							type="number"
							className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2"
							value={form.sortOrder}
							onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
						/>
					</div>
					<div className="flex items-end gap-2">
						<input
							type="checkbox"
							checked={form.isActive}
							onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
						/>
						<label>Kích hoạt</label>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={form.isFeatured}
						onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
					/>
					<label>Nổi bật (Featured)</label>
				</div>
				<div className="flex gap-2">
					<button className="rounded-md bg-primary text-black px-4 py-2 font-medium" disabled={submitting}>
						{submitting ? "Đang tạo..." : "Tạo"}
					</button>
					<a href="/admin/defects" className="rounded-md border border-bg-muted/50 px-4 py-2">
						Hủy
					</a>
				</div>
			</form>
			<div className="mt-8">
				<h2 className="text-lg font-semibold mb-3">Quản lý ảnh</h2>
				<StagedMediaManager onChange={setStaged} />
			</div>
		</div>
	);
}

