"use client";

import type { CSSProperties } from "react";
import {
	getQualityIssueAutoTextColor,
	isQualityIssueWarningBgField,
	type QualityIssueCellStyle,
	type QualityIssueGroupPayload,
	type QualityIssueStyleField
} from "@/lib/quality-issues";

const tvColumnWidths = ["70px", "240px", "150px", "120px", "130px", "240px", "320px", "180px", "130px", "120px", "260px"];
const publicColumnWidths = ["4%", "14%", "9%", "7%", "7%", "13%", "17%", "12%", "6%", "5.5%", "5.5%"];
const tvWarningTextFallback = "#FFF8F1";
const publicWarningBackground = "#F7E3EA";
const publicWarningTextFallback = "#8B2441";

function getColumnWidths(variant: "public" | "tv") {
	return variant === "tv" ? tvColumnWidths : publicColumnWidths;
}

function toInlineStyle(
	variant: "public" | "tv",
	field: QualityIssueStyleField,
	value: string | null,
	style: QualityIssueCellStyle | null | undefined
): CSSProperties | undefined {
	const autoTextColor = getQualityIssueAutoTextColor(field, value);
	const hasWarningBackground = isQualityIssueWarningBgField(field) && Boolean(style?.bgColor);
	if (!style && !autoTextColor) return undefined;
	return {
		backgroundColor: hasWarningBackground ? (variant === "public" ? publicWarningBackground : style?.bgColor ?? undefined) : undefined,
		color: autoTextColor
			? autoTextColor
			: hasWarningBackground
				? variant === "public"
					? publicWarningTextFallback
					: tvWarningTextFallback
				: undefined,
		fontWeight: style?.bold ? 700 : undefined
	};
}

function themedClass(variant: "public" | "tv", kind: "table" | "head" | "th" | "common" | "line" | "zebra") {
	if (variant === "tv") {
		switch (kind) {
			case "table":
				return "min-w-[1860px] w-full table-fixed border-collapse text-[clamp(12px,0.9vw,18px)] leading-snug";
			case "head":
				return "sticky top-0 z-10 bg-slate-950/95 text-slate-100 backdrop-blur";
			case "th":
				return "border border-white/15 bg-slate-800/85 px-3 py-2 text-left text-[0.72em] font-semibold uppercase tracking-wide text-slate-100";
			case "common":
				return "border border-white/10 bg-slate-900/35 px-3 py-2 align-top text-slate-100";
			case "line":
				return "border border-white/10 bg-slate-900/35 px-3 py-2 align-top text-slate-100";
			case "zebra":
				return "";
		}
	}

	switch (kind) {
		case "table":
			return "w-full table-fixed border-collapse text-[12.5px] leading-[1.45] text-slate-900";
		case "head":
			return "sticky top-0 z-10 bg-slate-100 text-slate-700";
		case "th":
			return "border border-slate-200 bg-slate-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-600";
		case "common":
			return "border border-slate-200 bg-white px-3 py-2.5 align-top text-slate-900";
		case "line":
			return "border border-slate-200 bg-white px-3 py-2.5 align-top text-slate-900";
		case "zebra":
			return "bg-[#fbfaf7]";
	}
}

function renderLineCell(
	variant: "public" | "tv",
	field: QualityIssueStyleField,
	value: string | null,
	style: QualityIssueCellStyle | null | undefined,
	extraClass = ""
) {
	return (
		<td className={`${themedClass(variant, "line")} ${extraClass}`} style={toInlineStyle(variant, field, value, style)}>
			<div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{value ?? "—"}</div>
		</td>
	);
}

export function QualityIssueTable({
	groups,
	variant
}: {
	groups: QualityIssueGroupPayload[];
	variant: "public" | "tv";
}) {
	const columnWidths = getColumnWidths(variant);

	return (
		<table className={themedClass(variant, "table")}>
			<colgroup>
				{columnWidths.map((width, index) => (
					<col key={index} style={{ width }} />
				))}
			</colgroup>
			<thead className={themedClass(variant, "head")}>
				<tr>
					<th className={`${themedClass(variant, "th")} text-center`}>STT</th>
					<th className={themedClass(variant, "th")}>Tên sản phẩm hỏng/lỗi</th>
					<th className={themedClass(variant, "th")}>Khách hàng</th>
					<th className={`${themedClass(variant, "th")} text-center`}>Mác thép</th>
					<th className={`${themedClass(variant, "th")} text-center`}>Tỉ lệ hỏng & xử lý</th>
					<th className={themedClass(variant, "th")}>Tên lỗi (hỏng & xử lý)</th>
					<th className={themedClass(variant, "th")}>Biện pháp</th>
					<th className={themedClass(variant, "th")}>Tình trạng tiến độ</th>
					<th className={themedClass(variant, "th")}>Hạn định</th>
					<th className={themedClass(variant, "th")}>Phụ trách</th>
					<th className={themedClass(variant, "th")}>Ghi chú</th>
				</tr>
			</thead>
			<tbody>
				{groups.length === 0 ? (
					<tr>
						<td colSpan={11} className={`${themedClass(variant, "line")} py-10 text-center text-slate-400`}>
							Chưa có dữ liệu theo dõi lỗi chất lượng.
						</td>
					</tr>
				) : (
					groups.map((group, groupIndex) =>
						group.lines.map((line, lineIndex) => (
							<tr
								key={line.id}
								className={
									lineIndex === 0
										? groupIndex % 2 === 0
											? themedClass(variant, "zebra")
											: ""
										: ""
								}
							>
								{lineIndex === 0 ? (
									<>
										<td rowSpan={group.lines.length} className={`${themedClass(variant, "common")} text-center font-semibold`}>
											{group.stt}
										</td>
										<td rowSpan={group.lines.length} className={`${themedClass(variant, "common")} font-semibold`}>
											<div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{group.productName}</div>
										</td>
										<td rowSpan={group.lines.length} className={themedClass(variant, "common")}>
											<div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{group.customerName ?? "—"}</div>
										</td>
										<td rowSpan={group.lines.length} className={`${themedClass(variant, "common")} text-center`}>
											<div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{group.steelGrade ?? "—"}</div>
										</td>
									</>
								) : null}
								{renderLineCell(variant, "defectRateText", line.defectRateText, line.styles?.defectRateText, "text-center")}
								{renderLineCell(variant, "defectName", line.defectName, line.styles?.defectName)}
								{renderLineCell(variant, "actionPlan", line.actionPlan, line.styles?.actionPlan)}
								{renderLineCell(variant, "progressStatus", line.progressStatus, line.styles?.progressStatus)}
								{renderLineCell(variant, "deadlineText", line.deadlineText, line.styles?.deadlineText)}
								{renderLineCell(variant, "ownerName", line.ownerName, line.styles?.ownerName)}
								{renderLineCell(variant, "note", line.note, line.styles?.note)}
							</tr>
						))
					)
				)}
			</tbody>
		</table>
	);
}
