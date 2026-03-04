import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { query, sql } from "@/lib/db"
import { createSession } from "@/lib/auth"
import type { SessionUser } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const { username, password, rol, nombreRestaurante, direccion, descripcion } =
      await request.json()

    if (!username || !password || !rol) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      )
    }

    if (!["cliente", "hostelero"].includes(rol)) {
      return NextResponse.json(
        { error: "Rol invalido" },
        { status: 400 }
      )
    }

    if (rol === "hostelero" && !nombreRestaurante) {
      return NextResponse.json(
        { error: "El nombre del restaurante es obligatorio para hosteleros" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existing = await query(
      "SELECT IDUsuario FROM Usuarios WHERE NombreUsuario = @username",
      [{ name: "username", type: sql.NVarChar, value: username }]
    )

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "El nombre de usuario ya existe" },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user
    const result = await query<{ IDUsuario: number }>(
      `INSERT INTO Usuarios (NombreUsuario, Contraseña, Rol) 
       OUTPUT INSERTED.IDUsuario 
       VALUES (@username, @password, @rol)`,
      [
        { name: "username", type: sql.NVarChar, value: username },
        { name: "password", type: sql.NVarChar, value: hashedPassword },
        { name: "rol", type: sql.NVarChar, value: rol },
      ]
    )

    const userId = result[0].IDUsuario

    // If hostelero, create restaurant
    if (rol === "hostelero") {
      await query(
        `INSERT INTO Restaurantes (IDHostelero, NombreRestaurante, Direccion, Descripcion) 
         VALUES (@userId, @nombre, @direccion, @descripcion)`,
        [
          { name: "userId", type: sql.Int, value: userId },
          { name: "nombre", type: sql.NVarChar, value: nombreRestaurante },
          { name: "direccion", type: sql.NVarChar, value: direccion || null },
          { name: "descripcion", type: sql.NVarChar, value: descripcion || null },
        ]
      )
    }

    const sessionUser: SessionUser = {
      IDUsuario: userId,
      NombreUsuario: username,
      Rol: rol,
    }

    await createSession(sessionUser)

    return NextResponse.json({ user: sessionUser }, { status: 201 })
  } catch (error: unknown) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Error al registrar usuario" },
      { status: 500 }
    )
  }
}
