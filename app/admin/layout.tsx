import { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen grid md:grid-cols-[240px_1fr]">
			<aside className="hidden border-r border-bg-muted/40 p-4 md:block">
				<div className="mb-6 text-xl font-semibold">Quản trị</div>
				<nav className="space-y-2 text-sm">
					<Link className="block font-medium hover:underline" href="/admin/reports">
						Báo cáo ngày
					</Link>
					<Link className="block hover:underline text-text-muted" href="/">
						Dashboard (công khai)
					</Link>
					<Link className="block hover:underline text-text-muted" href="/tv">
						Màn hình TV
					</Link>
				</nav>
			</aside>
			<main className="p-4 md:p-8">{children}</main>
		</div>
	);
}
