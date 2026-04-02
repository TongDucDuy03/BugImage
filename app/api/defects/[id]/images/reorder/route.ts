import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
	await requireAdmin();
	const json = await req.json().catch(() => ({}));
	const orders = (json?.orders as { id: string; sortOrder: number }[]) || [];
	const tx = orders.map((o) =>
		prisma.defectImage.update({ where: { id: o.id, defectId: params.id }, data: { sortOrder: o.sortOrder } })
	);
	await prisma.$transaction(tx);
	return NextResponse.json({ ok: true });
}

