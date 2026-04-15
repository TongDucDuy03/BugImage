import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionCookieOptions, SESSION_COOKIE_NAME, validateAdminLogin } from "@/lib/auth";

const schema = z.object({
	email: z.string().email(),
	password: z.string().min(6)
});

export async function POST(req: Request) {
	const json = await req.json().catch(() => ({}));
	const parsed = schema.safeParse(json);
	if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	const user = await validateAdminLogin(parsed.data.email, parsed.data.password);
	if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

	const value = JSON.stringify({ userId: user.id, email: user.email, role: user.role });
	const res = NextResponse.json({ ok: true });
	// Gắn cookie trực tiếp lên Response (ổn định hơn cookies() trong Route Handler) + tránh Secure trên HTTP
	res.cookies.set(SESSION_COOKIE_NAME, value, getSessionCookieOptions());
	return res;
}

