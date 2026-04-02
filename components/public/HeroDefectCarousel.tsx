 "use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { DefectSeverityBadge } from "./DefectSeverityBadge";
import LightboxGallery from "./LightboxGallery";
import Link from "next/link";

export type HeroItem = {
	id: string;
	name: string;
	code: string;
	slug: string;
	shortDescription: string | null;
	severity: string;
	imageUrl: string | null;
	mimeType?: string | null;
};

export function HeroDefectCarousel({
	items,
	intervalMs = 6000,
	height = "85vh"
}: {
	items: HeroItem[];
	intervalMs?: number;
	height?: string;
}) {
	const [index, setIndex] = useState(0);
	const timerRef = useRef<number | null>(null);
	const count = items.length;
	const current = items[index];
	const [open, setOpen] = useState(false);
	const [paused, setPaused] = useState(false);

	useEffect(() => {
		if (count <= 1 || paused || open) return;
		timerRef.current = window.setInterval(() => {
			setIndex((i) => (i + 1) % count);
		}, intervalMs);
		return () => {
			if (timerRef.current) window.clearInterval(timerRef.current);
		};
	}, [count, intervalMs, paused, open]);

	if (count === 0) {
		return <div className="card p-10 text-center muted">No active defects to display.</div>;
	}

	function go(i: number) {
		setIndex((i + count) % count);
	}

	async function loadGallery() {
		const slug = items[index]?.slug;
		if (!slug) return [];
		const r = await fetch(`/api/public/defects/${slug}`);
		if (!r.ok) return [];
		const d = await r.json();
		const gallery = (d?.images ?? []) as { id: string; url: string; altText?: string | null; mimeType?: string; isActive?: boolean; deletedAt?: string | null }[];
		return gallery
			.filter((x) => x.isActive && !x.deletedAt)
			.map((g) => ({ id: g.id, url: g.url, alt: g.altText || d.name, mimeType: g.mimeType }));
	}

	return (
		<div
			className="relative w-full h-full overflow-hidden"
			style={{ height }}
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
		>
			<AnimatePresence initial={false} mode="wait">
				<motion.div
					key={current.id}
					className="absolute inset-0"
					initial={{ opacity: 0.4, scale: 1.02 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0.4, scale: 0.995 }}
					transition={{ duration: 0.9, ease: "easeOut" }}
				>
					{current.imageUrl ? (
						current.mimeType?.startsWith("video/") ? (
							<>
								<video
									src={current.imageUrl}
									className="w-full h-full object-cover blur-xl scale-110 opacity-35"
									autoPlay
									muted
									loop
									playsInline
								/>
								<video
									src={current.imageUrl}
									className="absolute inset-0 w-full h-full object-contain cursor-zoom-in"
									autoPlay
									muted
									loop
									playsInline
									onClick={() => {
										setPaused(true);
										setOpen(true);
									}}
								/>
							</>
						) : (
							<>
								<Image src={current.imageUrl} alt={current.name} fill className="object-cover blur-xl scale-110 opacity-35" priority />
								<Image
									src={current.imageUrl}
									alt={current.name}
									fill
									className="object-contain cursor-zoom-in"
									priority
									onClick={() => {
										setPaused(true);
										setOpen(true);
									}}
								/>
							</>
						)
					) : (
						<div className="w-full h-full grid place-items-center text-text-muted">Chưa có ảnh</div>
					)}
					{/* Soft gradient for text legibility */}
					<div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent mix-blend-multiply pointer-events-none" />
				</motion.div>
			</AnimatePresence>

			{/* Overlay caption: compact corner card so image remains dominant */}
			<div className="absolute left-3 md:left-6 bottom-6 md:bottom-8">
				<div className="w-[min(420px,calc(100vw-2rem))] glass rounded-xl p-3 md:p-4">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg md:text-xl font-semibold text-text">{current.name}</h3>
						<DefectSeverityBadge severity={current.severity} />
					</div>
					<p className="text-text-soft mt-1 text-sm line-clamp-2">{current.shortDescription ?? ""}</p>
					<p className="text-xs text-text-muted mt-1">{current.code}</p>
					<div className="mt-2 flex items-center gap-3">
						<button className="underline text-sm" onClick={() => setOpen(true)}>
							Xem ảnh
						</button>
						<Link className="underline text-sm" href={`/defects/${current.slug}`}>
							Chi tiết
						</Link>
					</div>
				</div>
			</div>

			{/* Controls - centered vertically for better visibility on large screens */}
			<div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-3 md:px-6 flex items-center justify-between pointer-events-none">
				<button
					aria-label="Trước"
					className="pointer-events-auto rounded-full w-12 h-12 md:w-14 md:h-14 text-lg md:text-xl bg-white/35 hover:bg-white/80 text-slate-800 transition-all duration-200 shadow-md"
					onClick={() => go(index - 1)}
				>
					‹
				</button>
				<button
					aria-label="Sau"
					className="pointer-events-auto rounded-full w-12 h-12 md:w-14 md:h-14 text-lg md:text-xl bg-white/35 hover:bg-white/80 text-slate-800 transition-all duration-200 shadow-md"
					onClick={() => go(index + 1)}
				>
					›
				</button>
			</div>

			{/* Progress dots */}
			<div className="absolute left-0 right-0 bottom-3 flex items-center justify-center gap-1.5">
				{items.map((_, i) => (
					<button
						key={i}
						onClick={() => go(i)}
						className={`h-1.5 rounded-full transition-all ${i === index ? "w-10 bg-primary" : "w-3 bg-white/60"}`}
						aria-label={`Tới slide ${i + 1}`}
					/>
				))}
			</div>

			<LightboxGallery
				isOpen={open}
				onClose={() => {
					setOpen(false);
					setPaused(false);
				}}
				loadItems={loadGallery}
			/>
		</div>
	);
}
