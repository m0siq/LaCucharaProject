import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0]

    // 1. Obtener todos los hosteleros
    const resHosteleros = await fetch(`${API_URL}/hosteleros/`)
    if (!resHosteleros.ok) {
      return NextResponse.json({ error: "Error al obtener hosteleros" }, { status: 500 })
    }
    const hosteleros = await resHosteleros.json()

    // 2. Para cada hostelero obtener su menu de hoy y valoraciones
    const restaurantes = await Promise.all(
      hosteleros.map(async (h: { IDUsuario: number; NombreRestaurante: string }) => {

        // Menus del hostelero
        const resMenus = await fetch(`${API_URL}/menus/?id_usuario=${h.IDUsuario}`)
        const menusData = resMenus.ok ? await resMenus.json() : []
        const menus = Array.isArray(menusData) ? menusData : []

        // Menu de hoy
        const menuHoy = menus.find((m: { Fecha: string }) => m.Fecha === today) || null

        // Platos del menu de hoy
        let platos: { IDPlato: number }[] = []
        if (menuHoy) {
          const resPlatos = await fetch(`${API_URL}/menus/${menuHoy.IDMenu}/platos`)
          platos = resPlatos.ok ? await resPlatos.json() : []
        }

        // Valoraciones de todos los platos
        let totalValoraciones = 0
        let sumaValoraciones = 0

        await Promise.all(
          platos.map(async (p) => {
            const resMedia = await fetch(`${API_URL}/valoraciones/media/${p.IDPlato}`)
            if (resMedia.ok) {
              const mediaData = await resMedia.json()
              if (mediaData.media !== null) {
                sumaValoraciones += mediaData.media
                totalValoraciones++
              }
            }
          })
        )

        const promedioValoracion = totalValoraciones > 0
          ? sumaValoraciones / totalValoraciones
          : null

        return {
          IDRestaurante:      h.IDUsuario,        // usamos IDUsuario como IDRestaurante
          NombreRestaurante:  h.NombreRestaurante,
          Direccion:          null,               // no existe en tu BD
          Descripcion:        null,               // no existe en tu BD
          IDMenu:             menuHoy?.IDMenu || null,
          Precio:             null,               // no existe en tu BD
          PromedioValoracion: promedioValoracion,
          TotalValoraciones:  totalValoraciones,
        }
      })
    )

    // Ordenar por valoracion descendente
    restaurantes.sort((a, b) => (b.PromedioValoracion || 0) - (a.PromedioValoracion || 0))

    return NextResponse.json({ restaurantes })

  } catch (error: unknown) {
    console.error("Error fetching restaurantes:", error)
    return NextResponse.json({ error: "Error al obtener restaurantes" }, { status: 500 })
  }
}