 "use client";
import { useRef, useState } from "react";

export type StagedItem = {
	id: string;
	file: File;
	previewUrl: string;
	mimeType: string;
	isCover: boolean;
	sortOrder: number;
};

export default function StagedMediaManager({
	onChange
}: {
	onChange: (items: StagedItem[]) => void;
}) {
	const [items, setItems] = useState<StagedItem[]>([]);
	const inputRef = useRef<HTMLInputElement | null>(null);

	function emit(next: StagedItem[]) {
		setItems(next);
		onChange(next);
	}

	function addFiles(files: FileList | null) {
		if (!files) return;
		const arr = Array.from(files).map((f, i) => ({
			id: crypto.randomUUID(),
			file: f,
			previewUrl: URL.createObjectURL(f),
			mimeType: f.type,
			isCover: false,
			sortOrder: items.length + i + 1
		}));
		const next = [...items, ...arr];
		// If no cover yet, set the first as cover
		if (!next.some((x) => x.isCover) && next.length > 0) next[0].isCover = true;
		emit(next);
	}

	function setCover(id: string) {
		emit(items.map((x) => ({ ...x, isCover: x.id === id })));
	}

	function remove(id: string) {
		const next = items.filter((x) => x.id !== id).map((x, i) => ({ ...x, sortOrder: i + 1 }));
		// keep first as cover if removed current cover
		if (!next.some((x) => x.isCover) && next[0]) next[0].isCover = true;
		emit(next);
	}

	function replaceFile(id: string, file: File) {
		emit(
			items.map((x) =>
				x.id === id
					? { ...x, file, previewUrl: URL.createObjectURL(file) }
					: x
			)
		);
	}

	function move(id: string, dir: -1 | 1) {
		const arr = [...items];
		const idx = arr.findIndex((x) => x.id === id);
		if (idx < 0) return;
		const newIdx = Math.max(0, Math.min(arr.length - 1, idx + dir));
		const [spliced] = arr.splice(idx, 1);
		arr.splice(newIdx, 0, spliced);
		emit(arr.map((x, i) => ({ ...x, sortOrder: i + 1 })));
	}

	return (
		<div className="card p-4 md:p-5">
			<div className="flex items-center justify-between mb-3">
				<label className="rounded-md border border-bg-muted px-3 py-2 cursor-pointer hover:bg-bg-muted">
					<input
						ref={inputRef}
						type="file"
						className="hidden"
						onChange={(e) => addFiles(e.target.files)}
						accept="image/*,video/*"
						multiple
					/>
					Thêm media
				</label>
			</div>
			{items.length === 0 ? <div className="muted text-sm">Chưa có media nào. Nhấn “Thêm media”.</div> : null}
			<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
				{items.map((img) => (
					<div key={img.id} className="relative group rounded-xl overflow-hidden border border-bg-muted">
						{img.mimeType.startsWith("video/") ? (
							<video src={img.previewUrl} className="h-40 w-full object-cover" controls muted />
						) : (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={img.previewUrl} alt="" className="h-40 w-full object-cover" />
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
										if (f) replaceFile(img.id, f);
									}}
								/>
								Thay media
							</label>
							<button className="text-xs underline text-danger" onClick={() => remove(img.id)}>
								Xóa
							</button>
							<div className="flex items-center gap-1">
								<button className="text-xs" onClick={() => move(img.id, -1)}>
									↑
								</button>
								<button className="text-xs" onClick={() => move(img.id, 1)}>
									↓
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

