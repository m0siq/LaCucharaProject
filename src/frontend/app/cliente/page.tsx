"use client"

import useSWR from "swr"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/cliente/star-rating"
import { MapPin, UtensilsCrossed, Euro } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ClienteFeed() {
  const { data, isLoading } = useSWR("/api/restaurantes", fetcher)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground md:text-4xl">
          Menus del Dia
        </h1>
        <p className="mt-2 text-muted-foreground">
          Descubre los restaurantes de Azca ordenados por valoracion
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : !data?.restaurantes?.length ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <UtensilsCrossed className="h-16 w-16 text-muted-foreground/30" />
          <div>
            <p className="text-lg font-medium text-foreground">
              No hay restaurantes todavia
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Los hosteleros aun no han publicado menus para hoy.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.restaurantes.map(
            (r: {
              IDRestaurante: number
              NombreRestaurante: string
              Direccion: string | null
              Descripcion: string | null
              IDMenu: number | null
              Precio: number | null
              PromedioValoracion: number | null
              TotalValoraciones: number
            }) => (
              <Link
                key={r.IDRestaurante}
                href={`/cliente/restaurante/${r.IDRestaurante}`}
              >
                <Card className="group h-full border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-4 p-6">
                    {/* Restaurant Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-serif text-xl text-card-foreground group-hover:text-primary">
                          {r.NombreRestaurante}
                        </h2>
                        {r.Direccion && (
                          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{r.Direccion}</span>
                          </div>
                        )}
                      </div>
                      {r.Precio && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-sm font-semibold"
                        >
                          <Euro className="mr-0.5 h-3.5 w-3.5" />
                          {Number(r.Precio).toFixed(2)}
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {r.Descripcion && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {r.Descripcion}
                      </p>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Rating & Status */}
                    <div className="flex items-center justify-between border-t border-border/50 pt-4">
                      <div className="flex items-center gap-2">
                        <StarRating
                          value={Math.round(r.PromedioValoracion || 0)}
                          readonly
                          size="sm"
                        />
                        {r.PromedioValoracion ? (
                          <span className="text-sm font-medium text-foreground">
                            {Number(r.PromedioValoracion).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sin valoraciones
                          </span>
                        )}
                      </div>
                      {r.TotalValoraciones > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {r.TotalValoraciones} valoracion
                          {r.TotalValoraciones !== 1 ? "es" : ""}
                        </span>
                      )}
                    </div>

                    {/* Menu status */}
                    {!r.IDMenu && (
                      <p className="text-xs text-muted-foreground/70">
                        Sin menu publicado hoy
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  )
}
