import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

// --- CSRF Protection ---
// Reject state-changing requests (POST/PUT/PATCH/DELETE) to API routes
// unless the Origin header matches our app's origin.
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function csrfCheck(req: NextRequest): NextResponse | null {
  // Only check mutating methods to API routes
  if (!MUTATING_METHODS.has(req.method)) return null;
  if (!req.nextUrl.pathname.startsWith("/api/")) return null;

  // Allow NextAuth's internal endpoints (they have their own CSRF)
  if (req.nextUrl.pathname.startsWith("/api/auth/")) return null;

  const origin = req.headers.get("origin");
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  // If no Origin header, check Referer as fallback
  if (!origin) {
    const referer = req.headers.get("referer");
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        const expectedOrigin = new URL(appUrl).origin;
        if (refererOrigin !== expectedOrigin) {
          return NextResponse.json({ error: "Solicitud rechazada (CSRF)" }, { status: 403 });
        }
      } catch {
        // Can't parse referer — allow (may be a dev tool or curl)
      }
    }
    return null; // No Origin or Referer — allow (e.g. server-to-server, curl)
  }

  // Compare origin
  try {
    const expectedOrigin = new URL(appUrl).origin;
    if (origin !== expectedOrigin) {
      return NextResponse.json({ error: "Solicitud rechazada (CSRF)" }, { status: 403 });
    }
  } catch {
    // Can't parse APP_URL — skip check in dev
  }

  return null;
}

// Compose CSRF check with NextAuth middleware
export default withAuth(
  function middleware(req) {
    const csrfError = csrfCheck(req);
    if (csrfError) return csrfError;
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/auth/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        // API routes and public pages handle auth themselves
        if (req.nextUrl.pathname.startsWith("/api/")) return true;
        // Protected pages require a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/declarations/:path*",
    "/profile/:path*",
    "/identity/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
