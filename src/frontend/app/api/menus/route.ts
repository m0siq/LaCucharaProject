import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function GET(request: Request) {
  try {
    const user = await requireRole("hostelero")

    const res = await fetch(`${API_URL}/menus/?id_usuario=${user.IDUsuario}`)
    if (!res.ok) {
      return NextResponse.json({ error: "Error al obtener menus" }, { status: res.status })
    }

    const menus = await res.json()
    return NextResponse.json({ menus })

  } catch (error: unknown) {
    console.error("Error fetching menus:", error)
    return NextResponse.json({ error: "Error al obtener menus" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("hostelero")

    // 1. Crear el menú sin imagen
    const { fecha } = await request.json().catch(() => ({}))

    const resMenu = await fetch(`${API_URL}/menus/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        IDUsuario: user.IDUsuario,
        Fecha: fecha || new Date().toISOString().split("T")[0],
      }),
    })

    if (!resMenu.ok) {
      return NextResponse.json({ error: "Error al crear menu" }, { status: resMenu.status })
    }

    const menu = await resMenu.json()
    return NextResponse.json({ menuId: menu.IDMenu }, { status: 201 })

  } catch (error: unknown) {
    console.error("Error creating menu:", error)
    return NextResponse.json({ error: "Error al crear menu" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireRole("hostelero")

    // Recibe multipart/form-data con imagen + menuId
    const formData = await request.formData()
    const menuId   = formData.get("menuId") as string
    const imagen   = formData.get("imagen") as File | null

    if (!menuId) {
      return NextResponse.json({ error: "menuId es obligatorio" }, { status: 400 })
    }

    if (!imagen) {
      return NextResponse.json({ error: "imagen es obligatoria" }, { status: 400 })
    }

    // Reenvía la imagen a FastAPI como multipart
    const fd = new FormData()
    fd.append("imagen", imagen)

    const resImagen = await fetch(`${API_URL}/menus/${menuId}/imagen`, {
      method: "POST",
      body: fd,
    })

    if (!resImagen.ok) {
      return NextResponse.json({ error: "Error al subir imagen" }, { status: resImagen.status })
    }

    return NextResponse.json({ ok: true, menuId })

  } catch (error: unknown) {
    console.error("Error uploading imagen:", error)
    return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 })
  }
}