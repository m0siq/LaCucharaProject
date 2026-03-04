import { NextResponse } from "next/server"
import { query, sql } from "@/lib/db"
import { requireRole, getSession } from "@/lib/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const valoraciones = await query(
      `SELECT v.*, u.NombreUsuario
       FROM Valoraciones v
       JOIN Usuarios u ON v.IDCliente = u.IDUsuario
       WHERE v.IDPlato = @platoId
       ORDER BY v.FechaValoracion DESC`,
      [{ name: "platoId", type: sql.Int, value: parseInt(id) }]
    )

    return NextResponse.json({ valoraciones })
  } catch (error: unknown) {
    console.error("Error fetching valoraciones:", error)
    return NextResponse.json(
      { error: "Error al obtener valoraciones" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("cliente")
    const { id } = await params
    const { puntuacion, comentario } = await request.json()

    if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
      return NextResponse.json(
        { error: "La puntuacion debe estar entre 1 y 5" },
        { status: 400 }
      )
    }

    // Check if user already rated this dish
    const existing = await query(
      "SELECT IDValoracion FROM Valoraciones WHERE IDPlato = @platoId AND IDCliente = @clienteId",
      [
        { name: "platoId", type: sql.Int, value: parseInt(id) },
        { name: "clienteId", type: sql.Int, value: user.IDUsuario },
      ]
    )

    if (existing.length > 0) {
      // Update existing rating
      await query(
        `UPDATE Valoraciones SET Puntuacion = @puntuacion, Comentario = @comentario, FechaValoracion = GETDATE()
         WHERE IDPlato = @platoId AND IDCliente = @clienteId`,
        [
          { name: "platoId", type: sql.Int, value: parseInt(id) },
          { name: "clienteId", type: sql.Int, value: user.IDUsuario },
          { name: "puntuacion", type: sql.Int, value: puntuacion },
          { name: "comentario", type: sql.NVarChar, value: comentario?.substring(0, 150) || null },
        ]
      )
    } else {
      await query(
        `INSERT INTO Valoraciones (IDPlato, IDCliente, Puntuacion, Comentario)
         VALUES (@platoId, @clienteId, @puntuacion, @comentario)`,
        [
          { name: "platoId", type: sql.Int, value: parseInt(id) },
          { name: "clienteId", type: sql.Int, value: user.IDUsuario },
          { name: "puntuacion", type: sql.Int, value: puntuacion },
          { name: "comentario", type: sql.NVarChar, value: comentario?.substring(0, 150) || null },
        ]
      )
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating valoracion:", error)
    return NextResponse.json(
      { error: "Error al guardar valoracion" },
      { status: 500 }
    )
  }
}
