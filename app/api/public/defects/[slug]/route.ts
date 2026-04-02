import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { slug: string } }) {
	const d = await prisma.defect.findFirst({
		where: { slug: params.slug, isActive: true, deletedAt: null },
		include: {
			images: {
				where: { isActive: true, deletedAt: null },
				orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
			}
		}
	});
	if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json(d);
}

