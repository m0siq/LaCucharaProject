/**
 * app/api/ml/clasificar/route.ts
 * ───────────────────────────────
 * Clasifica la categoría dietética de un plato.
 * Llama a POST /ml/clasificar del backend FastAPI.
 * Usado tras OCR y al crear platos manualmente.
 */

import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

interface ClasificarBody {
  nombre_plato: string
  descripcion?: string | null
  tipo?: string | null
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ClasificarBody

    if (!body.nombre_plato?.trim()) {
      return NextResponse.json(
        { error: "nombre_plato es requerido" },
        { status: 400 }
      )
    }

    const mlRes = await fetch(`${BACKEND_URL}/ml/clasificar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_plato: body.nombre_plato,
        descripcion:  body.descripcion ?? null,
        tipo:         body.tipo ?? null,
      }),
    })

    if (!mlRes.ok) {
      return NextResponse.json(
        { categoria: "Otro", confianza: 0, probabilidades: {}, keywords: [] }
      )
    }

    const data = await mlRes.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error("[ML] Clasificar error:", err)
    return NextResponse.json(
      { categoria: "Otro", confianza: 0, probabilidades: {}, keywords: [] }
    )
  }
}
