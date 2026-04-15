import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReportEditClient, type SerializableReport } from "./ui/ReportEditClient";

export default async function EditDailyReportPage({ params }: { params: Promise<{ id: string }> }) {
	const session = await getSession();
	if (!session) redirect("/admin/login");

	const { id } = await params;
	const report = await prisma.dailyReport.findUnique({
		where: { id },
		include: {
			lines: { orderBy: { lineNo: "asc" } },
			importLogs: { orderBy: { createdAt: "desc" }, take: 12 }
		}
	});
	if (!report) notFound();

	const payload: SerializableReport = {
		...report,
		reportDate: report.reportDate.toISOString(),
		receivedDate: report.receivedDate?.toISOString() ?? null,
		summaryDate: report.summaryDate?.toISOString() ?? null,
		createdAt: report.createdAt.toISOString(),
		updatedAt: report.updatedAt.toISOString(),
		lines: report.lines.map((l) => ({
			...l,
			createdAt: l.createdAt.toISOString(),
			updatedAt: l.updatedAt.toISOString()
		})),
		importLogs: report.importLogs.map((log) => ({
			...log,
			createdAt: log.createdAt.toISOString()
		}))
	};

	return <ReportEditClient report={payload} role={session.role} />;
}
