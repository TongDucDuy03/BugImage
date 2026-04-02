import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { LocalStorageAdapter } from "@/lib/storage/local";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
	await requireAdmin();
	const form = await req.formData();
	const file = form.get("file");
	if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
	const allowed =
		file.type.startsWith("image/") ||
		["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"].includes(file.type);
	if (!allowed) {
		return NextResponse.json({ error: "Định dạng không hỗ trợ." }, { status: 400 });
	}
	const maxBytes = file.type.startsWith("video/") ? 80 * 1024 * 1024 : 20 * 1024 * 1024;
	if (file.size > maxBytes) return NextResponse.json({ error: "File quá lớn." }, { status: 400 });
	const buffer = Buffer.from(await file.arrayBuffer());
	const stored = await new LocalStorageAdapter().save(buffer, {
		originalName: file.name,
		mimeType: file.type
	});
	const updated = await prisma.defectImage.update({
		where: { id: params.id },
		data: {
			fileName: stored.fileName,
			originalName: stored.originalName,
			mimeType: stored.mimeType,
			fileSize: stored.fileSize,
			path: stored.path,
			url: stored.url
		}
	});
	return NextResponse.json(updated);
}

