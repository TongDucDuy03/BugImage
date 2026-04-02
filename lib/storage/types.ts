export type StoredObject = {
	fileName: string;
	originalName: string;
	mimeType: string;
	fileSize: number;
	path: string; // relative path for local
	url: string; // public URL or relative for Next Public dir
};

export interface StorageAdapter {
	save(file: Buffer, options: { originalName: string; mimeType: string }): Promise<StoredObject>;
	remove(path: string): Promise<void>;
}

