import { NextResponse } from "next/server"
import { query, sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const user = await requireRole("hostelero")
    const { searchParams } = new URL(request.url)
    const restauranteId = searchParams.get("restauranteId")

    const menus = await query(
      `SELECT m.* FROM Menus m 
       JOIN Restaurantes r ON m.IDRestaurante = r.IDRestaurante
       WHERE r.IDHostelero = @userId ${restauranteId ? "AND m.IDRestaurante = @restId" : ""}
       ORDER BY m.Fecha DESC`,
      [
        { name: "userId", type: sql.Int, value: user.IDUsuario },
        ...(restauranteId
          ? [{ name: "restId", type: sql.Int, value: parseInt(restauranteId) }]
          : []),
      ]
    )

    return NextResponse.json({ menus })
  } catch (error: unknown) {
    console.error("Error fetching menus:", error)
    return NextResponse.json(
      { error: "Error al obtener menus" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("hostelero")
    const { restauranteId, fecha, precio, imagenMenu } = await request.json()

    if (!restauranteId || !fecha || precio === undefined) {
      return NextResponse.json(
        { error: "Restaurante, fecha y precio son obligatorios" },
        { status: 400 }
      )
    }

    const result = await query<{ IDMenu: number }>(
      `INSERT INTO Menus (IDRestaurante, Fecha, Precio, ImagenMenu)
       OUTPUT INSERTED.IDMenu
       VALUES (@restId, @fecha, @precio, @imagen)`,
      [
        { name: "restId", type: sql.Int, value: restauranteId },
        { name: "fecha", type: sql.Date, value: fecha },
        { name: "precio", type: sql.Decimal(6, 2), value: precio },
        { name: "imagen", type: sql.NVarChar(sql.MAX), value: imagenMenu || null },
      ]
    )

    return NextResponse.json({ menuId: result[0].IDMenu }, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating menu:", error)
    return NextResponse.json(
      { error: "Error al crear menu" },
      { status: 500 }
    )
  }
}
