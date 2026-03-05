import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const res = await fetch(`${API_URL}/menus/${id}/imagen`)

        if (!res.ok) {
            return NextResponse.json({ error: "Sin imagen" }, { status: 404 })
        }

        const buffer = await res.arrayBuffer()
        const contentType = res.headers.get("content-type") || "image/jpeg"

        return new Response(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600",
            },
        })
    } catch (error: unknown) {
        console.error("Error fetching menu image:", error)
        return NextResponse.json({ error: "Error al obtener imagen" }, { status: 500 })
    }
}
