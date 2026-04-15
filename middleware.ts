import { NextRequest, NextResponse } from "next/server";

const ADMIN_PREFIX = "/admin";
const SESSION_COOKIE = "bugimage_session";

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;
	if (pathname.startsWith(ADMIN_PREFIX) && !pathname.startsWith("/admin/login")) {
		const cookie = req.cookies.get(SESSION_COOKIE)?.value;
		if (!cookie) {
			const url = req.nextUrl.clone();
			url.pathname = "/admin/login";
			return NextResponse.redirect(url);
		}
		try {
			const parsed = JSON.parse(cookie);
			const role = parsed?.role as string | undefined;
			if (!parsed?.userId || (role !== "admin" && role !== "staff")) {
				const url = req.nextUrl.clone();
				url.pathname = "/admin/login";
				return NextResponse.redirect(url);
			}
		} catch {
			const url = req.nextUrl.clone();
			url.pathname = "/admin/login";
			return NextResponse.redirect(url);
		}
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/admin/:path*"]
};

