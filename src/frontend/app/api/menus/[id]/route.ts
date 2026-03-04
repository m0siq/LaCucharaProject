import { NextResponse } from "next/server"
import { query, sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const menus = await query(
      "SELECT * FROM Menus WHERE IDMenu = @id",
      [{ name: "id", type: sql.Int, value: parseInt(id) }]
    )

    if (menus.length === 0) {
      return NextResponse.json({ error: "Menu no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ menu: menus[0] })
  } catch (error: unknown) {
    console.error("Error fetching menu:", error)
    return NextResponse.json(
      { error: "Error al obtener menu" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hostelero")
    const { id } = await params
    const menuId = parseInt(id)

    // Delete related data first (valoraciones -> platos -> menu)
    await query(
      `DELETE v FROM Valoraciones v 
       JOIN Platos p ON v.IDPlato = p.IDPlato 
       WHERE p.IDMenu = @id`,
      [{ name: "id", type: sql.Int, value: menuId }]
    )
    await query("DELETE FROM Platos WHERE IDMenu = @id", [
      { name: "id", type: sql.Int, value: menuId },
    ])
    await query("DELETE FROM Menus WHERE IDMenu = @id", [
      { name: "id", type: sql.Int, value: menuId },
    ])

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("Error deleting menu:", error)
    return NextResponse.json(
      { error: "Error al eliminar menu" },
      { status: 500 }
    )
  }
}
