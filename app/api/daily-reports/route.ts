import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dailyReportCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

function parseDateOnly(input: string) {
	const d = new Date(`${input.trim()}T12:00:00.000Z`);
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

export async function GET() {
	try {
		await requireEditor();
		const reports = await prisma.dailyReport.findMany({
			orderBy: [{ reportDate: "desc" }],
			take: 120,
			include: {
				_count: { select: { lines: true } },
				createdBy: { select: { id: true, fullName: true, email: true } }
			}
		});
		return NextResponse.json(reports);
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
		return NextResponse.json({ error: msg }, { status });
	}
}

export async function POST(req: Request) {
	try {
		const session = await requireEditor();
		const body = await req.json();
		const parsed = dailyReportCreateSchema.parse(body);
		const reportDate = parseDateOnly(parsed.reportDate);
		if (!reportDate) {
			return NextResponse.json({ error: "Ngày báo cáo không hợp lệ." }, { status: 400 });
		}

		const existing = await prisma.dailyReport.findUnique({ where: { reportDate } });
		if (existing) {
			return NextResponse.json({ error: "Đã tồn tại báo cáo cho ngày này." }, { status: 409 });
		}

		const receivedDate = parsed.receivedDate ? parseDateOnly(parsed.receivedDate) : null;
		const summaryDate = parsed.summaryDate ? parseDateOnly(parsed.summaryDate) : null;

		const created = await prisma.dailyReport.create({
			data: {
				reportDate,
				receivedDate,
				summaryDate,
				departmentName: parsed.departmentName?.trim() || "Phòng nghiên cứu và công nghệ",
				reportCode: parsed.reportCode?.trim() || null,
				generalNote: parsed.generalNote?.trim() || null,
				createdById: session.userId,
				status: "draft"
			}
		});

		return NextResponse.json(created, { status: 201 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi tạo báo cáo";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}
