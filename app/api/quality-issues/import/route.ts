import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { commitQualityIssueImport, previewQualityIssueImport, type QualityIssueImportMode } from "@/lib/quality-issue-excel";

export const runtime = "nodejs";

export async function POST(req: Request) {
	try {
		const session = await requireEditor();
		const form = await req.formData();
		const file = form.get("file");
		const mode = (form.get("mode")?.toString() ?? "append") as QualityIssueImportMode;
		const dryRun = form.get("dryRun")?.toString() === "1";

		if (!(file instanceof File)) {
			return NextResponse.json({ error: "Chưa chọn file Excel." }, { status: 400 });
		}
		if (mode !== "append" && mode !== "upsert") {
			return NextResponse.json({ error: "Chế độ import không hợp lệ." }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const data = dryRun
			? await previewQualityIssueImport({ fileName: file.name, buffer, mode })
			: await commitQualityIssueImport({ fileName: file.name, buffer, mode, importedById: session.userId });

		return NextResponse.json(data);
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi import theo dõi hàng lỗi chất lượng";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}
