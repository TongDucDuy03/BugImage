"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ToggleReportTvButtonProps = {
	reportId: string;
	hideFromTv: boolean;
};

export function ToggleReportTvButton({ reportId, hideFromTv }: ToggleReportTvButtonProps) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function toggle() {
		setBusy(true);
		setError(null);

		const res = await fetch(`/api/daily-reports/${reportId}/tv-visibility`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ hideFromTv: !hideFromTv })
		});

		setBusy(false);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data?.error ?? "Không cập nhật được hiển thị TV.");
			return;
		}

		router.refresh();
	}

	return (
		<div className="inline-flex flex-col items-start gap-1">
			<button
				type="button"
				disabled={busy}
				onClick={toggle}
				className={`rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
					hideFromTv
						? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
						: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
				}`}
			>
				{busy ? "Đang lưu..." : hideFromTv ? "Hiện TV" : "Ẩn TV"}
			</button>
			{error ? <span className="max-w-[160px] text-xs text-danger">{error}</span> : null}
		</div>
	);
}
