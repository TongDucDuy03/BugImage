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
	if (!(file instanceof File) || typeof defectId !== "string") {
		return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
	}
	const allowed =
		file.type.startsWith("image/") ||
		["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"].includes(file.type);
	if (!allowed) {
		return NextResponse.json({ error: "Định dạng không hỗ trợ. Chỉ cho phép ảnh/video phổ biến." }, { status: 400 });
	}
	const maxBytes = file.type.startsWith("video/") ? 80 * 1024 * 1024 : 20 * 1024 * 1024;
	if (file.size > maxBytes) {
		return NextResponse.json({ error: "File quá lớn." }, { status: 400 });
	}
	const buffer = Buffer.from(await file.arrayBuffer());
	const adapter = new LocalStorageAdapter();
	const stored = await adapter.save(buffer, { originalName: file.name, mimeType: file.type });
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

