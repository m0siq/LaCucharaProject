import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0]

    const restaurantes = await query(
      `SELECT 
        r.IDRestaurante,
        r.NombreRestaurante,
        r.Direccion,
        r.Descripcion,
        r.ImagenURL,
        r.IDHostelero,
        m.IDMenu,
        m.Fecha,
        m.Precio,
        m.ImagenMenu,
        AVG(CAST(v.Puntuacion AS FLOAT)) AS PromedioValoracion,
        COUNT(DISTINCT v.IDValoracion) AS TotalValoraciones
      FROM Restaurantes r
      LEFT JOIN Menus m ON r.IDRestaurante = m.IDRestaurante AND m.Fecha = @today
      LEFT JOIN Platos p ON m.IDMenu = p.IDMenu
      LEFT JOIN Valoraciones v ON p.IDPlato = v.IDPlato
      GROUP BY r.IDRestaurante, r.NombreRestaurante, r.Direccion, r.Descripcion, 
               r.ImagenURL, r.IDHostelero, m.IDMenu, m.Fecha, m.Precio, m.ImagenMenu
      ORDER BY AVG(CAST(v.Puntuacion AS FLOAT)) DESC`,
      [{ name: "today", type: (await import("@/lib/db")).sql.Date, value: today }]
    )

    return NextResponse.json({ restaurantes })
  } catch (error: unknown) {
    console.error("Error fetching restaurantes:", error)
    return NextResponse.json(
      { error: "Error al obtener restaurantes" },
      { status: 500 }
    )
  }
}
