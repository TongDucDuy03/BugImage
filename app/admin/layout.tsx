import { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen bg-bg lg:grid lg:grid-cols-[216px_minmax(0,1fr)]">
			<aside className="hidden border-r border-slate-200/80 bg-white/80 px-4 py-5 lg:block">
				<div className="sticky top-5">
					<div className="mb-5 text-lg font-semibold tracking-tight text-slate-950">Quản trị</div>
					<nav className="space-y-2 text-[13px]">
						<Link className="block font-medium text-slate-900 hover:underline" href="/admin/reports">
							Theo dõi hàng lỗi
						</Link>
						<Link className="block text-text-muted hover:underline" href="/">
							Dashboard (công khai)
						</Link>
						<Link className="block text-text-muted hover:underline" href="/tv">
							Màn hình TV
						</Link>
					</nav>
				</div>
			</aside>
			<main className="min-w-0">
				<div className="admin-shell px-3 py-3 sm:px-4 lg:px-5 lg:py-4 2xl:px-6">
					{children}
				</div>
			</main>
		</div>
	);
}
