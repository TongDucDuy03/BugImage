"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewDailyReportPage() {
	const router = useRouter();
	const [reportDate, setReportDate] = useState(() => {
		const d = new Date();
		return d.toISOString().slice(0, 10);
	});
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		const res = await fetch("/api/daily-reports", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ reportDate })
		});
		setLoading(false);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không tạo được báo cáo.");
			return;
		}
		const created = await res.json();
		router.push(`/admin/reports/${created.id}/edit`);
	}

	return (
		<div className="mx-auto max-w-lg space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Tạo báo cáo ngày</h1>
				<p className="text-sm text-text-muted">Chọn ngày báo cáo — mỗi ngày chỉ một báo cáo.</p>
			</div>

			<form onSubmit={onSubmit} className="card space-y-4 p-6">
				<label className="block space-y-1">
					<span className="text-sm font-medium">Ngày báo cáo</span>
					<input
						className="w-full rounded-xl border border-bg-muted bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
						type="date"
						value={reportDate}
						onChange={(e) => setReportDate(e.target.value)}
						required
					/>
				</label>

				{error ? <p className="text-sm text-danger">{error}</p> : null}

				<div className="flex flex-wrap gap-3">
					<button
						type="submit"
						disabled={loading}
						className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
					>
						{loading ? "Đang tạo…" : "Tạo và nhập liệu"}
					</button>
					<Link className="rounded-xl border border-bg-muted px-4 py-2 text-sm hover:bg-bg-muted/40" href="/admin/reports">
						Hủy
					</Link>
				</div>
			</form>
		</div>
	);
}
