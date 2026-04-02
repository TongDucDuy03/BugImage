import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, validateAdminLogin } from "@/lib/auth";

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
	await createSession(user.id, user.email, user.role);
	return NextResponse.json({ ok: true });
}

