import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { query, sql } from "@/lib/db"
import { createSession } from "@/lib/auth"
import type { SessionUser } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      )
    }

    const users = await query<{
      IDUsuario: number
      NombreUsuario: string
      "Contraseña": string
      Rol: "cliente" | "hostelero"
    }>(
      "SELECT IDUsuario, NombreUsuario, Contraseña, Rol FROM Usuarios WHERE NombreUsuario = @username",
      [{ name: "username", type: sql.NVarChar, value: username }]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      )
    }

    const user = users[0]
    const validPassword = await bcrypt.compare(password, user["Contraseña"])

    if (!validPassword) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      )
    }

    const sessionUser: SessionUser = {
      IDUsuario: user.IDUsuario,
      NombreUsuario: user.NombreUsuario,
      Rol: user.Rol,
    }

    await createSession(sessionUser)

    return NextResponse.json({ user: sessionUser })
  } catch (error: unknown) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Error al iniciar sesion" },
      { status: 500 }
    )
  }
}
