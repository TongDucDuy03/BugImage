import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

	async function main() {
	const adminEmail = "admin@gmail.com";
	const adminPassword = "Admin123!";
	{
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
	}

	// Seed demo defects
	const demoDefects = [
		{
			code: "DF-001",
			name: "Surface Scratch",
			slug: "surface-scratch",
			shortDescription: "Visible scratch on top cover",
			description:
				"Scratch marks observed on the top metal cover likely caused by handling tools.",
			cause: "Improper handling during assembly.",
			detectionMethod: "Visual inspection under bright light.",
			solution: "Protective mats; operator training.",
			severity: "medium",
			defectGroup: "Appearance",
			processStage: "Assembly",
			isActive: true,
			isFeatured: true,
			sortOrder: 1
		},
		{
			code: "DF-002",
			name: "Misaligned Label",
			slug: "misaligned-label",
			shortDescription: "Label offset >2mm",
			description: "Product label misaligned beyond tolerance.",
			cause: "Jig misplacement.",
			detectionMethod: "Template gauge.",
			solution: "Calibrate jig; add stop block.",
			severity: "low",
			defectGroup: "Labeling",
			processStage: "Packaging",
			isActive: true,
			isFeatured: true,
			sortOrder: 2
		},
		{
			code: "DF-003",
			name: "Bent Pin",
			slug: "bent-pin",
			shortDescription: "Connector pin bent",
			description: "I/O connector pin bent causing poor contact.",
			cause: "Rough insertion into tester.",
			detectionMethod: "Connector test; camera.",
			solution: "Guide funnel; operator SOP.",
			severity: "high",
			defectGroup: "Mechanical",
			processStage: "Testing",
			isActive: true,
			isFeatured: false,
			sortOrder: 3
		},
		{
			code: "DF-004",
			name: "Paint Bubble",
			slug: "paint-bubble",
			shortDescription: "Bubble under coating",
			description: "Coating trapped air leading to bubble.",
			cause: "Humidity; spray distance.",
			detectionMethod: "Visual; touch feel.",
			solution: "Adjust booth settings.",
			severity: "medium",
			defectGroup: "Coating",
			processStage: "Painting",
			isActive: true,
			isFeatured: false,
			sortOrder: 4
		},
		{
			code: "DF-005",
			name: "Cracked Housing",
			slug: "cracked-housing",
			shortDescription: "Crack at screw boss",
			description: "Stress crack near screw boss after torque.",
			cause: "Over-torque; brittle resin.",
			detectionMethod: "Visual + torque record.",
			solution: "Torque control; material review.",
			severity: "critical",
			defectGroup: "Structural",
			processStage: "Assembly",
			isActive: true,
			isFeatured: true,
			sortOrder: 5
		},
		{
			code: "DF-006",
			name: "Solder Bridge",
			slug: "solder-bridge",
			shortDescription: "Short between pads",
			description: "Excess solder bridging adjacent pads.",
			cause: "Stencil or reflow profile.",
			detectionMethod: "AOI.",
			solution: "Stencil tweak; profile tune.",
			severity: "high",
			defectGroup: "Electrical",
			processStage: "SMT",
			isActive: true,
			isFeatured: true,
			sortOrder: 6
		}
	];

	for (const d of demoDefects) {
		const created = await prisma.defect.upsert({
			where: { slug: d.slug },
			update: { ...d },
			create: { ...d }
		});

		// Attach placeholder images (urls point to /uploads placeholders)
		const images = [1, 2, 3].map((i) => ({
			defectId: created.id,
			fileName: `${d.slug}-${i}.jpg`,
			originalName: `${d.slug}-${i}.jpg`,
			mimeType: "image/jpeg",
			fileSize: 150000,
			path: `/uploads/${d.slug}-${i}.jpg`,
			url: `/uploads/${d.slug}-${i}.jpg`,
			altText: `${d.name} ${i}`,
			isCover: i === 1,
			isActive: true,
			sortOrder: i
		}));

		for (const img of images) {
			const existing = await prisma.defectImage.findFirst({
				where: { defectId: created.id, fileName: img.fileName }
			});
			if (existing) {
				await prisma.defectImage.update({
					where: { id: existing.id },
					data: { ...img }
				});
			} else {
				await prisma.defectImage.create({ data: { ...img } });
			}
		}

		// Ensure coverImageId is set on the defect to the image marked isCover
		const cover = await prisma.defectImage.findFirst({
			where: { defectId: created.id, isCover: true, deletedAt: null }
		});
		if (cover) {
			await prisma.defect.update({
				where: { id: created.id },
				data: { coverImageId: cover.id }
			});
		}
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

