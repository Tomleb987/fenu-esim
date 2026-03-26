// ============================================================
// FENUA SIM – Middleware (version neutre / debug)
// src/middleware.ts
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // Ne rien faire, laisser passer toutes les requêtes
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
