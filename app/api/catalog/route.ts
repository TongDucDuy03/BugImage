import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const KINDS = new Set(["product", "customer", "steel_grade", "workshop", "defect_type"]);

export async function GET(req: Request) {
	try {
		const kind = new URL(req.url).searchParams.get("kind")?.trim();
		if (!kind || !KINDS.has(kind)) {
			return NextResponse.json({ error: "Tham số kind không hợp lệ." }, { status: 400 });
		}

		const items = await prisma.catalogItem.findMany({
			where: { kind, isActive: true },
			orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
			select: { id: true, code: true, name: true }
		});
		return NextResponse.json(items);
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
