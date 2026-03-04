import { cookies } from "next/headers"
import { query, sql } from "./db"
import type { SessionUser } from "./types"

const SESSION_COOKIE = "la_cuchara_session"

function encodeSession(user: SessionUser): string {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me"
  const payload = JSON.stringify(user)
  const encoded = Buffer.from(payload).toString("base64")
  const crypto = require("crypto")
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("hex")
  return `${encoded}.${signature}`
}

function decodeSession(token: string): SessionUser | null {
  try {
    const secret = process.env.AUTH_SECRET || "dev-secret-change-me"
    const [encoded, signature] = token.split(".")
    const crypto = require("crypto")
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(encoded)
      .digest("hex")
    if (signature !== expectedSig) return null
    const payload = Buffer.from(encoded, "base64").toString("utf-8")
    return JSON.parse(payload) as SessionUser
  } catch {
    return null
  }
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = encodeSession(user)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return decodeSession(token)
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) throw new Error("No autorizado")
  return user
}

export async function requireRole(role: "cliente" | "hostelero"): Promise<SessionUser> {
  const user = await requireSession()
  if (user.Rol !== role) throw new Error("Acceso denegado")
  return user
}
