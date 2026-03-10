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
    console.log("Hosteleros from API:", hosteleros)

    // 2. Para cada hostelero obtener su menu de hoy y valoraciones
    const restaurantes = await Promise.all(
      hosteleros.map(async (h: { IDUsuario: number; NombreRestaurante: string; has_logo?: boolean }) => {

        // Obtener logo del hostelero
        let logoBase64: string | null = null
        if (h.has_logo) {
          try {
            const logoRes = await fetch(`${API_URL}/hosteleros/${h.IDUsuario}/logo`)
            if (logoRes.ok) {
              const logoBlob = await logoRes.blob()
              const arrayBuffer = await logoBlob.arrayBuffer()
              const bytes = new Uint8Array(arrayBuffer)
              const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '')
              logoBase64 = `data:image/jpeg;base64,${btoa(binary)}`
            }
          } catch (e) {
            console.log(`Failed to fetch logo for ${h.IDUsuario}:`, e)
          }
        }

        // Todos los menus del hostelero (igual que en /api/hostelero/restaurante)
        const resMenus = await fetch(`${API_URL}/menus/?id_usuario=${h.IDUsuario}`)
        const menusData = resMenus.ok ? await resMenus.json() : []
        const menus: { IDMenu: number; Fecha: string }[] = Array.isArray(menusData) ? menusData : []

        // Menu de hoy (solo para IDMenu y Precio)
        const menuHoy = menus.find((m) => m.Fecha === today) || null

        // Platos únicos de TODOS los menus (igual que hostelero)
        const platosPerMenu = await Promise.all(
          menus.map((menu) =>
            fetch(`${API_URL}/menus/${menu.IDMenu}/platos`)
              .then((r) => (r.ok ? r.json() : []))
              .then((platos: { IDPlato: number }[]) => platos)
          )
        )

        const uniquePlatosMap = new Map<number, { IDPlato: number }>()
        for (const platos of platosPerMenu) {
          for (const p of platos) {
            uniquePlatosMap.set(p.IDPlato, p)
          }
        }
        const uniquePlatos = Array.from(uniquePlatosMap.values())

        // Valoraciones de todos los platos únicos (igual que hostelero)
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
        const promedioValoracion =
          puntuaciones.length > 0
            ? puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length
            : null

        return {
          IDRestaurante:      h.IDUsuario,
          NombreRestaurante:  h.NombreRestaurante,
          Direccion:          null,
          Descripcion:        null,
          IDMenu:             menuHoy?.IDMenu || null,
          Precio:             null,
          PromedioValoracion: promedioValoracion,
          TotalValoraciones,
          hasLogo:            h.has_logo || false,
          logoBase64,
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