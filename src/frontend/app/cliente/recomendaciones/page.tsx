"use client"

import useSWR from "swr"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StarRating } from "@/components/cliente/star-rating"
import { Sparkles, UtensilsCrossed, ArrowRight, Info } from "lucide-react"
import { TIPOS_PLATO } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Tipo provisional hasta que el backend ML esté listo
interface PlatoRecomendado {
    IDPlato: number
    Nombre: string
    Tipo: "primero" | "segundo" | "postre" | "bebida" | "otro"
    Descripcion: string | null
    PromedioValoracion: number | null
    TotalValoraciones: number
    NombreRestaurante: string
    IDRestaurante: number
    Precio: number | null
}

export default function RecomendacionesPage() {
    // TODO: sustituir por /api/recomendaciones cuando el backend ML esté listo
    const { data, isLoading } = useSWR<{ recomendaciones: PlatoRecomendado[] }>(
        "/api/recomendaciones",
        fetcher,
        {
            // Mientras no existe el endpoint, no reintentar en caso de error
            shouldRetryOnError: false,
        }
    )

    const mlPendiente = !data || (data as { error?: string }).error

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                    <h1 className="font-serif text-3xl text-foreground md:text-4xl">
                        Recomendaciones para ti
                    </h1>
                </div>
                <p className="text-muted-foreground">
                    Platos sugeridos en base a tus valoraciones anteriores
                </p>
            </div>

            {/* Aviso ML pendiente */}
            {mlPendiente && !isLoading && (
                <Card className="mb-8 border-primary/20 bg-primary/5">
                    <CardContent className="flex items-start gap-4 p-6">
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div>
                            <p className="font-medium text-foreground">
                                Motor de recomendaciones en desarrollo
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                El sistema de recomendaciones personalizadas estará disponible
                                próximamente. Por ahora, valora platos en los restaurantes y
                                cuando el modelo ML esté integrado recibirás sugerencias
                                basadas en tus gustos.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Estado de carga */}
            {isLoading && (
                <div className="flex flex-col gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>
            )}

            {/* Lista de recomendaciones (cuando el backend ML esté activo) */}
            {!isLoading && (data?.recomendaciones?.length ?? 0) > 0 && (
                <div className="flex flex-col gap-4">
                    {(data?.recomendaciones ?? []).map((plato) => (
                        <Link
                            key={plato.IDPlato}
                            href={`/cliente/restaurante/${plato.IDRestaurante}`}
                        >
                            <Card className="group border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
                                <CardContent className="flex items-center justify-between gap-4 p-5">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-serif text-lg text-card-foreground group-hover:text-primary">
                                                {plato.Nombre}
                                            </h2>
                                            <Badge
                                                variant="secondary"
                                                className="shrink-0 text-xs"
                                            >
                                                {TIPOS_PLATO.find((t) => t.value === plato.Tipo)
                                                    ?.label || plato.Tipo}
                                            </Badge>
                                        </div>
                                        {plato.Descripcion && (
                                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                                {plato.Descripcion}
                                            </p>
                                        )}
                                        <div className="mt-2 flex flex-wrap items-center gap-4">
                                            <div className="flex items-center gap-2">
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
                                            <span className="text-xs text-muted-foreground">
                                                <UtensilsCrossed className="mr-1 inline h-3 w-3" />
                                                {plato.NombreRestaurante}
                                                {plato.Precio && (
                                                    <> · {Number(plato.Precio).toFixed(2)} €</>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Sin recomendaciones todavía */}
            {!isLoading && (data?.recomendaciones?.length ?? -1) === 0 && (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                    <Sparkles className="h-14 w-14 text-muted-foreground/30" />
                    <div>
                        <p className="text-lg font-medium text-foreground">
                            Aún no tenemos recomendaciones para ti
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Valora más platos para que el sistema pueda sugerirte opciones
                            personalizadas.
                        </p>
                    </div>
                    <Link
                        href="/cliente"
                        className="mt-2 text-sm font-medium text-primary hover:underline"
                    >
                        Ver restaurantes →
                    </Link>
                </div>
            )}
        </div>
    )
}
