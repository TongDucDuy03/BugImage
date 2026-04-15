 "use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		const res = await fetch("/api/admin/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify({ email: email.trim(), password })
		});
		setLoading(false);
		if (res.ok) {
			router.refresh();
			router.push("/admin/reports");
			return;
		}
		const data = await res.json().catch(() => ({}));
		setError(typeof data?.error === "string" ? data.error : "Sai tài khoản hoặc mật khẩu");
	}

	return (
		<div className="min-h-screen grid place-items-center">
			<form onSubmit={onSubmit} className="card w-full max-w-sm p-6 space-y-4">
				<h1 className="text-xl font-semibold">Đăng nhập quản trị</h1>
				{error ? <div className="text-danger text-sm">Sai tài khoản hoặc mật khẩu</div> : null}
				<div className="space-y-1">
					<label className="text-sm">Email</label>
					<input
						className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
						type="email"
						required
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>
				<div className="space-y-1">
					<label className="text-sm">Mật khẩu</label>
					<input
						className="w-full rounded-md bg-bg-muted border border-bg-muted/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
						type="password"
						required
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</div>
				<button
					type="submit"
					disabled={loading}
					className="w-full rounded-md bg-primary text-black font-medium py-2 hover:opacity-90 disabled:opacity-60"
				>
					{loading ? "Đang đăng nhập..." : "Đăng nhập"}
				</button>
			</form>
		</div>
	);
}

