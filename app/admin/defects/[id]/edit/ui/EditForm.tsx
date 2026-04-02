 "use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Defect } from "@prisma/client";
import { severityEnum } from "@/lib/validation";

export default function EditForm({ defect }: { defect: Defect }) {
	const router = useRouter();
	const [form, setForm] = useState({
		code: defect.code,
		name: defect.name,
		slug: defect.slug,
		shortDescription: defect.shortDescription ?? "",
		description: defect.description ?? "",
		cause: defect.cause ?? "",
		detectionMethod: defect.detectionMethod ?? "",
		solution: defect.solution ?? "",
		defectGroup: defect.defectGroup ?? "",
		processStage: defect.processStage ?? "",
		severity: defect.severity,
		isActive: defect.isActive,
		isFeatured: defect.isFeatured,
		sortOrder: defect.sortOrder
	});
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const res = await fetch(`/api/defects/${defect.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(form)
		});
		if (res.ok) router.push("/admin/defects");
		else setError("Failed to update");
	}

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			{error ? <div className="text-danger text-sm">Cập nhật thất bại</div> : null}
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
					onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
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
			<div className="flex gap-2">
				<button className="rounded-md bg-primary text-black px-4 py-2 font-medium">Lưu</button>
				<a href="/admin/defects" className="rounded-md border border-bg-muted/50 px-4 py-2">
					Hủy
				</a>
			</div>
			<div className="flex items-center gap-2">
				<input
					type="checkbox"
					checked={form.isFeatured}
					onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
				/>
				<label>Nổi bật (Featured)</label>
			</div>
		</form>
	);
}

