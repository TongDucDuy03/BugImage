import Link from "next/link";
import { prisma } from "@/lib/db";
import { ToggleReportTvButton } from "./ui/ToggleReportTvButton";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
	const reports = await prisma.dailyReport.findMany({
		orderBy: [{ reportDate: "desc" }],
		take: 200,
		include: {
			_count: { select: { lines: true } },
			createdBy: { select: { fullName: true, email: true } }
		}
	});

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Báo cáo ngày</h1>
					<p className="text-sm text-text-muted">Một ngày một báo cáo - nhập tay hoặc import Excel.</p>
				</div>
				<Link
					className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95"
					href="/admin/reports/new"
				>
					Tạo báo cáo mới
				</Link>
			</div>

			<div className="card overflow-x-auto">
				<table className="min-w-[860px] w-full border-collapse text-sm">
					<thead>
						<tr className="border-b border-bg-muted text-left text-text-muted">
							<th className="py-3 pr-4 font-medium">Ngày báo cáo</th>
							<th className="py-3 pr-4 font-medium">Trạng thái</th>
							<th className="py-3 pr-4 font-medium">Màn TV</th>
							<th className="py-3 pr-4 font-medium">Số dòng</th>
							<th className="py-3 pr-4 font-medium">Người tạo</th>
							<th className="py-3 pr-4 font-medium">Mã BC</th>
							<th className="py-3 font-medium">Thao tác</th>
						</tr>
					</thead>
					<tbody>
						{reports.length === 0 ? (
							<tr>
								<td colSpan={7} className="py-10 text-center text-text-muted">
									Chưa có báo cáo nào.
								</td>
							</tr>
						) : (
							reports.map((r) => (
								<tr key={r.id} className="border-b border-bg-muted/60">
									<td className="whitespace-nowrap py-3 pr-4">
										{new Date(r.reportDate).toLocaleDateString("vi-VN")}
									</td>
									<td className="py-3 pr-4">
										{r.status === "finalized" ? (
											<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Đã chốt</span>
										) : (
											<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Nháp</span>
										)}
									</td>
									<td className="py-3 pr-4">
										{r.hideFromTv ? (
											<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Đang ẩn</span>
										) : (
											<span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">Đang hiện</span>
										)}
									</td>
									<td className="py-3 pr-4">{r._count.lines}</td>
									<td className="py-3 pr-4 text-text-muted">
										{r.createdBy?.fullName ?? r.createdBy?.email ?? "-"}
									</td>
									<td className="py-3 pr-4">{r.reportCode ?? "-"}</td>
									<td className="py-3">
										<div className="flex flex-wrap items-center gap-3">
											<Link className="text-primary hover:underline" href={`/admin/reports/${r.id}/edit`}>
												Mở nhập liệu
											</Link>
											<ToggleReportTvButton reportId={r.id} hideFromTv={r.hideFromTv} />
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
