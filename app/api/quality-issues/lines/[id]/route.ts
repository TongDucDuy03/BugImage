import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
	buildQualityGroupLookup,
	findMatchingQualityIssueGroup,
	getNextQualityLineOrder,
	normalizeQualityLookupText,
	sanitizeLineStyles,
	toPrismaNullableJson
} from "@/lib/quality-issues";
import { qualityIssueLineUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
	try {
		await requireEditor();
		const { id } = await context.params;
		const existing = await prisma.qualityIssueLine.findUnique({
			where: { id },
			include: { group: true }
		});
		if (!existing) return NextResponse.json({ error: "Không tìm thấy dòng theo dõi lỗi." }, { status: 404 });

		const body = await req.json();
		const parsed = qualityIssueLineUpdateSchema.parse(body);

		const nextGroupInput = {
			productName: parsed.productName ?? existing.group.productName,
			customerName: parsed.customerName !== undefined ? parsed.customerName : existing.group.customerName,
			steelGrade: parsed.steelGrade !== undefined ? parsed.steelGrade : existing.group.steelGrade
		};

		const updated = await prisma.$transaction(async (tx) => {
			let targetGroup = existing.group;
			const commonChanged =
				parsed.productName !== undefined || parsed.customerName !== undefined || parsed.steelGrade !== undefined;

			if (commonChanged) {
				const matched = await findMatchingQualityIssueGroup(tx, nextGroupInput);
				if (matched && matched.id !== existing.group.id) {
					const nextLineOrder = await getNextQualityLineOrder(tx, matched.id);
					await tx.qualityIssueLine.update({
						where: { id: existing.id },
						data: {
							groupId: matched.id,
							lineOrder: nextLineOrder
						}
					});
					targetGroup = matched;
				} else {
					targetGroup = await tx.qualityIssueGroup.update({
						where: { id: existing.group.id },
						data: {
							productName: nextGroupInput.productName.trim(),
							productNameNormalized: buildQualityGroupLookup(nextGroupInput).productNameNormalized!,
							customerName: nextGroupInput.customerName?.trim() || null,
							customerNameNormalized: normalizeQualityLookupText(nextGroupInput.customerName),
							steelGrade: nextGroupInput.steelGrade?.trim() || null
						}
					});
				}
			}

			const line = await tx.qualityIssueLine.update({
				where: { id: existing.id },
				data: {
					defectRateText: parsed.defectRateText !== undefined ? parsed.defectRateText : existing.defectRateText,
					defectName: parsed.defectName !== undefined ? parsed.defectName : existing.defectName,
					actionPlan: parsed.actionPlan !== undefined ? parsed.actionPlan : existing.actionPlan,
					progressStatus: parsed.progressStatus !== undefined ? parsed.progressStatus : existing.progressStatus,
					deadlineText: parsed.deadlineText !== undefined ? parsed.deadlineText : existing.deadlineText,
					ownerName: parsed.ownerName !== undefined ? parsed.ownerName : existing.ownerName,
					note: parsed.note !== undefined ? parsed.note : existing.note,
					styles:
						parsed.styles !== undefined
							? toPrismaNullableJson(sanitizeLineStyles(parsed.styles ?? null))
							: toPrismaNullableJson(existing.styles),
					sourceType: parsed.sourceType ?? existing.sourceType
				},
				include: { group: true }
			});

			const oldGroupCount = await tx.qualityIssueLine.count({ where: { groupId: existing.group.id } });
			if (oldGroupCount === 0) {
				await tx.qualityIssueGroup.delete({ where: { id: existing.group.id } });
			}

			return { ...line, group: targetGroup };
		});

		return NextResponse.json(updated);
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi cập nhật dòng theo dõi lỗi";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}

export async function DELETE(_req: Request, context: RouteContext) {
	try {
		await requireEditor();
		const { id } = await context.params;
		const existing = await prisma.qualityIssueLine.findUnique({
			where: { id }
		});
		if (!existing) return NextResponse.json({ error: "Không tìm thấy dòng theo dõi lỗi." }, { status: 404 });

		await prisma.$transaction(async (tx) => {
			await tx.qualityIssueLine.delete({ where: { id } });
			const remaining = await tx.qualityIssueLine.count({ where: { groupId: existing.groupId } });
			if (remaining === 0) {
				await tx.qualityIssueGroup.delete({ where: { id: existing.groupId } });
			}
		});

		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi xóa dòng theo dõi lỗi";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}
