import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
	const items = await prisma.defect.findMany({
		where: { isActive: true, deletedAt: null },
		orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
		include: {
			images: {
				where: { isActive: true, deletedAt: null },
				orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
				take: 1
			}
		}
	});
	const payload = items.map((d) => ({
		...(function () {
			const preferred = d.images.find((m) => m.mimeType?.startsWith("image/")) ?? d.images[0] ?? null;
			return { coverImage: preferred };
		})(),
		id: d.id,
		code: d.code,
		name: d.name,
		slug: d.slug,
		shortDescription: d.shortDescription,
		severity: d.severity,
		defectGroup: d.defectGroup,
		processStage: d.processStage,
		updatedAt: d.updatedAt
	}));
	return NextResponse.json(payload);
}

