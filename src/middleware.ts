import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_EMAILS = [
  "admin@fenuasim.com",
  "hello@fenuasim.com",
  "tomleb987@gmail.com",
  "contact@fenuasim.com",
  "thomlebeau@outlook.com",
  "thomlebeau987@gmail.com",
];

export function middleware(req: NextRequest) {
  // Laisser passer la page de login
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get("sb-access-token")?.value
    || req.cookies.get("supabase-auth-token")?.value;

  if (!token) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const email = payload.email as string;
    const exp = payload.exp as number;

    if (Date.now() / 1000 > exp) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    if (!ADMIN_EMAILS.includes(email) && !email.endsWith("@fenuasim.com")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
