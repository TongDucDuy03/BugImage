 "use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DefectCarouselCard, CarouselCardDefect } from "./DefectCarouselCard";

export function DefectCarousel({ items, intervalMs = 4000 }: { items: CarouselCardDefect[]; intervalMs?: number }) {
	const [index, setIndex] = useState(0);
	const timerRef = useRef<number | null>(null);
	const count = items.length;
	const extended = useMemo(() => items, [items]);

	function next() {
		setIndex((i) => (i + 1) % count);
	}
	function prev() {
		setIndex((i) => (i - 1 + count) % count);
	}

	useEffect(() => {
		if (count <= 1) return;
		timerRef.current = window.setInterval(() => next(), intervalMs);
		return () => {
			if (timerRef.current) window.clearInterval(timerRef.current);
		};
	}, [count, intervalMs]);

	if (count === 0) {
		return <div className="card p-10 text-center muted">No active defects to display.</div>;
	}

	const center = extended[index];
	const left = extended[(index - 1 + count) % count];
	const right = extended[(index + 1) % count];

	return (
		<div className="relative">
			<div className="flex items-center justify-between mb-4">
				<div className="flex-1" />
				<div className="flex items-center gap-2">
					<button aria-label="Previous" className="rounded-full border border-bg-muted/50 px-3 py-1 hover:bg-bg-muted" onClick={prev}>
						‹
					</button>
					<button aria-label="Next" className="rounded-full border border-bg-muted/50 px-3 py-1 hover:bg-bg-muted" onClick={next}>
						›
					</button>
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-stretch">
				<AnimatePresence initial={false} mode="popLayout">
					<motion.div key={left?.id ?? "left"} className="hidden md:block">
						<DefectCarouselCard defect={left} />
					</motion.div>
					<motion.div key={center.id} layout className="col-span-1 md:col-span-1 md:scale-105">
						<DefectCarouselCard defect={center} active />
					</motion.div>
					<motion.div key={right?.id ?? "right"} className="hidden md:block">
						<DefectCarouselCard defect={right} />
					</motion.div>
				</AnimatePresence>
			</div>
			<div className="mt-4 flex items-center justify-center gap-1">
				{items.map((_, i) => (
					<button
						key={i}
						onClick={() => setIndex(i)}
						className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-primary" : "w-3 bg-bg-muted"}`}
						aria-label={`Go to slide ${i + 1}`}
					/>
				))}
			</div>
		</div>
	);
}

