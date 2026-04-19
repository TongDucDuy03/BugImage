"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export function TvDisplay() {
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const [items, setItems] = useState<QualityIssueGroupPayload[]>([]);
	const [stats, setStats] = useState<ApiResponse["stats"] | null>(null);
	const [clock, setClock] = useState(() => new Date());
	const [config, setConfig] = useState({
		scrollPxPerTick: 0.4,
		pauseMs: 3000,
		refreshSec: 120
	});

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setConfig({
			scrollPxPerTick: Number(params.get("speed") ?? "0.4") || 0.4,
			pauseMs: Number(params.get("pause") ?? "3000") || 3000,
			refreshSec: Number(params.get("refresh") ?? "120") || 120
		});
	}, []);

	const { scrollPxPerTick, pauseMs, refreshSec } = config;

	const totalLines = useMemo(() => items.reduce((sum, group) => sum + group.lines.length, 0), [items]);

	const load = useCallback(async () => {
		const params = new URLSearchParams();
		params.set("tv", "1");

		const res = await fetch(`/api/public/quality-issues?${params.toString()}`);
		if (!res.ok) return;

		const data = (await res.json()) as ApiResponse;
		setItems(data.items);
		setStats(data.stats);
	}, []);

	useEffect(() => {
		void load();
		const id = window.setInterval(() => void load(), refreshSec * 1000);
		return () => window.clearInterval(id);
	}, [load, refreshSec]);

	useEffect(() => {
		const id = window.setInterval(() => setClock(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	useEffect(() => {
		const el = scrollerRef.current;
		if (!el) return;

		let raf = 0;
		let pauseUntil = performance.now() + pauseMs;
		let position = 0;
		let isHovered = false;
		let userScrolling = false;
		let userScrollTimer = 0;
		let programmaticScrollUntil = 0;

		el.scrollTo({ top: 0 });

		const pauseFor = (ms: number) => {
			pauseUntil = Math.max(pauseUntil, performance.now() + ms);
		};

		const isProgrammaticScroll = () => performance.now() < programmaticScrollUntil;

		const setProgrammaticScrollTop = (nextTop: number) => {
			programmaticScrollUntil = performance.now() + 120;
			position = nextTop;
			el.scrollTop = nextTop;
		};

		const onPointerEnter = () => { isHovered = true; };
		const onPointerLeave = () => { isHovered = false; pauseFor(1200); };
		const onPointerDown  = () => { pauseFor(6000); };
		const onWheel        = () => { pauseFor(3000); };

		const onScroll = () => {
			position = el.scrollTop;
			if (isProgrammaticScroll()) return;

			// Khi user scroll thủ công, đồng bộ position và dừng tạm
			if (!userScrolling) {
				userScrolling = true;
			}
			pauseFor(2500);
			clearTimeout(userScrollTimer);
			userScrollTimer = window.setTimeout(() => {
				userScrolling = false;
			}, 100);
		};

		el.addEventListener("pointerenter", onPointerEnter);
		el.addEventListener("pointerleave", onPointerLeave);
		el.addEventListener("pointerdown", onPointerDown);
		el.addEventListener("wheel", onWheel, { passive: true });
		el.addEventListener("scroll", onScroll, { passive: true });

		const tick = () => {
			const now = performance.now();

			if (isHovered || userScrolling || now < pauseUntil) {
				raf = requestAnimationFrame(tick);
				return;
			}

			const max = el.scrollHeight - el.clientHeight;
			if (max <= 0) {
				raf = requestAnimationFrame(tick);
				return;
			}

			if (position >= max - 1) {
				// Đến cuối: reset về đầu và nghỉ
				setProgrammaticScrollTop(0);
				pauseUntil = now + pauseMs;
			} else {
				setProgrammaticScrollTop(Math.min(position + scrollPxPerTick, max));
			}

			raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(userScrollTimer);
			el.removeEventListener("pointerenter", onPointerEnter);
			el.removeEventListener("pointerleave", onPointerLeave);
			el.removeEventListener("pointerdown", onPointerDown);
			el.removeEventListener("wheel", onWheel);
			el.removeEventListener("scroll", onScroll);
		};
	}, [pauseMs, scrollPxPerTick, items.length, totalLines]);

	const topDefect = stats?.topDefects[0] ?? null;
	const topProduct = stats?.topProducts[0] ?? null;

	return (
		<div className="fixed inset-0 flex flex-col bg-slate-950 text-slate-50">
			<header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
				<div>
					<div className="text-xs uppercase tracking-[0.2em] text-slate-400">Quality Issue Tracker</div>
					<div className="text-3xl font-semibold tracking-tight">Các hạng mục theo dõi hàng lỗi chất lượng</div>
					<div className="mt-1 text-sm text-slate-300">
						{clock.toLocaleString("vi-VN")}
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2 text-sm text-slate-300">
					<div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						Nhóm SP: <span className="font-semibold text-white">{stats?.groups ?? "—"}</span>
					</div>
					<div className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5">
						Dòng chi tiết: <span className="font-semibold text-sky-100">{stats?.lines ?? "—"}</span>
					</div>
					{topDefect ? (
						<div className="rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1.5">
							Top lỗi: <span className="font-semibold text-rose-100">{topDefect.name}</span> ({topDefect.count})
						</div>
					) : null}
					{topProduct ? (
						<div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5">
							Top SP: <span className="font-semibold text-amber-100">{topProduct.name}</span> ({topProduct.count})
						</div>
					) : null}
					<Link className="mt-2 inline-block text-sky-300 hover:underline" href="/">
						← Dashboard
					</Link>
				</div>
			</header>

			<main className="min-h-0 flex-1 px-4 pb-4 pt-3">
				<div ref={scrollerRef} className="h-full overflow-auto rounded-2xl border border-white/10 bg-white/[0.03]">
					<QualityIssueTable groups={items} variant="tv" />
				</div>
			</main>
		</div>
	);
}
