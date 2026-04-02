import { prisma } from "@/lib/db";
import EditForm from "./ui/EditForm";
import MediaManager from "./ui/MediaManager";

export default async function EditDefectPage({ params }: { params: { id: string } }) {
	const d = await prisma.defect.findUnique({
		where: { id: params.id },
		include: {
			images: {
				where: {},
				orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
			}
		}
	});
	if (!d) return <div className="muted">Not found</div>;
	return (
		<div className="grid lg:grid-cols-2 gap-8">
			<div className="max-w-3xl">
				<h1 className="text-xl font-semibold mb-4">Edit Defect</h1>
				<EditForm defect={d} />
			</div>
			<div>
				<h2 className="text-lg font-semibold mb-3">Media Manager</h2>
				<MediaManager defectId={d.id} images={d.images} />
			</div>
		</div>
	);
}

