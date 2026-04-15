import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
	try {
		await requireEditor();
		const { id } = await context.params;
		const body = await req.json().catch(() => ({}));
		const hideFromTv = body?.hideFromTv;

		if (typeof hideFromTv !== "boolean") {
			return NextResponse.json({ error: "Giá trị hideFromTv không hợp lệ." }, { status: 400 });
		}

		const updated = await prisma.dailyReport.update({
			where: { id },
			data: { hideFromTv }
		});

		return NextResponse.json(updated);
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi cập nhật hiển thị TV";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}
