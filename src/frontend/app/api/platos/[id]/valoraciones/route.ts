import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("cliente")
    const { id } = await params

    // Buscar la valoración del usuario para este plato
    const existingRes = await fetch(
      `${API_URL}/valoraciones/?id_plato=${id}&id_usuario=${user.IDUsuario}`
    )
    const existing: { IDValoracion: number }[] = existingRes.ok
      ? await existingRes.json()
      : []

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "No tienes ninguna reseña para este plato" },
        { status: 404 }
      )
    }

    const res = await fetch(
      `${API_URL}/valoraciones/${existing[0].IDValoracion}`,
      { method: "DELETE" }
    )

    if (!res.ok && res.status !== 204) {
      const error = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.detail || "Error al eliminar reseña" },
        { status: res.status }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("Error deleting valoracion:", error)
    return NextResponse.json(
      { error: "Error al eliminar reseña" },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const res = await fetch(`${API_URL}/valoraciones/?id_plato=${id}`)

    if (!res.ok) {
      return NextResponse.json(
        { error: "Error al obtener valoraciones" },
        { status: res.status }
      )
    }

    const valoraciones = await res.json()
    return NextResponse.json({ valoraciones })
  } catch (error: unknown) {
    console.error("Error fetching valoraciones:", error)
    return NextResponse.json(
      { error: "Error al obtener valoraciones" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("cliente")
    const { id } = await params
    const { puntuacion, comentario } = await request.json()

    if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
      return NextResponse.json(
        { error: "La puntuacion debe estar entre 1 y 5" },
        { status: 400 }
      )
    }

    // Buscar si ya existe una valoración de este usuario para este plato
    const existingRes = await fetch(
      `${API_URL}/valoraciones/?id_plato=${id}&id_usuario=${user.IDUsuario}`
    )
    const existing: { IDValoracion: number }[] = existingRes.ok
      ? await existingRes.json()
      : []

    if (existing.length > 0) {
      // Actualizar la valoración existente
      const res = await fetch(
        `${API_URL}/valoraciones/${existing[0].IDValoracion}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Puntuacion: puntuacion,
            Comentario: comentario?.substring(0, 150) || null,
          }),
        }
      )

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        return NextResponse.json(
          { error: error.detail || "Error al actualizar valoracion" },
          { status: res.status }
        )
      }
    } else {
      // Crear nueva valoración
      const res = await fetch(`${API_URL}/valoraciones/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          IDPlato: parseInt(id),
          IDUsuario: user.IDUsuario,
          Puntuacion: puntuacion,
          Comentario: comentario?.substring(0, 150) || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        return NextResponse.json(
          { error: error.detail || "Error al crear valoracion" },
          { status: res.status }
        )
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating valoracion:", error)
    return NextResponse.json(
      { error: "Error al guardar valoracion" },
      { status: 500 }
    )
  }
}
