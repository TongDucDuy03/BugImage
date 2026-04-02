import { NextResponse } from "next/server";
import { LocalStorageAdapter } from "@/lib/storage/local";
import { imageUploadSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
	await requireAdmin();
	const form = await req.formData();
	const file = form.get("file");
	const defectId = form.get("defectId");
	const altText = (form.get("altText") as string) || "";
	const isCover = (form.get("isCover") as string) === "true";
	// Node.js runtime may not have global File - accept any Blob-like with arrayBuffer() and name
	const isBlobLike = file && typeof (file as any).arrayBuffer === "function";
	const fileName = isBlobLike ? ((file as any).name as string | undefined) : undefined;
	const fileType = isBlobLike ? (((file as any).type as string | undefined) ?? "application/octet-stream") : undefined;
	if (!isBlobLike || typeof defectId !== "string") {
		return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
	}
	const allowed =
		(fileType?.startsWith("image/") ?? false) ||
		["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"].includes(fileType || "");
	if (!allowed) {
		return NextResponse.json({ error: "Định dạng không hỗ trợ. Chỉ cho phép ảnh/video phổ biến." }, { status: 400 });
	}
	const size = Number((file as any).size ?? 0);
	const maxBytes = fileType?.startsWith("video/") ? 80 * 1024 * 1024 : 20 * 1024 * 1024;
	if (size > maxBytes) {
		return NextResponse.json({ error: "File quá lớn." }, { status: 400 });
	}
	const buffer = Buffer.from(await (file as any).arrayBuffer());
	const adapter = new LocalStorageAdapter();
	const stored = await adapter.save(buffer, { originalName: fileName || "upload.bin", mimeType: fileType || "application/octet-stream" });
	const validated = imageUploadSchema.safeParse({
		defectId,
		...stored,
		altText,
		isCover,
		isActive: true,
		sortOrder: 0
	});
	if (!validated.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
	const created = await prisma.defectImage.create({ data: validated.data });
	if (isCover) {
		await prisma.defect.update({
			where: { id: defectId },
			data: { coverImageId: created.id }
		});
		await prisma.defectImage.updateMany({
			where: { defectId, NOT: { id: created.id } },
			data: { isCover: false }
		});
	}
	return NextResponse.json(created);
}

