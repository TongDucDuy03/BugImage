import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { StorageAdapter, StoredObject } from "./types";

function getUploadRoot() {
	// Default to public/uploads
	const configured = process.env.UPLOAD_DIR || "./public/uploads";
	return path.resolve(process.cwd(), configured);
}

function sanitizeFileName(name: string) {
	return name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
}

function randomPrefix(bytes = 6) {
	return crypto.randomBytes(bytes).toString("hex");
}

export class LocalStorageAdapter implements StorageAdapter {
	async save(file: Buffer, options: { originalName: string; mimeType: string }): Promise<StoredObject> {
		const root = getUploadRoot();
		await fs.mkdir(root, { recursive: true });
		const safe = sanitizeFileName(options.originalName);
		const finalName = `${randomPrefix()}-${safe}`;
		const abs = path.join(root, finalName);
		await fs.writeFile(abs, file);
		const rel = `/uploads/${finalName}`;
		return {
			fileName: finalName,
			originalName: options.originalName,
			mimeType: options.mimeType,
			fileSize: file.byteLength,
			path: rel,
			url: rel
		};
	}

	async remove(relPath: string): Promise<void> {
		const root = getUploadRoot();
		const abs = path.join(process.cwd(), relPath.startsWith("/uploads/") ? `public${relPath}` : relPath);
		// Only delete if within upload root
		if (!abs.startsWith(root) && !abs.includes(path.join("public", "uploads"))) return;
		try {
			await fs.unlink(abs);
		} catch {
			// ignore
		}
	}
}

