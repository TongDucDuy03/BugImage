import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { LocalStorageAdapter } from "@/lib/storage/local";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
	await requireAdmin();
	const form = await req.formData();
	const file = form.get("file");
	const isBlobLike = file && typeof (file as any).arrayBuffer === "function";
	const fileType = isBlobLike ? (((file as any).type as string | undefined) ?? "application/octet-stream") : undefined;
	const fileName = isBlobLike ? (((file as any).name as string | undefined) ?? "upload.bin") : undefined;
	if (!isBlobLike) return NextResponse.json({ error: "file required" }, { status: 400 });
	const allowed =
		(fileType?.startsWith("image/") ?? false) ||
		["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"].includes(fileType || "");
	if (!allowed) {
		return NextResponse.json({ error: "Định dạng không hỗ trợ." }, { status: 400 });
	}
	const size = Number((file as any).size ?? 0);
	const maxBytes = fileType?.startsWith("video/") ? 80 * 1024 * 1024 : 20 * 1024 * 1024;
	if (size > maxBytes) return NextResponse.json({ error: "File quá lớn." }, { status: 400 });
	const buffer = Buffer.from(await (file as any).arrayBuffer());
	const stored = await new LocalStorageAdapter().save(buffer, {
		originalName: fileName || "upload.bin",
		mimeType: fileType || "application/octet-stream"
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

