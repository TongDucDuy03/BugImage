import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
	buildQualityIssueListResponse,
	type QualityIssueGroupPayload,
	type QualityIssueGroupWithLines
} from "@/lib/quality-issues";

export const runtime = "nodejs";

export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const product = url.searchParams.get("product")?.trim();
		const customer = url.searchParams.get("customer")?.trim();
		const steelGrade = url.searchParams.get("steelGrade")?.trim();
		const defectName = url.searchParams.get("defectName")?.trim();
		const progressStatus = url.searchParams.get("progressStatus")?.trim();
		const owner = url.searchParams.get("owner")?.trim();
		const q = url.searchParams.get("q")?.trim().toLowerCase();
		const tv = url.searchParams.get("tv") === "1";

		const groupWhere: Prisma.QualityIssueGroupWhereInput = {
			isActive: true
		};
		if (tv) groupWhere.hideFromTv = false;
		if (product) groupWhere.productName = { contains: product, mode: "insensitive" };
		if (customer) groupWhere.customerName = { contains: customer, mode: "insensitive" };
		if (steelGrade) groupWhere.steelGrade = { contains: steelGrade, mode: "insensitive" };

		const lineWhere: Prisma.QualityIssueLineWhereInput = {};
		if (defectName) lineWhere.defectName = { contains: defectName, mode: "insensitive" };
		if (progressStatus) lineWhere.progressStatus = { contains: progressStatus, mode: "insensitive" };
		if (owner) lineWhere.ownerName = { contains: owner, mode: "insensitive" };

		const useLineWhere = Object.keys(lineWhere).length > 0;

		const groups = await prisma.qualityIssueGroup.findMany({
			where: {
				...groupWhere,
				...(useLineWhere ? { lines: { some: lineWhere } } : {})
			},
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			include: {
				lines: {
					where: useLineWhere ? lineWhere : undefined,
					orderBy: [{ lineOrder: "asc" }, { createdAt: "asc" }]
				}
			}
		});

		const filteredGroups: QualityIssueGroupWithLines[] =
			q && q.length > 0
				? groups
						.map((group) => {
							const groupHay = [group.productName, group.customerName, group.steelGrade].filter(Boolean).join(" ").toLowerCase();
							const groupHit = groupHay.includes(q);
							if (groupHit) return group;

							const lines = group.lines.filter((line) =>
								[
									line.defectRateText,
									line.defectName,
									line.actionPlan,
									line.progressStatus,
									line.deadlineText,
									line.ownerName,
									line.note
								]
									.filter(Boolean)
									.join(" ")
									.toLowerCase()
									.includes(q)
							);
							return lines.length ? { ...group, lines } : null;
						})
						.filter(Boolean) as QualityIssueGroupWithLines[]
				: groups;

		const items = buildQualityIssueListResponse(filteredGroups);

		const topMap = (pairs: string[]) => {
			const map = new Map<string, number>();
			for (const value of pairs) {
				const key = value.trim() || "(Không có)";
				map.set(key, (map.get(key) ?? 0) + 1);
			}
			return [...map.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5)
				.map(([name, count]) => ({ name, count }));
		};

		return NextResponse.json({
			items,
			stats: {
				groups: items.length,
				lines: items.reduce((sum: number, group: QualityIssueGroupPayload) => sum + group.lines.length, 0),
				topProducts: topMap(items.map((group) => group.productName)),
				topDefects: topMap(
					items.flatMap((group) => group.lines.map((line) => line.defectName ?? "(Không có tên lỗi)"))
				)
			}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi truy vấn danh sách theo dõi lỗi";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
