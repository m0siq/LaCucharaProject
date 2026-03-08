import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    console.log("[PUT /api/platos/[id]] ID:", id)
    console.log("[PUT /api/platos/[id]] Body recibido:", body)
    console.log("[PUT /api/platos/[id]] API_URL:", API_URL)

    const fetchUrl = `${API_URL}/platos/${id}`
    console.log("[PUT /api/platos/[id]] Enviando a:", fetchUrl)
    
    const res = await fetch(fetchUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        NombrePlato: body.nombre,
        Tipo: body.tipo,
        Descripcion: body.descripcion,
      }),
    })

    const responseText = await res.text()
    console.log("[PUT /api/platos/[id]] Respuesta status:", res.status)
    console.log("[PUT /api/platos/[id]] Respuesta body:", responseText)

    if (!res.ok) {
      try {
        const error = JSON.parse(responseText)
        return NextResponse.json(
          { error: error?.detail || "Error al actualizar plato" },
          { status: res.status }
        )
      } catch {
        return NextResponse.json(
          { error: responseText || "Error al actualizar plato" },
          { status: res.status }
        )
      }
    }

    const plato = JSON.parse(responseText)
    return NextResponse.json(plato)

  } catch (error: unknown) {
    console.error("[PUT /api/platos/[id]] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar plato" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log("[DELETE /api/platos/[id]] ID:", id)
    console.log("[DELETE /api/platos/[id]] API_URL:", API_URL)

    const fetchUrl = `${API_URL}/platos/${id}`
    console.log("[DELETE /api/platos/[id]] Enviando a:", fetchUrl)

    const res = await fetch(fetchUrl, {
      method: "DELETE",
    })

    const responseText = await res.text()
    console.log("[DELETE /api/platos/[id]] Respuesta status:", res.status)
    console.log("[DELETE /api/platos/[id]] Respuesta body:", responseText)

    if (!res.ok) {
      try {
        const error = JSON.parse(responseText)
        return NextResponse.json(
          { error: error?.detail || "Error al eliminar plato" },
          { status: res.status }
        )
      } catch {
        return NextResponse.json(
          { error: responseText || "Error al eliminar plato" },
          { status: res.status }
        )
      }
    }

    return NextResponse.json({ ok: true })

  } catch (error: unknown) {
    console.error("[DELETE /api/platos/[id]] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al eliminar plato" },
      { status: 500 }
    )
  }
}
