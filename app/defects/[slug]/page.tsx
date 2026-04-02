import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { DefectSeverityBadge } from "@/components/public/DefectSeverityBadge";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
	const d = await prisma.defect.findFirst({
		where: { slug: params.slug, isActive: true, deletedAt: null }
	});
	if (!d) return {};
	return {
		title: `${d.name} • Defects`,
		description: d.shortDescription ?? undefined,
		openGraph: {
			title: d.name,
			description: d.shortDescription ?? undefined
		}
	};
}

async function getDefect(slug: string) {
	return prisma.defect.findFirst({
		where: { slug, isActive: true, deletedAt: null },
		include: {
			images: {
				where: { isActive: true, deletedAt: null },
				orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
			}
		}
	});
}

export default async function DefectDetailPage({ params }: Props) {
	const defect = await getDefect(params.slug);
	if (!defect) {
		return (
			<main className="container py-10">
				<div className="card p-10">
					<h1 className="text-xl font-semibold mb-2">Không tìm thấy lỗi</h1>
					<p className="muted">Mục này có thể đã ẩn hoặc bị xóa.</p>
					<Link href="/" className="inline-block mt-6 underline">
						Về trang chủ
					</Link>
				</div>
			</main>
		);
	}

	const cover = defect.images.find((i) => i.isCover) || defect.images[0];

	return (
		<main className="container py-0">
			<div className="relative w-full rounded-none md:rounded-2xl overflow-hidden border border-transparent md:border-bg-muted shadow-card" style={{ height: "80vh" }}>
				{cover ? (
					cover.mimeType?.startsWith("video/") ? (
						<video src={cover.url} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
					) : (
						<Image src={cover.url} alt={defect.name} fill className="object-cover" priority />
					)
				) : (
					<div className="w-full h-full grid place-items-center text-text-muted">Chưa có ảnh</div>
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
				<div className="absolute left-0 right-0 bottom-0 p-6 md:p-10">
					<div className="glass rounded-xl p-5 md:p-6 max-w-3xl">
						<div className="flex items-center justify-between gap-4">
							<h1 className="text-2xl md:text-3xl font-semibold">{defect.name}</h1>
							<DefectSeverityBadge severity={defect.severity} />
						</div>
						<p className="muted mt-1">{defect.shortDescription}</p>
						<p className="text-sm text-text-muted mt-1">{defect.code}</p>
					</div>
				</div>
				<Link href="/" className="absolute left-4 top-4 glass rounded-full px-3 py-1.5 text-sm hover:opacity-90">
					← Quay lại
				</Link>
			</div>
			{/* Gallery */}
			{defect.images.length > 1 ? (
				<section className="container py-6 md:py-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
						{defect.images.map((img) => (
							<div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-bg-muted">
								{img.mimeType?.startsWith("video/") ? (
									<video src={img.url} className="w-full h-full object-cover" controls muted />
								) : (
									<Image src={img.url} alt={img.altText ?? defect.name} fill className="object-cover" />
								)}
							</div>
						))}
					</div>
				</section>
			) : null}
			{/* Text sections */}
			<section className="container pb-10 grid md:grid-cols-3 gap-6">
				<div className="md:col-span-2 space-y-4">
					{defect.description ? (
						<div className="card p-6">
							<h3 className="font-medium mb-1">Mô tả</h3>
							<p className="text-text-soft">{defect.description}</p>
						</div>
					) : null}
					{defect.cause ? (
						<div className="card p-6">
							<h3 className="font-medium mb-1">Nguyên nhân</h3>
							<p className="text-text-soft">{defect.cause}</p>
						</div>
					) : null}
					{defect.detectionMethod ? (
						<div className="card p-6">
							<h3 className="font-medium mb-1">Cách nhận biết</h3>
							<p className="text-text-soft">{defect.detectionMethod}</p>
						</div>
					) : null}
					{defect.solution ? (
						<div className="card p-6">
							<h3 className="font-medium mb-1">Xử lý / Phòng tránh</h3>
							<p className="text-text-soft">{defect.solution}</p>
						</div>
					) : null}
				</div>
				<aside className="space-y-3">
					<div className="card p-6">
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div className="muted">Nhóm lỗi</div>
							<div>{defect.defectGroup ?? "-"}</div>
							<div className="muted">Công đoạn</div>
							<div>{defect.processStage ?? "-"}</div>
							<div className="muted">Cập nhật</div>
							<div>{new Date(defect.updatedAt).toLocaleString()}</div>
						</div>
					</div>
				</aside>
			</section>
		</main>
	);
}

