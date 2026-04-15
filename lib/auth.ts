import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE_NAME = "bugimage_session";

export type Session = {
	userId: string;
	email: string;
	role: string;
};

/** Cookie session: mặc định không dùng Secure (để http:// localhost / LAN + `npm start` vẫn đăng nhập được). Bật HTTPS: đặt COOKIE_SECURE=1 */
export function getSessionCookieOptions() {
	return {
		httpOnly: true,
		secure: process.env.COOKIE_SECURE === "1",
		path: "/",
		maxAge: 60 * 60 * 8,
		sameSite: "lax" as const
	};
}

export async function createSession(userId: string, email: string, role: string) {
	const value = JSON.stringify({ userId, email, role });
	cookies().set(SESSION_COOKIE_NAME, value, getSessionCookieOptions());
}

export async function destroySession() {
	cookies().delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
	const raw = cookies().get(SESSION_COOKIE_NAME)?.value;
	if (!raw) return null;
	try {
		return JSON.parse(raw) as Session;
	} catch {
		return null;
	}
}

export async function requireAdmin(): Promise<Session> {
	const session = await getSession();
	if (!session) throw new Error("UNAUTHORIZED");
	if (session.role !== "admin") throw new Error("FORBIDDEN");
	return session;
}

/** Nhân viên nhập liệu (staff) hoặc admin */
export async function requireEditor(): Promise<Session> {
	const session = await getSession();
	if (!session) throw new Error("UNAUTHORIZED");
	if (session.role !== "admin" && session.role !== "staff") throw new Error("FORBIDDEN");
	return session;
}

export async function validateAdminLogin(email: string, password: string) {
	const normalizedEmail = email.trim().toLowerCase();
	const user = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });
	if (!user || !user.isActive) return null;
	const ok = await bcrypt.compare(password, user.passwordHash);
	if (!ok) return null;
	return user;
}

