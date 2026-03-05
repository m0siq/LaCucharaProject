import { NextResponse } from "next/server"
import { createSession } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function POST(request: Request) {
    const body = await request.json()
    console.log("Body recibido:", body)  // ← ve a la terminal de Next.js

    const { username, password, rol } = body

    const res = await fetch(`${API_URL}/usuarios/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            NombreUsuario: username,
            Contrasena:    password,
            Rol:           rol,
        }),
    })

    const data = await res.json()
    console.log("Respuesta FastAPI:", res.status, data)  // ← ve a la terminal de Next.js

    if (!res.ok) {
        return NextResponse.json({ error: data.detail || "Credenciales incorrectas" }, { status: 401 })
    }

    const user = data
    await createSession(user)
    return NextResponse.json({ user })
}