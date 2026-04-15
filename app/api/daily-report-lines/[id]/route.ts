import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { canEditDailyReport } from "@/lib/daily-report";
import { enrichComputedRates } from "@/lib/daily-report";
import { prisma } from "@/lib/db";
import { dailyReportLineUpsertSchema } from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
	try {
		const session = await requireEditor();
		const { id } = await context.params;

		const existing = await prisma.dailyReportLine.findUnique({
			where: { id },
			include: { dailyReport: true }
		});
		if (!existing) return NextResponse.json({ error: "Không tìm thấy dòng." }, { status: 404 });
		if (!canEditDailyReport(session, existing.dailyReport.status)) {
			return NextResponse.json({ error: "Báo cáo đã chốt — chỉ quản trị viên được sửa." }, { status: 403 });
		}

		const body = await req.json();
		const parsed = dailyReportLineUpsertSchema.partial().parse(body);

		const merged = enrichComputedRates({
			inspectedQty: parsed.inspectedQty ?? existing.inspectedQty,
			passedQty: parsed.passedQty ?? existing.passedQty,
			passedRate: parsed.passedRate ?? existing.passedRate,
			processedQty: parsed.processedQty ?? existing.processedQty,
			processedRate: parsed.processedRate ?? existing.processedRate,
			scrapQty: parsed.scrapQty ?? existing.scrapQty,
			scrapRate: parsed.scrapRate ?? existing.scrapRate
		});

		const line = await prisma.dailyReportLine.update({
			where: { id },
			data: {
				productName: parsed.productName !== undefined ? parsed.productName : existing.productName,
				customerName: parsed.customerName !== undefined ? parsed.customerName : existing.customerName,
				steelGrade: parsed.steelGrade !== undefined ? parsed.steelGrade : existing.steelGrade,
				inspectedQty: merged.inspectedQty,
				passedQty: merged.passedQty,
				passedRate: merged.passedRate,
				processedQty: merged.processedQty,
				processedRate: merged.processedRate,
				defectStatus: parsed.defectStatus !== undefined ? parsed.defectStatus : existing.defectStatus,
				scrapQty: merged.scrapQty,
				scrapRate: merged.scrapRate,
				scrapStatus: parsed.scrapStatus !== undefined ? parsed.scrapStatus : existing.scrapStatus,
				workshopName: parsed.workshopName !== undefined ? parsed.workshopName : existing.workshopName,
				note: parsed.note !== undefined ? parsed.note : existing.note
			}
		});

		return NextResponse.json(line);
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi cập nhật dòng";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}

export async function DELETE(_req: Request, context: RouteContext) {
	try {
		const session = await requireEditor();
		const { id } = await context.params;

		const existing = await prisma.dailyReportLine.findUnique({
			where: { id },
			include: { dailyReport: true }
		});
		if (!existing) return NextResponse.json({ error: "Không tìm thấy dòng." }, { status: 404 });
		if (!canEditDailyReport(session, existing.dailyReport.status)) {
			return NextResponse.json({ error: "Báo cáo đã chốt — chỉ quản trị viên được sửa." }, { status: 403 });
		}

		await prisma.dailyReportLine.delete({ where: { id } });
		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi xóa dòng";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}
