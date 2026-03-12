/**
 * app/api/ml/keywords/route.ts
 * ─────────────────────────────
 * Extrae palabras clave de un texto para filtrado en el frontend.
 * Llama a POST /ml/keywords del backend FastAPI.
 */

import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export async function POST(request: Request) {
  try {
    const body = await request.json() as { texto: string; n?: number }

    if (!body.texto?.trim()) {
      return NextResponse.json({ keywords: [], total: 0 })
    }

    const mlRes = await fetch(`${BACKEND_URL}/ml/keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: body.texto, n: body.n ?? 5 }),
    })

    if (!mlRes.ok) {
      return NextResponse.json({ keywords: [], total: 0 })
    }

    const data = await mlRes.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error("[ML] Keywords error:", err)
    return NextResponse.json({ keywords: [], total: 0 })
  }
}
