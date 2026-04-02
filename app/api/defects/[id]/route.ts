import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { defectUpdateSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: { id: string } }) {
	const d = await prisma.defect.findUnique({ where: { id: params.id } });
	if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json(d);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
	await requireAdmin();
	const json = await req.json().catch(() => ({}));
	const parsed = defectUpdateSchema.safeParse(json);
	if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	try {
		const updated = await prisma.defect.update({
			where: { id: params.id },
			data: parsed.data
		});
		return NextResponse.json(updated);
	} catch {
		return NextResponse.json({ error: "Update failed" }, { status: 400 });
	}
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
	await requireAdmin();
	try {
		const deleted = await prisma.defect.update({
			where: { id: params.id },
			data: { deletedAt: new Date(), isActive: false }
		});
		return NextResponse.json(deleted);
	} catch {
		return NextResponse.json({ error: "Delete failed" }, { status: 400 });
	}
}

