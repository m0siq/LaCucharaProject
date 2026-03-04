import { NextResponse } from "next/server"
import { query, sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const platos = await query(
      `SELECT p.*,
        AVG(CAST(v.Puntuacion AS FLOAT)) AS PromedioValoracion,
        COUNT(v.IDValoracion) AS TotalValoraciones
       FROM Platos p
       LEFT JOIN Valoraciones v ON p.IDPlato = v.IDPlato
       WHERE p.IDMenu = @menuId
       GROUP BY p.IDPlato, p.IDMenu, p.Nombre, p.Tipo, p.Descripcion
       ORDER BY 
         CASE p.Tipo 
           WHEN 'primero' THEN 1 
           WHEN 'segundo' THEN 2 
           WHEN 'postre' THEN 3 
           WHEN 'bebida' THEN 4 
           ELSE 5 
         END`,
      [{ name: "menuId", type: sql.Int, value: parseInt(id) }]
    )

    return NextResponse.json({ platos })
  } catch (error: unknown) {
    console.error("Error fetching platos:", error)
    return NextResponse.json(
      { error: "Error al obtener platos" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hostelero")
    const { id } = await params
    const { nombre, tipo, descripcion } = await request.json()

    if (!nombre || !tipo) {
      return NextResponse.json(
        { error: "Nombre y tipo son obligatorios" },
        { status: 400 }
      )
    }

    const result = await query<{ IDPlato: number }>(
      `INSERT INTO Platos (IDMenu, Nombre, Tipo, Descripcion)
       OUTPUT INSERTED.IDPlato
       VALUES (@menuId, @nombre, @tipo, @descripcion)`,
      [
        { name: "menuId", type: sql.Int, value: parseInt(id) },
        { name: "nombre", type: sql.NVarChar, value: nombre },
        { name: "tipo", type: sql.NVarChar, value: tipo },
        { name: "descripcion", type: sql.NVarChar, value: descripcion?.substring(0, 150) || null },
      ]
    )

    return NextResponse.json({ platoId: result[0].IDPlato }, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating plato:", error)
    return NextResponse.json(
      { error: "Error al crear plato" },
      { status: 500 }
    )
  }
}
