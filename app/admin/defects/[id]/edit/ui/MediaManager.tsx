 "use client";
import { useState } from "react";
import type { DefectImage } from "@prisma/client";

export default function MediaManager({ defectId, images }: { defectId: string; images: DefectImage[] }) {
	const [items, setItems] = useState(images);
	const [uploading, setUploading] = useState(false);
	const [reordering, setReordering] = useState(false);

	async function uploadNew(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		const fd = new FormData();
		fd.append("file", file);
		fd.append("defectId", defectId);
		const r = await fetch("/api/uploads", { method: "POST", body: fd });
		setUploading(false);
		if (r.ok) {
			const created = await r.json();
			setItems((prev) => [...prev, created]);
		}
	}

	async function replaceImage(id: string, file: File) {
		const fd = new FormData();
		fd.append("file", file);
		const r = await fetch(`/api/defect-images/${id}/replace`, { method: "POST", body: fd });
		if (r.ok) {
			const updated = await r.json();
			setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
		}
	}

	async function toggleActive(id: string) {
		const r = await fetch(`/api/defect-images/${id}/toggle-active`, { method: "POST" });
		if (r.ok) {
			const updated = await r.json();
			setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
		}
	}

	async function setCover(imageId: string) {
		await fetch(`/api/defects/${defectId}/set-cover`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ imageId })
		});
		setItems((prev) => prev.map((x) => ({ ...x, isCover: x.id === imageId })));
	}

	async function remove(id: string) {
		const r = await fetch(`/api/defect-images/${id}`, { method: "DELETE" });
		if (r.ok) {
			setItems((prev) => prev.filter((x) => x.id !== id));
		}
	}

	async function reorder(moveId: string, dir: -1 | 1) {
		setReordering(true);
		setItems((prev) => {
			const arr = [...prev];
			const idx = arr.findIndex((x) => x.id === moveId);
			if (idx < 0) return prev;
			const newIdx = Math.max(0, Math.min(arr.length - 1, idx + dir));
			const [spliced] = arr.splice(idx, 1);
			arr.splice(newIdx, 0, spliced);
			return arr.map((x, i) => ({ ...x, sortOrder: i + 1 }));
		});
		const orders = items.map((x, i) => ({ id: x.id, sortOrder: i + 1 }));
		await fetch(`/api/defects/${defectId}/images/reorder`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ orders })
		});
		setReordering(false);
	}

	return (
		<div className="card p-4 md:p-5">
			<div className="flex items-center justify-between mb-3">
				<label className="rounded-md border border-bg-muted px-3 py-2 cursor-pointer hover:bg-bg-muted">
					<input type="file" className="hidden" onChange={uploadNew} accept="image/*,video/*" />
					{uploading ? "Đang tải..." : "Tải media lên"}
				</label>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
				{items.map((img) => (
					<div key={img.id} className="relative group rounded-xl overflow-hidden border border-bg-muted">
						{img.mimeType?.startsWith("video/") ? (
							<video src={img.url} className="h-40 w-full object-cover" controls muted />
						) : (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={img.url} alt={img.altText ?? ""} className="h-40 w-full object-cover" />
						)}
						<div className="absolute left-2 top-2">
							{img.isCover ? <span className="glass rounded-md px-2 py-0.5 text-xs">Đại diện</span> : null}
						</div>
						<div className="absolute inset-x-0 bottom-0 p-2 flex flex-wrap gap-1 justify-center bg-white/70 backdrop-blur-sm">
							<button className="text-xs underline" onClick={() => setCover(img.id)}>
								Đặt đại diện
							</button>
							<label className="text-xs underline cursor-pointer">
								<input
									type="file"
									className="hidden"
									accept="image/*,video/*"
									onChange={(e) => {
										const f = e.target.files?.[0];
										if (f) replaceImage(img.id, f);
									}}
								/>
								Thay media
							</label>
							<button className="text-xs underline" onClick={() => toggleActive(img.id)}>
								{img.isActive ? "Ẩn" : "Hiện"}
							</button>
							<button className="text-xs underline text-danger" onClick={() => remove(img.id)}>
								Xóa
							</button>
							<div className="flex items-center gap-1">
								<button className="text-xs" onClick={() => reorder(img.id, -1)}>
									↑
								</button>
								<button className="text-xs" onClick={() => reorder(img.id, 1)}>
									↓
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
			{reordering ? <div className="mt-2 text-xs muted">Đang lưu thứ tự...</div> : null}
		</div>
	);
}
