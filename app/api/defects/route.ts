import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { defectCreateSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
	const items = await prisma.defect.findMany({
		where: { deletedAt: null },
		orderBy: [{ updatedAt: "desc" }]
	});
	return NextResponse.json(items);
}

export async function POST(req: Request) {
	await requireAdmin();
	const json = await req.json().catch(() => ({}));
	const parsed = defectCreateSchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: "Invalid payload",
				issues: parsed.error.flatten()
			},
			{ status: 400 }
		);
	}
	try {
		const created = await prisma.defect.create({ data: parsed.data });
		return NextResponse.json(created);
	} catch (e) {
		return NextResponse.json({ error: "Create failed" }, { status: 400 });
	}
}

