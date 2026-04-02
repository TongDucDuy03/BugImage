 "use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type GalleryItem = { id: string; url: string; alt?: string | null; mimeType?: string };

export default function LightboxGallery({
	isOpen,
	onClose,
	loadItems
}: {
	isOpen: boolean;
	onClose: () => void;
	loadItems: () => Promise<GalleryItem[]>;
}) {
	const [items, setItems] = useState<GalleryItem[]>([]);
	const [index, setIndex] = useState(0);
	const [scale, setScale] = useState(1);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		loadItems().then((it) => {
			setItems(it);
			setIndex(0);
			setScale(1);
		});
	}, [isOpen, loadItems]);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (!isOpen) return;
			if (e.key === "Escape") onClose();
			if (e.key === "ArrowRight") setIndex((i) => Math.min((items.length || 1) - 1, i + 1));
			if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, items.length, onClose]);

	function onWheel(e: React.WheelEvent) {
		if (!e.ctrlKey) return;
		e.preventDefault();
		setScale((s) => Math.max(1, Math.min(4, s + (e.deltaY > 0 ? -0.1 : 0.1))));
	}

	if (!isOpen) return null;
	const cur = items[index];

	return (
		<div className="fixed inset-0 z-50 bg-black/80 text-white">
			<button
				className="fixed z-[70] right-4 top-4 bg-white/25 hover:bg-white/35 rounded-full px-3 py-1.5 border border-white/30"
				onClick={onClose}
			>
				Đóng
			</button>
			<div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 h-full p-4 md:p-6">
				<div
					ref={containerRef}
					className="relative rounded-lg overflow-hidden border border-white/20 flex items-center justify-center"
					onWheel={onWheel}
				>
					{cur ? (
						<div className="relative" style={{ transform: `scale(${scale})`, transition: "transform .2s ease" }}>
							{cur.mimeType?.startsWith("video/") ? (
								<video src={cur.url} className="object-contain max-h-[85vh] w-auto" controls autoPlay />
							) : (
								<Image src={cur.url} alt={cur.alt ?? ""} width={1400} height={900} className="object-contain max-h-[85vh] w-auto" />
							)}
						</div>
					) : null}
					<div className="absolute left-2 top-1/2 -translate-y-1/2">
						<button
							className="bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5"
							onClick={() => setIndex((i) => Math.max(0, i - 1))}
						>
							‹
						</button>
					</div>
					<div className="absolute right-2 top-1/2 -translate-y-1/2">
						<button
							className="bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5"
							onClick={() => setIndex((i) => Math.min((items.length || 1) - 1, i + 1))}
						>
							›
						</button>
					</div>
					<div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex items-center gap-2">
						<button className="bg-white/20 hover:bg-white/30 rounded px-2 py-1" onClick={() => setScale((s) => Math.max(1, s - 0.25))}>
							-
						</button>
						<span className="text-xs">{Math.round(scale * 100)}%</span>
						<button className="bg-white/20 hover:bg-white/30 rounded px-2 py-1" onClick={() => setScale((s) => Math.min(4, s + 0.25))}>
							+
						</button>
						<button className="bg-white/20 hover:bg-white/30 rounded px-2 py-1" onClick={() => setScale(1)}>
							Reset
						</button>
					</div>
				</div>
				<div className="hidden md:block rounded-lg overflow-auto border border-white/20 p-2">
					<div className="grid grid-cols-2 gap-2">
						{items.map((it, i) =>
							it.mimeType?.startsWith("video/") ? (
								<video
									key={it.id}
									src={it.url}
									className={`h-24 w-full object-cover rounded cursor-pointer ${i === index ? "ring-2 ring-sky-400" : ""}`}
									onClick={() => {
										setIndex(i);
										setScale(1);
									}}
								/>
							) : (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									key={it.id}
									src={it.url}
									alt={it.alt ?? ""}
									className={`h-24 w-full object-cover rounded cursor-pointer ${i === index ? "ring-2 ring-sky-400" : ""}`}
									onClick={() => {
										setIndex(i);
										setScale(1);
									}}
								/>
							)
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

