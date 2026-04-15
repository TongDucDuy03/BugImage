import { NextResponse } from "next/server";
import { requireAdmin, requireEditor } from "@/lib/auth";
import { canEditDailyReport } from "@/lib/daily-report";
import { prisma } from "@/lib/db";
import { dailyReportUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

function parseDateOnly(input: string | null | undefined) {
	if (!input) return null;
	const d = new Date(`${input.trim()}T12:00:00.000Z`);
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
	try {
		await requireEditor();
		const { id } = await context.params;
		const report = await prisma.dailyReport.findUnique({
			where: { id },
			include: {
				lines: { orderBy: { lineNo: "asc" } },
				importLogs: { orderBy: { createdAt: "desc" }, take: 15 },
				createdBy: { select: { id: true, fullName: true, email: true } }
			}
		});
		if (!report) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
		return NextResponse.json(report);
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
		return NextResponse.json({ error: msg }, { status });
	}
}

export async function PATCH(req: Request, context: RouteContext) {
	try {
		const session = await requireEditor();
		const { id } = await context.params;
		const existing = await prisma.dailyReport.findUnique({ where: { id } });
		if (!existing) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });

		if (!canEditDailyReport(session, existing.status)) {
			return NextResponse.json({ error: "Báo cáo đã chốt — chỉ quản trị viên được sửa." }, { status: 403 });
		}

		const body = await req.json();
		const parsed = dailyReportUpdateSchema.parse(body);

		if (parsed.status === "draft" && existing.status === "finalized") {
			await requireAdmin();
		}

		const data: Record<string, unknown> = {};
		if (parsed.receivedDate !== undefined) data.receivedDate = parseDateOnly(parsed.receivedDate ?? undefined);
		if (parsed.summaryDate !== undefined) data.summaryDate = parseDateOnly(parsed.summaryDate ?? undefined);
		if (parsed.departmentName !== undefined) data.departmentName = parsed.departmentName?.trim() || existing.departmentName;
		if (parsed.reportCode !== undefined) data.reportCode = parsed.reportCode?.trim() || null;
		if (parsed.generalNote !== undefined) data.generalNote = parsed.generalNote?.trim() || null;
		if (parsed.status !== undefined) data.status = parsed.status;

		const updated = await prisma.dailyReport.update({
			where: { id },
			data: data as Parameters<typeof prisma.dailyReport.update>[0]["data"]
		});
		return NextResponse.json(updated);
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi cập nhật";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}

export async function DELETE(_req: Request, context: RouteContext) {
	try {
		await requireAdmin();
		const { id } = await context.params;
		await prisma.dailyReport.delete({ where: { id } });
		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi xóa";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}
