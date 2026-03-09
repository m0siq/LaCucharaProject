import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hostelero")
    const { id } = await params
    const { nombre, tipo, descripcion } = await request.json()

    const res = await fetch(`${API_URL}/platos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        NombrePlato: nombre || null,
        Tipo: tipo || null,
        Descripcion: descripcion?.substring(0, 150) || null,
      }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.detail || "Error al actualizar plato" },
        { status: res.status }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("Error updating plato:", error)
    return NextResponse.json(
      { error: "Error al actualizar plato" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hostelero")
    const { id } = await params

    const res = await fetch(`${API_URL}/platos/${id}`, { method: "DELETE" })

    if (!res.ok && res.status !== 204) {
      const error = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.detail || "Error al eliminar plato" },
        { status: res.status }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("Error deleting plato:", error)
    return NextResponse.json(
      { error: "Error al eliminar plato" },
      { status: 500 }
    )
  }
}
