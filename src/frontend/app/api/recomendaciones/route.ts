/**
 * app/api/recomendaciones/route.ts
 * ─────────────────────────────────
 * Puente entre el frontend Next.js y el motor ML de FastAPI.
 * Llama a GET /ml/recomendar/{id_usuario} y adapta la respuesta
 * al formato que espera /cliente/recomendaciones/page.tsx
 */

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

// Tipo devuelto por FastAPI ML
interface MLPlato {
  IDPlato: number
  NombrePlato: string
  Tipo: string | null
  Descripcion: string | null
  score: number
  motivo: "colaborativo" | "popular"
}

export async function GET(request: Request) {
  // 1. Verificar sesión
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // Sólo clientes pueden ver recomendaciones
  if (session.Rol !== "cliente") {
    return NextResponse.json({ error: "Sólo disponible para clientes" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const topN = searchParams.get("top_n") ?? "6"

  try {
    // 2. Llamar al backend ML
    const mlRes = await fetch(
      `${BACKEND_URL}/ml/recomendar/${session.IDUsuario}?top_n=${topN}`,
      {
        headers: { "Content-Type": "application/json" },
        // Revalidar cada 5 minutos para no saturar el modelo
        next: { revalidate: 300 },
      }
    )

    if (!mlRes.ok) {
      const err = await mlRes.text()
      console.error("[ML] Error del backend:", err)
      return NextResponse.json({ error: "Motor ML no disponible" }, { status: 503 })
    }

    const mlData: { id_usuario: number; recomendaciones: MLPlato[]; total: number } =
      await mlRes.json()

    // 3. Adaptar al formato que usa la página de recomendaciones
    //    La página espera: { IDPlato, Nombre, Tipo, Descripcion,
    //                        PromedioValoracion, TotalValoraciones,
    //                        NombreRestaurante, IDRestaurante, Precio }
    const recomendaciones = mlData.recomendaciones.map((r) => ({
      IDPlato:            r.IDPlato,
      Nombre:             r.NombrePlato,
      Tipo:               normalizeTipo(r.Tipo),
      Descripcion:        r.Descripcion ?? null,
      PromedioValoracion: Number(r.score.toFixed(2)),
      TotalValoraciones:  0,          // no disponible en este endpoint
      NombreRestaurante:  "—",        // se puede enriquecer más adelante
      IDRestaurante:      0,
      Precio:             null,
      motivo:             r.motivo,   // "colaborativo" | "popular" (extra para debug)
    }))

    return NextResponse.json({
      recomendaciones,
      total: recomendaciones.length,
      motor: mlData.id_usuario === 0 ? "popular" : "personalizado",
    })
  } catch (err) {
    console.error("[ML] Recomendaciones error:", err)
    return NextResponse.json(
      { error: "Error al conectar con el motor de recomendaciones" },
      { status: 503 }
    )
  }
}

/** Normaliza el Tipo devuelto por la BD/ML al enum del frontend */
function normalizeTipo(tipo: string | null): "primero" | "segundo" | "postre" | "bebida" | "otro" {
  if (!tipo) return "otro"
  const t = tipo.toLowerCase()
  if (t.includes("primer") || t === "primero" || t === "entrante") return "primero"
  if (t.includes("segundo") || t === "principal")                   return "segundo"
  if (t.includes("postre"))                                         return "postre"
  if (t.includes("bebida"))                                         return "bebida"
  return "otro"
}
