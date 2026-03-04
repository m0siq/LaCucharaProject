import { NextResponse } from "next/server"
import { query, sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hostelero")
    const { id } = await params
    const { nombre, tipo, descripcion } = await request.json()

    await query(
      `UPDATE Platos SET 
        Nombre = COALESCE(@nombre, Nombre),
        Tipo = COALESCE(@tipo, Tipo),
        Descripcion = @descripcion
       WHERE IDPlato = @id`,
      [
        { name: "id", type: sql.Int, value: parseInt(id) },
        { name: "nombre", type: sql.NVarChar, value: nombre || null },
        { name: "tipo", type: sql.NVarChar, value: tipo || null },
        { name: "descripcion", type: sql.NVarChar, value: descripcion?.substring(0, 150) || null },
      ]
    )

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("Error updating plato:", error)
    return NextResponse.json(
      { error: "Error al actualizar plato" },
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
    const platoId = parseInt(id)

    await query("DELETE FROM Valoraciones WHERE IDPlato = @id", [
      { name: "id", type: sql.Int, value: platoId },
    ])
    await query("DELETE FROM Platos WHERE IDPlato = @id", [
      { name: "id", type: sql.Int, value: platoId },
    ])

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("Error deleting plato:", error)
    return NextResponse.json(
      { error: "Error al eliminar plato" },
      { status: 500 }
    )
  }
}
