import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
	createQualityIssueGroup,
	findMatchingQualityIssueGroup,
	getNextQualityLineOrder,
	normalizeQualityLookupText,
	sanitizeLineStyles,
	toPrismaNullableJson
} from "@/lib/quality-issues";
import { qualityIssueLineCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
	try {
		const session = await requireEditor();
		const body = await req.json();
		const parsed = qualityIssueLineCreateSchema.parse(body);

		const result = await prisma.$transaction(async (tx) => {
			let group = await findMatchingQualityIssueGroup(tx, parsed);
			const matchedExistingGroup = Boolean(group);

			if (!group) {
				group = await createQualityIssueGroup(tx, {
					productName: parsed.productName,
					customerName: parsed.customerName ?? null,
					steelGrade: parsed.steelGrade ?? null,
					createdById: session.userId
				});
			} else if ((!group.customerName && parsed.customerName) || (!group.steelGrade && parsed.steelGrade)) {
				group = await tx.qualityIssueGroup.update({
					where: { id: group.id },
					data: {
						customerName: group.customerName ?? parsed.customerName ?? null,
						customerNameNormalized: group.customerNameNormalized ?? normalizeQualityLookupText(parsed.customerName),
						steelGrade: group.steelGrade ?? parsed.steelGrade ?? null
					}
				});
			}

			const lineOrder = await getNextQualityLineOrder(tx, group.id);
			const line = await tx.qualityIssueLine.create({
				data: {
					groupId: group.id,
					lineOrder,
					defectRateText: parsed.defectRateText ?? null,
					defectName: parsed.defectName ?? null,
					actionPlan: parsed.actionPlan ?? null,
					progressStatus: parsed.progressStatus ?? null,
					deadlineText: parsed.deadlineText ?? null,
					ownerName: parsed.ownerName ?? null,
					note: parsed.note ?? null,
					styles: toPrismaNullableJson(sanitizeLineStyles(parsed.styles ?? null)),
					sourceType: parsed.sourceType ?? "manual"
				}
			});

			return { group, line, matchedExistingGroup };
		});

		return NextResponse.json(result, { status: 201 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Lỗi thêm dòng theo dõi lỗi";
		const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
		return NextResponse.json({ error: msg }, { status });
	}
}
