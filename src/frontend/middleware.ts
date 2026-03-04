import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get("la_cuchara_session")

  // Public routes - no auth needed
  const publicPaths = ["/", "/login", "/registro", "/api/auth/login", "/api/auth/registro"]
  if (publicPaths.includes(pathname) || pathname.startsWith("/images")) {
    return NextResponse.next()
  }

  // API routes that need auth - let the API handle auth itself
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Protected routes - redirect to login if no session
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Decode session to check role (simple base64 decode, signature checked in auth.ts)
  try {
    const [encoded] = sessionCookie.value.split(".")
    const payload = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"))

    // Redirect hostelero away from cliente routes and vice versa
    if (pathname.startsWith("/hostelero") && payload.Rol !== "hostelero") {
      return NextResponse.redirect(new URL("/cliente", request.url))
    }
    if (pathname.startsWith("/cliente") && payload.Rol !== "cliente") {
      return NextResponse.redirect(new URL("/hostelero", request.url))
    }
  } catch {
    // Invalid session - redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete("la_cuchara_session")
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-light-32x32.png|icon-dark-32x32.png|icon.svg|apple-icon.png).*)",
  ],
}
