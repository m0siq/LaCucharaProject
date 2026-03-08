import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hostelero")
    const { id } = await params

    // Proxy al backend FastAPI
    const res = await fetch(`${API_URL}/menus/${id}/platos`)


    if (!res.ok) {
      return NextResponse.json(
        { error: "Error al obtener platos del menú" },
        { status: res.status }
      )
    }

    // El backend devuelve un array directamente
    const platos = await res.json()
    return NextResponse.json(platos)


  } catch (error: unknown) {
    console.error("Error fetching platos:", error)
    return NextResponse.json(
      { error: "Error al obtener platos" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hostelero")
    const { id } = await params
    const { IDMenu, NombrePlato, Descripcion, Tipo } = await request.json()

    // Proxy al backend FastAPI para crear plato
    const res = await fetch(`${API_URL}/platos/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        IDMenu: parseInt(id),
        NombrePlato,
        Descripcion,
        Tipo,
      }),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: "Error al crear plato" },
        { status: res.status }
      )
    }

    const plato = await res.json()
    return NextResponse.json(plato, { status: 201 })

  } catch (error: unknown) {
    console.error("Error creating plato:", error)
    return NextResponse.json(
      { error: "Error al crear plato" },
      { status: 500 }
    )
  }
}
