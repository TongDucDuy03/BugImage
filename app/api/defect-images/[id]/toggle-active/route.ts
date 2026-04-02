import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(_: Request, { params }: { params: { id: string } }) {
	await requireAdmin();
	const img = await prisma.defectImage.findUnique({ where: { id: params.id } });
	if (!img) return NextResponse.json({ error: "Not found" }, { status: 404 });
	const updated = await prisma.defectImage.update({
		where: { id: params.id },
		data: { isActive: !img.isActive, deletedAt: img.isActive ? new Date() : null }
	});
	return NextResponse.json(updated);
}

