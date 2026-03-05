import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function GET() {
  try {
    const user = await requireRole("hostelero")

    // Datos del hostelero/restaurante
    const resHostelero = await fetch(`${API_URL}/hosteleros/${user.IDUsuario}`)
    if (!resHostelero.ok) {
      return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 })
    }
    const hostelero = await resHostelero.json()

    // Menus del hostelero
    const resMenus = await fetch(`${API_URL}/menus?id_usuario=${user.IDUsuario}`)
    const menus = resMenus.ok ? await resMenus.json() : []

    // Valoraciones medias de cada plato del hostelero
    const resPlatos = await fetch(`${API_URL}/platos/`)
    const platos = resPlatos.ok ? await resPlatos.json() : []

    return NextResponse.json({
      restaurante: {
        IDUsuario:         hostelero.IDUsuario,
        NombreRestaurante: hostelero.NombreRestaurante,
        TotalMenus:        menus.length,
        TotalPlatos:       platos.length,
      }
    })

  } catch (error: unknown) {
    console.error("Error fetching hostelero data:", error)
    return NextResponse.json(
      { error: "Error al obtener datos del restaurante" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireRole("hostelero")
    const body = await request.json()

    const res = await fetch(`${API_URL}/hosteleros/${user.IDUsuario}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        NombreRestaurante: body.NombreRestaurante,
        NombreUsuario:     body.NombreUsuario,
        Contrasena:        body.Contrasena,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Error al actualizar" }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)

  } catch (error: unknown) {
    console.error("Error updating hostelero data:", error)
    return NextResponse.json(
      { error: "Error al actualizar datos del restaurante" },
      { status: 500 }
    )
  }
}