import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
	await requireAdmin();
	const json = await req.json().catch(() => ({}));
	try {
		const updated = await prisma.defectImage.update({
			where: { id: params.id },
			data: json
		});
		return NextResponse.json(updated);
	} catch {
		return NextResponse.json({ error: "Update failed" }, { status: 400 });
	}
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
	await requireAdmin();
	try {
		const img = await prisma.defectImage.findUnique({ where: { id: params.id } });
		if (!img) return NextResponse.json({ error: "Not found" }, { status: 404 });

		const tx: any[] = [];
		// Soft delete the image
		tx.push(
			prisma.defectImage.update({
				where: { id: params.id },
				data: { isActive: false, deletedAt: new Date(), isCover: false }
			})
		);

		// If it was the cover, try to promote another active image and update defect.coverImageId
		tx.push(
			(async () => {
				if (!img.isCover) return null;
				const next = await prisma.defectImage.findFirst({
					where: { defectId: img.defectId, isActive: true, deletedAt: null, NOT: { id: img.id } },
					orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
				});
				if (next) {
					return prisma.$transaction([
						prisma.defect.update({ where: { id: img.defectId }, data: { coverImageId: next.id } }),
						prisma.defectImage.update({ where: { id: next.id }, data: { isCover: true } })
					]);
				} else {
					return prisma.defect.update({ where: { id: img.defectId }, data: { coverImageId: null } });
				}
			})()
		);

		const [deleted] = await prisma.$transaction(tx as any);
		return NextResponse.json({ ok: true, deleted });
	} catch (e) {
		return NextResponse.json({ error: "Delete failed" }, { status: 400 });
	}
}

