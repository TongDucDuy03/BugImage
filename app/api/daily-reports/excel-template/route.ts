import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { buildTemplateWorkbookBuffer } from "@/lib/daily-report-excel";

export const runtime = "nodejs";

export async function GET() {
	try {
		await requireEditor();
		const buffer = buildTemplateWorkbookBuffer();
		return new NextResponse(new Uint8Array(buffer), {
			status: 200,
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": 'attachment; filename="mau-bao-cao-loi.xlsx"'
			}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
		return NextResponse.json({ error: msg }, { status });
	}
}
