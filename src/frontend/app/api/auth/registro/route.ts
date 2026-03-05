import { NextResponse } from "next/server"
import { createSession } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function POST(request: Request) {
    const { username, password, rol, nombreRestaurante } = await request.json()

    try {
        const endpoint = rol === "hostelero" ? "/hosteleros/" : "/clientes/"
        const body = rol === "hostelero"
            ? { NombreUsuario: username, Contrasena: password, NombreRestaurante: nombreRestaurante }
            : { NombreUsuario: username, Contrasena: password }

        const res = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })

        if (!res.ok) {
            const err = await res.json()
            return NextResponse.json({ error: err.detail || "Error al registrar" }, { status: res.status })
        }

        const creado = await res.json()
        const user = { ...creado, NombreUsuario: username, Rol: rol }

        await createSession(user)

        return NextResponse.json({ user })

    } catch (error) {
        return NextResponse.json({ error: "Error de conexion con el servidor" }, { status: 500 })
    }
}