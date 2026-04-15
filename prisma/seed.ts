import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
	const adminEmail = "admin@gmail.com";
	const adminPassword = "Admin123!";
	const passwordHash = await bcrypt.hash(adminPassword, 10);
	await prisma.adminUser.upsert({
		where: { email: adminEmail },
		update: {
			passwordHash,
			fullName: "Admin",
			role: "admin",
			isActive: true
		},
		create: {
			email: adminEmail,
			passwordHash,
			fullName: "Admin",
			role: "admin",
			isActive: true
		}
	});

	const catalogSeeds: Array<{ kind: string; name: string; code?: string; sortOrder: number }> = [
		{ kind: "steel_grade", name: "SCW480", sortOrder: 1 },
		{ kind: "steel_grade", name: "SCW410", sortOrder: 2 },
		{ kind: "steel_grade", name: "Gang CR", sortOrder: 3 },
		{ kind: "workshop", name: "Hoàn thiện", sortOrder: 1 },
		{ kind: "workshop", name: "Gia công", sortOrder: 2 },
		{ kind: "workshop", name: "Nhiệt luyện", sortOrder: 3 },
		{ kind: "defect_type", name: "Rỗ miệng gia công", sortOrder: 1 },
		{ kind: "defect_type", name: "Bề mặt xấu", sortOrder: 2 },
		{ kind: "defect_type", name: "Rỗ ngót chân đầu", sortOrder: 3 },
		{ kind: "defect_type", name: "Cháy bám cát", sortOrder: 4 },
		{ kind: "defect_type", name: "Xập chân đậu", sortOrder: 5 },
		{ kind: "defect_type", name: "Sập khuôn", sortOrder: 6 }
	];

	for (const row of catalogSeeds) {
		await prisma.catalogItem.upsert({
			where: { kind_name: { kind: row.kind, name: row.name } },
			update: { sortOrder: row.sortOrder, code: row.code ?? null, isActive: true },
			create: {
				kind: row.kind,
				name: row.name,
				code: row.code ?? null,
				sortOrder: row.sortOrder,
				isActive: true
			}
		});
	}

	console.log("Seed completed.");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
