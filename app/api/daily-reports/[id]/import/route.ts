import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { canEditDailyReport } from "@/lib/daily-report";
import { importExcelIntoDailyReport, type ImportMode } from "@/lib/daily-report-excel";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function isSupportedExcelFile(fileName: string, mimeType: string) {
	const normalizedName = fileName.toLowerCase();
	return (
		normalizedName.endsWith(".xlsx") ||
		normalizedName.endsWith(".xls") ||
		mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
		mimeType === "application/vnd.ms-excel"
	);
}

export async function POST(req: Request, context: RouteContext) {
	try {
		const session = await requireEditor();
		const { id: dailyReportId } = await context.params;

		const report = await prisma.dailyReport.findUnique({
			where: { id: dailyReportId },
			select: {
				id: true,
				status: true,
				_count: { select: { lines: true } }
			}
		});
		if (!report) return NextResponse.json({ error: "Không tìm thấy báo cáo." }, { status: 404 });
		if (!canEditDailyReport(session, report.status)) {
			return NextResponse.json({ error: "Báo cáo đã chốt — chỉ quản trị viên được sửa." }, { status: 403 });
		}

		const form = await req.formData();
		const file = form.get("file");
		const modeRaw = String(form.get("mode") ?? "append").trim();
		const mode = (modeRaw === "new" || modeRaw === "append" || modeRaw === "replace" ? modeRaw : "append") as ImportMode;

		const allowReplace = session.role === "admin";
		if (mode === "replace" && !allowReplace) {
			return NextResponse.json({ error: "Import ghi đè chỉ dành cho quản trị viên." }, { status: 403 });
		}

		const isBlobLike = file && typeof (file as Blob).arrayBuffer === "function";
		if (!isBlobLike) {
			return NextResponse.json({ error: "Vui lòng chọn file Excel." }, { status: 400 });
		}

		const fileName = ((file as File).name ?? "import.xlsx").trim();
		const mimeType = ((file as File).type ?? "").trim();
		if (!isSupportedExcelFile(fileName, mimeType)) {
			return NextResponse.json({ error: "Chỉ hỗ trợ file Excel .xlsx hoặc .xls." }, { status: 400 });
		}

		const buffer = Buffer.from(await (file as Blob).arrayBuffer());
		const result = await importExcelIntoDailyReport({
			dailyReportId,
			fileName,
			buffer,
			mode,
			importedById: session.userId,
			allowReplace
		});

		return NextResponse.json(result, { status: 201 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Import thất bại";
		const status =
			msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : msg.includes("Không tìm thấy") ? 404 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}
