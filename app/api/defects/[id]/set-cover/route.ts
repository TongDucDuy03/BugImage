import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
	await requireAdmin();
	const json = await req.json().catch(() => ({}));
	const imageId = json?.imageId as string | undefined;
	if (!imageId) return NextResponse.json({ error: "imageId required" }, { status: 400 });
	await prisma.$transaction([
		prisma.defect.update({ where: { id: params.id }, data: { coverImageId: imageId } }),
		prisma.defectImage.update({ where: { id: imageId }, data: { isCover: true } }),
		prisma.defectImage.updateMany({
			where: { defectId: params.id, NOT: { id: imageId } },
			data: { isCover: false }
		})
	]);
	return NextResponse.json({ ok: true });
}

