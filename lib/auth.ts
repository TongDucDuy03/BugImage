import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "bugimage_session";

export type Session = {
	userId: string;
	email: string;
	role: string;
};

export async function createSession(userId: string, email: string, role: string) {
	const value = JSON.stringify({ userId, email, role });
	// Simple cookie-based session (httpOnly)
	cookies().set(COOKIE_NAME, value, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 60 * 60 * 8 // 8 hours
	});
}

export async function destroySession() {
	cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
	const raw = cookies().get(COOKIE_NAME)?.value;
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

export async function validateAdminLogin(email: string, password: string) {
	const user = await prisma.adminUser.findUnique({ where: { email } });
	if (!user || !user.isActive) return null;
	const ok = await bcrypt.compare(password, user.passwordHash);
	if (!ok) return null;
	return user;
}

