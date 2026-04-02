import clsx from "clsx";
import { severityLabelVi } from "@/lib/i18n";

export function DefectSeverityBadge({ severity }: { severity: string }) {
	const color =
		severity === "critical"
			? "bg-danger/20 text-danger border-danger/30"
			: severity === "high"
			? "bg-warn/20 text-warn border-warn/30"
			: severity === "medium"
			? "bg-accent/20 text-accent border-accent/30"
			: "bg-success/20 text-success border-success/30";
	return (
		<span
			className={clsx(
				"inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium backdrop-blur",
				color
			)}
		>
			{severityLabelVi(severity)}
		</span>
	);
}

