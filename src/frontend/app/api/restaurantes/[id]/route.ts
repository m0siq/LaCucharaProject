import { NextResponse } from "next/server"
import { query, sql } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const restauranteId = parseInt(id, 10)

    const restaurantes = await query(
      `SELECT r.*, u.NombreUsuario AS NombreHostelero
       FROM Restaurantes r 
       JOIN Usuarios u ON r.IDHostelero = u.IDUsuario
       WHERE r.IDRestaurante = @id`,
      [{ name: "id", type: sql.Int, value: restauranteId }]
    )

    if (restaurantes.length === 0) {
      return NextResponse.json(
        { error: "Restaurante no encontrado" },
        { status: 404 }
      )
    }

    const today = new Date().toISOString().split("T")[0]

    // Get today's menu with dishes and their ratings
    const menus = await query(
      `SELECT m.* FROM Menus m 
       WHERE m.IDRestaurante = @id AND m.Fecha = @today`,
      [
        { name: "id", type: sql.Int, value: restauranteId },
        { name: "today", type: sql.Date, value: today },
      ]
    )

    let platos: unknown[] = []
    if (menus.length > 0) {
      const menuId = (menus[0] as { IDMenu: number }).IDMenu
      platos = await query(
        `SELECT p.*,
          AVG(CAST(v.Puntuacion AS FLOAT)) AS PromedioValoracion,
          COUNT(v.IDValoracion) AS TotalValoraciones
         FROM Platos p
         LEFT JOIN Valoraciones v ON p.IDPlato = v.IDPlato
         WHERE p.IDMenu = @menuId
         GROUP BY p.IDPlato, p.IDMenu, p.Nombre, p.Tipo, p.Descripcion`,
        [{ name: "menuId", type: sql.Int, value: menuId }]
      )
    }

    return NextResponse.json({
      restaurante: restaurantes[0],
      menu: menus[0] || null,
      platos,
    })
  } catch (error: unknown) {
    console.error("Error fetching restaurante:", error)
    return NextResponse.json(
      { error: "Error al obtener restaurante" },
      { status: 500 }
    )
  }
}
