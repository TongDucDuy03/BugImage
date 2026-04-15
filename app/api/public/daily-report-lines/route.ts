import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function parseDate(input: string | null) {
	if (!input) return null;
	const d = new Date(`${input.trim()}T12:00:00.000Z`);
	return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Dashboard công khai: danh sách dòng lỗi kèm lọc (không cần đăng nhập).
 * Trong môi trường nội bộ có thể bảo vệ bằng VPN/firewall.
 */
export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const from = parseDate(url.searchParams.get("from"));
		const to = parseDate(url.searchParams.get("to"));
		const customer = url.searchParams.get("customer")?.trim();
		const product = url.searchParams.get("product")?.trim();
		const steelGrade = url.searchParams.get("steelGrade")?.trim();
		const defectStatus = url.searchParams.get("defectStatus")?.trim();
		const scrapStatus = url.searchParams.get("scrapStatus")?.trim();
		const workshop = url.searchParams.get("workshop")?.trim();
		const onlyScrap = url.searchParams.get("onlyScrap") === "1";
		const noImproveNote = url.searchParams.get("noImproveNote") === "1";
		const tv = url.searchParams.get("tv") === "1";
		const q = url.searchParams.get("q")?.trim().toLowerCase();

		const reportFilter: Prisma.DailyReportWhereInput = {};
		if (tv) {
			reportFilter.hideFromTv = false;
		}
		if (from || to) {
			reportFilter.reportDate = {};
			if (from) reportFilter.reportDate.gte = from;
			if (to) reportFilter.reportDate.lte = to;
		}

		const lineWhere: Prisma.DailyReportLineWhereInput = {
			dailyReport: reportFilter
		};

		if (customer) {
			lineWhere.customerName = { contains: customer, mode: "insensitive" };
		}
		if (product) {
			lineWhere.productName = { contains: product, mode: "insensitive" };
		}
		if (steelGrade) {
			lineWhere.steelGrade = { contains: steelGrade, mode: "insensitive" };
		}
		if (defectStatus) {
			lineWhere.defectStatus = { contains: defectStatus, mode: "insensitive" };
		}
		if (scrapStatus) {
			lineWhere.scrapStatus = { contains: scrapStatus, mode: "insensitive" };
		}
		if (workshop) {
			lineWhere.workshopName = { contains: workshop, mode: "insensitive" };
		}
		if (onlyScrap) {
			lineWhere.scrapQty = { gt: 0 };
		}
		if (noImproveNote) {
			lineWhere.note = { contains: "không cải thiện", mode: "insensitive" };
		}

		const lines = await prisma.dailyReportLine.findMany({
			where: lineWhere,
			orderBy: [{ dailyReport: { reportDate: "desc" } }, { lineNo: "asc" }],
			take: 5000,
			include: {
				dailyReport: {
					select: {
						id: true,
						reportDate: true,
						status: true,
						reportCode: true
					}
				}
			}
		});

		const filtered =
			q && q.length > 0
				? lines.filter((row) => {
						const hay = [
							row.productName,
							row.customerName,
							row.steelGrade,
							row.defectStatus,
							row.scrapStatus,
							row.workshopName,
							row.note
						]
							.filter(Boolean)
							.join(" ")
							.toLowerCase();
						return hay.includes(q);
					})
				: lines;

		const totals = filtered.reduce(
			(acc, row) => {
				acc.rows += 1;
				acc.inspected += row.inspectedQty ?? 0;
				acc.passed += row.passedQty ?? 0;
				acc.processed += row.processedQty ?? 0;
				acc.scrap += row.scrapQty ?? 0;
				return acc;
			},
			{ rows: 0, inspected: 0, passed: 0, processed: 0, scrap: 0 }
		);

		const defectKey = (row: (typeof lines)[0]) => (row.defectStatus ?? "").trim() || "(Không ghi tình trạng lỗi)";
		const productKey = (row: (typeof lines)[0]) => (row.productName ?? "").trim() || "(Không ghi SP)";

		const defectCounts = new Map<string, number>();
		const productCounts = new Map<string, number>();
		for (const row of filtered) {
			const dk = defectKey(row);
			const pk = productKey(row);
			defectCounts.set(dk, (defectCounts.get(dk) ?? 0) + 1);
			productCounts.set(pk, (productCounts.get(pk) ?? 0) + 1);
		}

		const top = (map: Map<string, number>, n: number) =>
			[...map.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, n)
				.map(([name, count]) => ({ name, count }));

		return NextResponse.json({
			items: filtered,
			stats: {
				...totals,
				topDefects: top(defectCounts, 5),
				topProducts: top(productCounts, 5)
			}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi truy vấn";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
