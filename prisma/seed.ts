import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const prisma = new PrismaClient();

async function ensurePlaceholderJpg(targetPath: string, label: string) {
	try {
		await fs.access(targetPath);
		return;
	} catch {
		// continue
	}

	await fs.mkdir(path.dirname(targetPath), { recursive: true });

	// Create a lightweight SVG placeholder and render to JPG via sharp.
	const safe = label.replace(/[<>&]/g, "");
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e5e7eb"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#g)"/>
  <rect x="80" y="80" width="1440" height="840" rx="36" ry="36" fill="white" fill-opacity="0.65" stroke="#cbd5e1"/>
  <text x="800" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" fill="#0f172a" font-weight="700">${safe}</text>
  <text x="800" y="610" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#475569">Placeholder</text>
</svg>`;

	await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toFile(targetPath);
}

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

		// Ensure the local files exist so Next/Image doesn't 404.
		for (let i = 0; i < images.length; i++) {
			const img = images[i];
			const uploadRoot = process.env.UPLOAD_DIR || "./public/uploads";
			const abs = path.resolve(process.cwd(), uploadRoot).replace(/\\/g, "/");
			const target = path.join(abs, img.fileName);
			await ensurePlaceholderJpg(target, `${d.name} #${img.sortOrder}`);
		}

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

