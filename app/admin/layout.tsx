import { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen grid md:grid-cols-[240px_1fr]">
			<aside className="hidden md:block border-r border-bg-muted/40 p-4">
				<div className="text-xl font-semibold mb-6">Quản trị</div>
				<nav className="space-y-2">
					<Link className="block hover:underline" href="/admin/defects">
						Danh sách lỗi
					</Link>
				</nav>
			</aside>
			<main className="p-4 md:p-8">{children}</main>
		</div>
	);
}

