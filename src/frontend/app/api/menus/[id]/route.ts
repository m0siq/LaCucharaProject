import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const res = await fetch(`${API_URL}/menus/${id}/imagen`)
  if (!res.ok) return NextResponse.json({ error: "Sin imagen" }, { status: 404 })

  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    headers: { "Content-Type": "image/jpeg" },
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hostelero")
    const { id } = await params

    const res = await fetch(`${API_URL}/menus/${id}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Error al eliminar menu" }, { status: res.status })
    }

    return NextResponse.json({ ok: true })

  } catch (error: unknown) {
    console.error("Error deleting menu:", error)
    return NextResponse.json({ error: "Error al eliminar menu" }, { status: 500 })
  }
}