import Link from "next/link";
import { prisma } from "@/lib/db";
import DeleteDefectButton from "@/components/admin/DeleteDefectButton";

async function getDefects(q?: string) {
	return prisma.defect.findMany({
		where: {
			deletedAt: null,
			...(q
				? {
						OR: [
							{ name: { contains: q, mode: "insensitive" } },
							{ code: { contains: q, mode: "insensitive" } }
						]
				  }
				: {})
		},
		orderBy: [{ createdAt: "desc" }],
		include: {
			images: {
				where: { isActive: true, deletedAt: null },
				orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }]
			}
		}
	});
}

export default async function AdminDefectsPage({ searchParams }: { searchParams: { q?: string } }) {
	const q = searchParams?.q;
	const items = await getDefects(q);
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<h1 className="text-xl font-semibold">Danh sách lỗi</h1>
				<Link href="/admin/defects/new" className="rounded-md bg-primary text-black px-3 py-2 font-medium">
					Tạo mới
				</Link>
			</div>
			<form className="flex items-center gap-2">
				<input
					name="q"
					placeholder="Tìm theo tên hoặc mã..."
					defaultValue={q ?? ""}
					className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
				/>
				<button className="rounded-md border border-bg-muted/50 px-3 py-2 hover:bg-bg-muted">Tìm</button>
			</form>
			<div className="overflow-x-auto border border-bg-muted/40 rounded-lg">
				<table className="w-full text-sm">
					<thead className="bg-bg-muted/40">
						<tr className="text-left">
							<th className="p-3">Ảnh đại diện</th>
							<th className="p-3">Mã</th>
							<th className="p-3">Tên lỗi</th>
							<th className="p-3">Mức độ</th>
							<th className="p-3">Kích hoạt</th>
							<th className="p-3">Tạo lúc</th>
							<th className="p-3"></th>
						</tr>
					</thead>
					<tbody>
						{items.map((d) => (
							<tr key={d.id} className="border-t border-bg-muted/30">
								<td className="p-3">
									{(d.images.find((m) => m.mimeType?.startsWith("image/")) ?? d.images[0])?.url ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={(d.images.find((m) => m.mimeType?.startsWith("image/")) ?? d.images[0]).url}
											alt={d.name}
											className="h-10 w-16 object-cover rounded"
										/>
									) : (
										<div className="h-10 w-16 bg-bg-muted rounded" />
									)}
								</td>
								<td className="p-3">{d.code}</td>
								<td className="p-3">{d.name}</td>
								<td className="p-3">{d.severity === "low" ? "Thấp" : d.severity === "medium" ? "Trung bình" : d.severity === "high" ? "Cao" : "Nghiêm trọng"}</td>
								<td className="p-3">{d.isActive ? "Bật" : "Tắt"}</td>
								<td className="p-3">{new Date(d.createdAt).toLocaleString()}</td>
								<td className="p-3">
									<div className="flex items-center gap-3">
										<Link href={`/admin/defects/${d.id}/edit`} className="underline">
											Sửa
										</Link>
										<DeleteDefectButton defectId={d.id} />
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

