import { ReactNode } from "react";

export function SectionTitle({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
	return (
		<div className="mb-6">
			<h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h2>
			{subtitle ? <p className="muted mt-1">{subtitle}</p> : null}
		</div>
	);
}

