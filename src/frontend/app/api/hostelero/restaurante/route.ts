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
    const menus: { IDMenu: number }[] = resMenus.ok ? await resMenus.json() : []

    // Platos de cada menú (en paralelo)
    const platosPerMenu = await Promise.all(
      menus.map((menu) =>
        fetch(`${API_URL}/menus/${menu.IDMenu}/platos`)
          .then((r) => (r.ok ? r.json() : []))
          .then((platos: { IDPlato: number; NombrePlato: string; Tipo: string | null }[]) => platos)
      )
    )

    // Platos únicos del hostelero
    const uniquePlatosMap = new Map<number, { IDPlato: number; NombrePlato: string; Tipo: string | null }>()
    for (const platos of platosPerMenu) {
      for (const p of platos) {
        uniquePlatosMap.set(p.IDPlato, p)
      }
    }
    const uniquePlatos = Array.from(uniquePlatosMap.values())

    // Valoraciones de cada plato (en paralelo)
    const valoracionesPorPlato = await Promise.all(
      uniquePlatos.map((plato) =>
        fetch(`${API_URL}/valoraciones/?id_plato=${plato.IDPlato}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((vals: { Puntuacion: number | null }[]) => vals)
      )
    )

    const todasValoraciones = valoracionesPorPlato.flat()
    const TotalValoraciones = todasValoraciones.length
    const puntuaciones = todasValoraciones
      .map((v) => v.Puntuacion)
      .filter((p): p is number => p !== null)
    const PromedioValoracion =
      puntuaciones.length > 0
        ? puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length
        : null

    return NextResponse.json({
      restaurante: {
        IDUsuario:          hostelero.IDUsuario,
        NombreRestaurante:  hostelero.NombreRestaurante,
        TotalMenus:         menus.length,
        TotalPlatos:        uniquePlatos.length,
        PromedioValoracion,
        TotalValoraciones,
      },
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