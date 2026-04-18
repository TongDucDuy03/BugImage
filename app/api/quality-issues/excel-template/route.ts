import { NextResponse } from "next/server";
import { buildQualityIssueTemplateWorkbookBuffer } from "@/lib/quality-issue-excel";

export const runtime = "nodejs";

export async function GET() {
	try {
		const buffer = buildQualityIssueTemplateWorkbookBuffer();
		return new NextResponse(new Uint8Array(buffer), {
			status: 200,
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": 'attachment; filename="mau-theo-doi-hang-loi-chat-luong.xlsx"'
			}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi tạo file mẫu";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
