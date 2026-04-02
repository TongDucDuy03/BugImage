import Image from "next/image";
import Link from "next/link";
import { DefectSeverityBadge } from "./DefectSeverityBadge";

export type CarouselCardDefect = {
	id: string;
	name: string;
	slug: string;
	shortDescription: string | null;
	severity: string;
	coverUrl: string | null;
	code: string;
};

export function DefectCarouselCard({ defect, active = false }: { defect: CarouselCardDefect; active?: boolean }) {
	return (
		<Link
			href={`/defects/${defect.slug}`}
			className={`relative block overflow-hidden rounded-2xl border border-bg-muted/40 transition-all ${
				active ? "scale-100 shadow-card" : "scale-95 opacity-80 hover:scale-97"
			}`}
		>
			<div className="relative aspect-video bg-bg-muted">
				{defect.coverUrl ? (
					<Image
						src={defect.coverUrl}
						alt={defect.name}
						fill
						sizes="(max-width: 768px) 100vw, 50vw"
						className="object-cover"
						priority={active}
					/>
				) : (
					<div className="w-full h-full grid place-items-center text-text-muted">Chưa có ảnh</div>
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
				<div className="absolute left-0 right-0 bottom-0 p-4">
					<div className="flex items-center justify-between gap-3">
						<h3 className="text-lg font-semibold">{defect.name}</h3>
						<DefectSeverityBadge severity={defect.severity} />
					</div>
					<p className="muted text-sm mt-1 line-clamp-2">{defect.shortDescription ?? ""}</p>
					<p className="text-xs text-text-soft/70 mt-1">{defect.code}</p>
				</div>
			</div>
		</Link>
	);
}

