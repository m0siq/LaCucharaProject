import { NextResponse } from "next/server"
import { query, sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET() {
  try {
    const user = await requireRole("hostelero")

    const restaurantes = await query(
      `SELECT r.*, 
        (SELECT COUNT(*) FROM Menus m WHERE m.IDRestaurante = r.IDRestaurante) AS TotalMenus,
        (SELECT AVG(CAST(v.Puntuacion AS FLOAT)) 
         FROM Valoraciones v 
         JOIN Platos p ON v.IDPlato = p.IDPlato 
         JOIN Menus m ON p.IDMenu = m.IDMenu 
         WHERE m.IDRestaurante = r.IDRestaurante) AS PromedioValoracion,
        (SELECT COUNT(*) 
         FROM Valoraciones v 
         JOIN Platos p ON v.IDPlato = p.IDPlato 
         JOIN Menus m ON p.IDMenu = m.IDMenu 
         WHERE m.IDRestaurante = r.IDRestaurante) AS TotalValoraciones
       FROM Restaurantes r
       WHERE r.IDHostelero = @userId`,
      [{ name: "userId", type: sql.Int, value: user.IDUsuario }]
    )

    return NextResponse.json({ restaurante: restaurantes[0] || null })
  } catch (error: unknown) {
    console.error("Error fetching hostelero data:", error)
    return NextResponse.json(
      { error: "Error al obtener datos del restaurante" },
      { status: 500 }
    )
  }
}
