/**
 * lib/ml.ts
 * ──────────
 * Helper de cliente para llamar a los endpoints ML del frontend.
 * Usado en componentes React ("use client").
 *
 * Para Server Components / API Routes usar fetch() directamente.
 */

export interface ClasificacionPlato {
  categoria: "Pescado" | "Carne" | "Vegetariano" | "Pasta" | "Otro"
  confianza: number
  probabilidades: Record<string, number>
  keywords: string[]
}

export interface PlatoRecomendado {
  IDPlato: number
  NombrePlato: string
  Tipo: string | null
  Descripcion: string | null
  score: number
  motivo: "colaborativo" | "popular"
}

/** Icono emoji por categoría dietética */
export const CATEGORIA_ICONO: Record<string, string> = {
  Pescado:     "🐟",
  Carne:       "🥩",
  Vegetariano: "🥗",
  Pasta:       "🍝",
  Otro:        "🍽️",
}

/** Color de badge por categoría */
export const CATEGORIA_COLOR: Record<string, string> = {
  Pescado:     "bg-blue-100 text-blue-800",
  Carne:       "bg-red-100 text-red-800",
  Vegetariano: "bg-green-100 text-green-800",
  Pasta:       "bg-yellow-100 text-yellow-800",
  Otro:        "bg-gray-100 text-gray-600",
}

/**
 * Clasifica un plato llamando al API route Next.js.
 * Usar en componentes client-side.
 */
export async function clasificarPlato(
  nombre: string,
  descripcion?: string | null,
  tipo?: string | null
): Promise<ClasificacionPlato> {
  const res = await fetch("/api/ml/clasificar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre_plato: nombre, descripcion, tipo }),
  })

  if (!res.ok) {
    return { categoria: "Otro", confianza: 0, probabilidades: {}, keywords: [] }
  }

  return res.json()
}

/**
 * Extrae palabras clave de un texto.
 * Usar en componentes client-side para generar filtros dinámicos.
 */
export async function extraerKeywords(texto: string, n = 5): Promise<string[]> {
  const res = await fetch("/api/ml/keywords", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto, n }),
  })

  if (!res.ok) return []
  const data = await res.json()
  return data.keywords ?? []
}
