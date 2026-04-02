import { prisma } from "@/lib/db";
import { HeroDefectCarousel } from "@/components/public/HeroDefectCarousel";

async function getActiveDefects() {
	const items = await prisma.defect.findMany({
		where: { isActive: true, deletedAt: null },
		orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
		include: {
			images: {
				where: { isActive: true, deletedAt: null },
				orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
			}
		}
	});

	return items.map((d) => ({
		...(function () {
			// Prefer image as display cover (never use video as homepage cover if image exists)
			const preferred = d.images.find((m) => m.mimeType?.startsWith("image/")) ?? d.images[0];
			return {
				imageUrl: preferred?.url || "/uploads/placeholder.jpg",
				mimeType: preferred?.mimeType || "image/jpeg"
			};
		})(),
		id: d.id,
		name: d.name,
		slug: d.slug,
		shortDescription: d.shortDescription,
		severity: d.severity,
		code: d.code
	}));
}

export default async function HomePage() {
	const defects = await getActiveDefects();
	return (
		<main className="w-screen h-screen overflow-hidden">
			<HeroDefectCarousel items={defects} intervalMs={7000} height="100vh" />
		</main>
	);
}

