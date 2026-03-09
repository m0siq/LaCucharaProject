"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TIPOS_PLATO } from "@/lib/types"
import { MessageSquare, Star } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ValoracionDetalle {
  IDValoracion: number
  Puntuacion: number | null
  Comentario: string | null
  Fecha: string | null
  IDPlato: number
  NombrePlato: string
  Tipo: string | null
}

function StarDisplay({ value }: { value: number | null }) {
  const filled = Math.round(value ?? 0)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < filled
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
      {value !== null && (
        <span className="ml-1.5 text-sm text-muted-foreground">
          {Number(value).toFixed(1)}
        </span>
      )}
    </div>
  )
}

function formatFecha(fecha: string | null) {
  if (!fecha) return "-"
  return new Date(fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function ValoracionesPage() {
  const { data, isLoading } = useSWR("/api/hostelero/valoraciones", fetcher)

  const valoraciones: ValoracionDetalle[] = data?.valoraciones ?? []

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl text-foreground">Reseñas de Clientes</h1>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : valoraciones.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-foreground">Sin reseñas todavia</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Las reseñas de tus clientes aparecerán aqui.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              {valoraciones.length} reseña{valoraciones.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {valoraciones.map((v) => (
              <div
                key={v.IDValoracion}
                className="flex flex-col gap-2 rounded-lg border border-border/40 bg-muted/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">
                      {v.NombrePlato}
                    </span>
                    {v.Tipo && (
                      <span className="inline-flex w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {TIPOS_PLATO.find((t) => t.value === v.Tipo)?.label ?? v.Tipo}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StarDisplay value={v.Puntuacion} />
                    <span className="text-xs text-muted-foreground">
                      {formatFecha(v.Fecha)}
                    </span>
                  </div>
                </div>
                {v.Comentario && (
                  <p className="text-sm text-muted-foreground">{v.Comentario}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
