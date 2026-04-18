import { prisma } from "@/lib/db";
import { buildQualityIssueListResponse } from "@/lib/quality-issues";
import { QualityIssueTrackerClient } from "./ui/QualityIssueTrackerClient";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
	const [groups, importLogs] = await Promise.all([
		prisma.qualityIssueGroup.findMany({
			where: { isActive: true },
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			include: {
				lines: {
					orderBy: [{ lineOrder: "asc" }, { createdAt: "asc" }]
				}
			}
		}),
		prisma.qualityIssueImportLog.findMany({
			orderBy: [{ createdAt: "desc" }],
			take: 12,
			include: {
				importedBy: {
					select: { fullName: true, email: true }
				}
			}
		})
	]);

	return (
		<QualityIssueTrackerClient
			groups={buildQualityIssueListResponse(groups)}
			importLogs={importLogs.map((log) => ({
				id: log.id,
				fileName: log.fileName,
				totalRows: log.totalRows,
				successRows: log.successRows,
				errorRows: log.errorRows,
				createdNewGroups: log.createdNewGroups,
				appendedExistingGroups: log.appendedExistingGroups,
				skippedRows: log.skippedRows,
				mode: log.mode,
				errorFilePath: log.errorFilePath,
				createdAt: log.createdAt.toISOString(),
				importedBy: log.importedBy?.fullName ?? log.importedBy?.email ?? null
			}))}
		/>
	);
}
