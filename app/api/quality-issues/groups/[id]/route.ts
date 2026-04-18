import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildQualityGroupLookup } from "@/lib/quality-issues";
import { qualityIssueGroupUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
	try {
		await requireEditor();
		const { id } = await context.params;
		const existing = await prisma.qualityIssueGroup.findUnique({ where: { id } });
		if (!existing) return NextResponse.json({ error: "Không tìm thấy nhóm sản phẩm." }, { status: 404 });

		const body = await req.json();
		const parsed = qualityIssueGroupUpdateSchema.parse(body);
		const nextProductName = parsed.productName ?? existing.productName;
		const nextCustomerName = parsed.customerName !== undefined ? parsed.customerName : existing.customerName;
		const nextSteelGrade = parsed.steelGrade !== undefined ? parsed.steelGrade : existing.steelGrade;

		const updated = await prisma.qualityIssueGroup.update({
			where: { id },
			data: {
				productName: nextProductName,
				productNameNormalized: buildQualityGroupLookup({ productName: nextProductName }).productNameNormalized!,
				customerName: nextCustomerName,
				customerNameNormalized: buildQualityGroupLookup({ productName: nextProductName, customerName: nextCustomerName }).customerNameNormalized,
				steelGrade: nextSteelGrade,
				hideFromTv: parsed.hideFromTv ?? existing.hideFromTv,
				isActive: parsed.isActive ?? existing.isActive
			}
		});

		return NextResponse.json(updated);
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi cập nhật nhóm sản phẩm";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}
