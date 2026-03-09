import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ValoracionRaw {
  IDValoracion: number
  IDPlato: number
  IDUsuario: number
  Puntuacion: number | null
  Comentario: string | null
  Fecha: string | null
}

export async function GET() {
  try {
    const user = await requireRole("hostelero")

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

    // Valoraciones de cada plato (en paralelo), enriquecidas con info del plato
    const valoracionesPorPlato = await Promise.all(
      uniquePlatos.map(async (plato) => {
        const res = await fetch(`${API_URL}/valoraciones/?id_plato=${plato.IDPlato}`)
        const vals: ValoracionRaw[] = res.ok ? await res.json() : []
        return vals.map((v) => ({
          IDValoracion:  v.IDValoracion,
          Puntuacion:    v.Puntuacion,
          Comentario:    v.Comentario,
          Fecha:         v.Fecha,
          IDPlato:       plato.IDPlato,
          NombrePlato:   plato.NombrePlato,
          Tipo:          plato.Tipo,
        }))
      })
    )

    const valoraciones = valoracionesPorPlato
      .flat()
      .sort((a, b) => new Date(b.Fecha ?? 0).getTime() - new Date(a.Fecha ?? 0).getTime())

    return NextResponse.json({ valoraciones })
  } catch (error: unknown) {
    console.error("Error fetching hostelero valoraciones:", error)
    return NextResponse.json(
      { error: "Error al obtener valoraciones" },
      { status: 500 }
    )
  }
}
