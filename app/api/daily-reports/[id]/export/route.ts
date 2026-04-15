import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireEditor } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
	try {
		await requireEditor();
		const { id } = await context.params;
		const report = await prisma.dailyReport.findUnique({
			where: { id },
			include: { lines: { orderBy: { lineNo: "asc" } } }
		});
		if (!report) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });

		const rows = report.lines.map((line) => ({
			STT: line.lineNo,
			"Tên sản phẩm": line.productName ?? "",
			"Khách hàng": line.customerName ?? "",
			"Mác thép": line.steelGrade ?? "",
			"Số lượng đánh": line.inspectedQty ?? "",
			"Đạt SL": line.passedQty ?? "",
			"Đạt %": line.passedRate ?? "",
			"Xử lý SL": line.processedQty ?? "",
			"Xử lý %": line.processedRate ?? "",
			"Tình trạng lỗi": line.defectStatus ?? "",
			"Hỏng/Hủy SL": line.scrapQty ?? "",
			"Hỏng/Hủy %": line.scrapRate ?? "",
			"Tình trạng hỏng": line.scrapStatus ?? "",
			"Phân xưởng": line.workshopName ?? "",
			"Ghi chú": line.note ?? ""
		}));

		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.json_to_sheet(rows);
		XLSX.utils.book_append_sheet(wb, ws, "Bao cao");
		const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
		const name = `bao-cao-${report.reportDate.toISOString().slice(0, 10)}.xlsx`;

		return new NextResponse(new Uint8Array(buffer), {
			status: 200,
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": `attachment; filename="${name}"`
			}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi xuất file";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
		return NextResponse.json({ error: msg }, { status });
	}
}
