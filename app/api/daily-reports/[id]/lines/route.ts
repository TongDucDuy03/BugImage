import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { canEditDailyReport } from "@/lib/daily-report";
import { enrichComputedRates } from "@/lib/daily-report";
import { prisma } from "@/lib/db";
import { dailyReportLineUpsertSchema } from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
	try {
		const session = await requireEditor();
		const { id: dailyReportId } = await context.params;

		const report = await prisma.dailyReport.findUnique({ where: { id: dailyReportId } });
		if (!report) return NextResponse.json({ error: "Không tìm thấy báo cáo." }, { status: 404 });
		if (!canEditDailyReport(session, report.status)) {
			return NextResponse.json({ error: "Báo cáo đã chốt — chỉ quản trị viên được sửa." }, { status: 403 });
		}

		const body = await req.json();
		const parsed = dailyReportLineUpsertSchema.parse(body);

		const maxLine = await prisma.dailyReportLine.aggregate({
			where: { dailyReportId },
			_max: { lineNo: true }
		});
		const lineNo = parsed.lineNo ?? (maxLine._max.lineNo ?? 0) + 1;

		const rates = enrichComputedRates({
			inspectedQty: parsed.inspectedQty ?? null,
			passedQty: parsed.passedQty ?? null,
			passedRate: parsed.passedRate ?? null,
			processedQty: parsed.processedQty ?? null,
			processedRate: parsed.processedRate ?? null,
			scrapQty: parsed.scrapQty ?? null,
			scrapRate: parsed.scrapRate ?? null
		});

		const line = await prisma.dailyReportLine.create({
			data: {
				dailyReportId,
				lineNo,
				productName: parsed.productName ?? null,
				customerName: parsed.customerName ?? null,
				steelGrade: parsed.steelGrade ?? null,
				inspectedQty: rates.inspectedQty,
				passedQty: rates.passedQty,
				passedRate: rates.passedRate,
				processedQty: rates.processedQty,
				processedRate: rates.processedRate,
				defectStatus: parsed.defectStatus ?? null,
				scrapQty: rates.scrapQty,
				scrapRate: rates.scrapRate,
				scrapStatus: parsed.scrapStatus ?? null,
				workshopName: parsed.workshopName ?? null,
				note: parsed.note ?? null,
				sourceType: parsed.sourceType ?? "manual"
			}
		});

		return NextResponse.json(line, { status: 201 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi thêm dòng";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}
