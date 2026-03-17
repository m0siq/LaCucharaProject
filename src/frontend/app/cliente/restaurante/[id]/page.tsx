"use client"

import { useState, use } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StarRating } from "@/components/cliente/star-rating"
import { RatingModal } from "@/components/cliente/rating-modal"
import { TIPOS_PLATO } from "@/lib/types"
import {
  ArrowLeft,
  UtensilsCrossed,
  Star,
  ZoomIn,
  X,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function RestauranteDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data, isLoading, mutate } = useSWR(`/api/restaurantes/${id}`, fetcher)

  const [ratingPlato, setRatingPlato] = useState<{
    id: number
    nombre: string
  } | null>(null)
  
  // Estado para el lightbox (imagen grande)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="mb-4 h-40" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!data?.restaurante) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <UtensilsCrossed className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg text-foreground">Restaurante no encontrado</p>
          <Button asChild variant="outline">
            <Link href="/cliente">Volver al listado</Link>
          </Button>
        </div>
      </div>
    )
  }

  const { restaurante, menu, platos, menus } = data

  // Log de platos recibidos
  console.log("🍽️ [CLIENTE] Platos recibidos:", {
    cantidad: platos?.length,
    platos: platos?.map((p: any) => ({
      IDPlato: p.IDPlato,
      nombre: p.NombrePlato,
      tipo: p.Tipo,
      descripcion: p.Descripcion,
    })),
    platosCrudos: platos,
  })

  // Agrupar platos por tipo
  const groupedPlatos: Record<string, typeof platos> = {}
  if (platos?.length) {
    for (const plato of platos) {
      const tipo = plato.Tipo || "otro"
      if (!groupedPlatos[tipo]) groupedPlatos[tipo] = []
      groupedPlatos[tipo].push(plato)
    }
  }

  const tipoOrder = ["primero", "segundo", "postre", "bebida", "otro"]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Volver */}
      <Link
        href="/cliente"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al listado
      </Link>

      {/* Cabecera restaurante */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground md:text-4xl">
          {restaurante.NombreRestaurante}
        </h1>
      </div>

      {/* Tabs */}
      <div>
          {!menu ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  Este restaurante no ha publicado menu para hoy
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Imagen del menu de hoy */}
              {menu && menu.has_imagen ? (
                <Card className="overflow-hidden border-border/50">
                  <div className="relative group cursor-pointer">
                    <img
                      src={`/api/menus/${menu.IDMenu}/imagen`}
                      alt={`Menu del dia de ${restaurante.NombreRestaurante}`}
                      className="h-48 w-full object-cover"
                      onClick={() => {
                        setLightboxUrl(`/api/menus/${menu.IDMenu}/imagen`)
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors pointer-events-none">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Card>
              ) : null}

              {/* Precio del menu */}
              {menu?.Precio && (
                <div className="rounded-lg border border-border/50 bg-card/50 px-6 py-4">
                  <p className="text-sm text-muted-foreground">Precio del menú:</p>
                  <p className="text-2xl font-bold text-foreground">{menu.Precio.toFixed(2)}€</p>
                </div>
              )}

              {/* Platos del menu de hoy */}
              {!platos?.length ? (
                <Card className="border-border/50">
                  <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                    <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground">
                      No hay platos detallados para el menu de hoy
                    </p>
                  </CardContent>
                </Card>
              ) : (
                tipoOrder
                  .filter((tipo) => groupedPlatos[tipo])
                  .map((tipo) => (
                    <Card key={tipo} className="border-border/50">
                      <CardHeader>
                        <CardTitle className="font-serif text-xl">
                          {TIPOS_PLATO.find((t) => t.value === tipo)?.label || tipo}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        {groupedPlatos[tipo].map(
                          (plato: {
                            IDPlato: number
                            Nombre: string
                            Descripcion: string | null
                            PromedioValoracion: number | null
                            TotalValoraciones: number
                          }) => (
                            <div
                              key={plato.IDPlato}
                              className="flex items-center justify-between gap-4 rounded-lg border border-border/30 bg-muted/20 px-4 py-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground">
                                  {plato.Nombre}
                                </p>
                                {plato.Descripcion && (
                                  <p className="mt-0.5 text-sm text-muted-foreground">
                                    {plato.Descripcion}
                                  </p>
                                )}
                                <div className="mt-2 flex items-center gap-3">
                                  <StarRating
                                    value={Math.round(plato.PromedioValoracion || 0)}
                                    readonly
                                    size="sm"
                                  />
                                  {plato.PromedioValoracion ? (
                                    <span className="text-xs text-muted-foreground">
                                      {Number(plato.PromedioValoracion).toFixed(1)}{" "}
                                      ({plato.TotalValoraciones})
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      Sin valoraciones
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setRatingPlato({
                                    id: plato.IDPlato,
                                    nombre: plato.Nombre,
                                  })
                                }
                                className="shrink-0"
                              >
                                <Star className="mr-1.5 h-3.5 w-3.5" />
                                Valorar
                              </Button>
                            </div>
                          )
                        )}
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          )}
        </div>

      {/* Modal valoracion */}
      {ratingPlato && (
        <RatingModal
          open={!!ratingPlato}
          onOpenChange={(open) => !open && setRatingPlato(null)}
          platoId={ratingPlato.id}
          platoNombre={ratingPlato.nombre}
          onSuccess={() => mutate()}
        />
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-4xl">
            <img src={lightboxUrl} alt="Menu ampliado" className="max-h-[90vh] w-full object-contain" />
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute right-4 top-4 rounded-lg bg-black/50 p-2 text-white transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}