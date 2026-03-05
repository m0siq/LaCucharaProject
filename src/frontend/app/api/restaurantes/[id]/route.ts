import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const today = new Date().toISOString().split("T")[0]

    // 1. Datos del hostelero
    const resHostelero = await fetch(`${API_URL}/hosteleros/${id}`)
    if (!resHostelero.ok) {
      return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 })
    }
    const hostelero = await resHostelero.json()

    // 2. Todos los menus del hostelero
    const resMenus = await fetch(`${API_URL}/menus/?id_usuario=${id}`)
    const menusData = resMenus.ok ? await resMenus.json() : []
    const menus = Array.isArray(menusData) ? menusData : []

    const now = new Date()
console.log("UTC date:", now.toISOString().split("T")[0])
console.log("Local date:", now.toLocaleDateString("es-ES"))
console.log("Menus raw:", JSON.stringify(menusData))
    // 3. Menu de hoy
    const menuHoy = menus.find((m: { Fecha: string }) => m.Fecha === today) || null

    // 4. Platos del menu de hoy con valoraciones
    let platos: unknown[] = []
    if (menuHoy) {
      const resPlatos = await fetch(`${API_URL}/menus/${menuHoy.IDMenu}/platos`)
      const platosData = resPlatos.ok ? await resPlatos.json() : []

      platos = await Promise.all(
        platosData.map(async (p: {
          IDPlato: number
          NombrePlato: string
          Descripcion: string | null
          Tipo: string | null
        }) => {
          const resMedia = await fetch(`${API_URL}/valoraciones/media/${p.IDPlato}`)
          const mediaData = resMedia.ok ? await resMedia.json() : { media: null }

          const resVals = await fetch(`${API_URL}/valoraciones/?id_plato=${p.IDPlato}`)
          const valsData = resVals.ok ? await resVals.json() : []

          return {
            IDPlato:            p.IDPlato,
            Nombre:             p.NombrePlato,
            Descripcion:        p.Descripcion,
            Tipo:               (p.Tipo || "otro").toLowerCase(),
            PromedioValoracion: mediaData.media,
            TotalValoraciones:  Array.isArray(valsData) ? valsData.length : 0,
          }
        })
      )
    }

    return NextResponse.json({
      restaurante: {
        IDRestaurante:     hostelero.IDUsuario,
        NombreRestaurante: hostelero.NombreRestaurante,
        Direccion:         null,
        Descripcion:       null,
      },
      menu:   menuHoy,
      menus,            // ← todos los menus para el historial
      platos,
    })

  } catch (error: unknown) {
    console.error("Error fetching restaurante:", error)
    return NextResponse.json({ error: "Error al obtener restaurante" }, { status: 500 })
  }
}