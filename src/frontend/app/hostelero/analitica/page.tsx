"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart2,
  Utensils,
  TrendingUp,
  Star,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PlatoScore {
  IDPlato: number
  NombrePlato: string
  Tipo: string | null
  weighted_score: number
  media_puntuacion: number
  n_valoraciones: number
  categoria: string
}

interface MenuSemanal {
  primeros: PlatoScore[]
  segundos: PlatoScore[]
}

interface DetallePlato {
  IDPlato: number
  NombrePlato: string
  weighted_score: number
  n_valoraciones: number
}

interface ExitoResult {
  porcentaje_exito: number
  score_medio: number
  detalle: DetallePlato[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

const CATEGORIA_COLORS: Record<string, string> = {
  Pescado:     "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Carne:       "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  Vegetariano: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Pasta:       "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  Otro:        "bg-muted text-muted-foreground",
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function scoreColor(pct: number) {
  if (pct >= 75) return "text-green-600 dark:text-green-400"
  if (pct >= 55) return "text-yellow-600 dark:text-yellow-400"
  return "text-red-600 dark:text-red-400"
}

function scoreIcon(pct: number) {
  if (pct >= 75) return <CheckCircle2 className="h-5 w-5 text-green-500" />
  if (pct >= 55) return <AlertCircle className="h-5 w-5 text-yellow-500" />
  return <AlertCircle className="h-5 w-5 text-red-500" />
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StarBar({ score }: { score: number }) {
  const pct = Math.round((score / 5) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs font-medium text-muted-foreground">
        {score.toFixed(2)}
      </span>
    </div>
  )
}

function PlatoCard({ plato, rank }: { plato: PlatoScore; rank: number }) {
  const catClass = CATEGORIA_COLORS[plato.categoria] ?? CATEGORIA_COLORS.Otro
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3 transition-shadow hover:shadow-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{plato.NombrePlato}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`text-xs ${catClass}`}>
            {plato.categoria}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 stroke-yellow-400" />
            {plato.media_puntuacion.toFixed(1)}
            &nbsp;·&nbsp;{plato.n_valoraciones} val.
          </span>
        </div>
        <div className="mt-2">
          <StarBar score={plato.weighted_score} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AnaliticaPage() {
  const {
    data: menuData,
    isLoading: menuLoading,
    error: menuError,
    mutate: reloadMenu,
  } = useSWR<MenuSemanal>(`${BACKEND}/ml/menu-semanal`, fetcher)

  // Predictor de éxito usando los IDs del menú semanal sugerido
  const [exitoData, setExitoData] = useState<ExitoResult | null>(null)
  const [loadingExito, setLoadingExito] = useState(false)

  async function handlePredecirExito() {
    if (!menuData) return
    const ids = [
      ...menuData.primeros.map((p) => p.IDPlato),
      ...menuData.segundos.map((p) => p.IDPlato),
    ]
    if (ids.length === 0) return

    setLoadingExito(true)
    try {
      const res = await fetch(`${BACKEND}/ml/exito`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_platos: ids }),
      })
      const json = await res.json()
      setExitoData(json)
    } catch {
      // silently ignore
    } finally {
      setLoadingExito(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-3xl text-foreground">
            <BarChart2 className="h-7 w-7 text-primary" />
            Analítica de Demanda
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Propuesta semanal generada por el motor ML · Weighted Score (media bayesiana + volumen)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { reloadMenu(); setExitoData(null) }}
          disabled={menuLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${menuLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {menuError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo conectar con el backend de ML. Asegúrate de que el servidor
          FastAPI está en marcha.
        </div>
      )}

      {/* Menú semanal — Primeros y Segundos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Primeros platos */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <Utensils className="h-5 w-5 text-primary" />
              Mejores Primeros Platos
            </CardTitle>
            <CardDescription>
              Top 5 · ordenados por Weighted Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            {menuLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : !menuData?.primeros?.length ? (
              <p className="text-sm text-muted-foreground">
                No hay primeros platos suficientes con valoraciones.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {menuData.primeros.map((p, i) => (
                  <PlatoCard key={p.IDPlato} plato={p} rank={i + 1} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Segundos platos */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <Utensils className="h-5 w-5 text-primary" />
              Mejores Segundos Platos
            </CardTitle>
            <CardDescription>
              Top 5 · ordenados por Weighted Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            {menuLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : !menuData?.segundos?.length ? (
              <p className="text-sm text-muted-foreground">
                No hay segundos platos suficientes con valoraciones.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {menuData.segundos.map((p, i) => (
                  <PlatoCard key={p.IDPlato} plato={p} rank={i + 1} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Predictor de éxito */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <TrendingUp className="h-5 w-5 text-primary" />
            Predictor de Éxito del Menú
          </CardTitle>
          <CardDescription>
            Calcula el porcentaje de éxito esperado del menú semanal sugerido
            basándose en los Weighted Scores históricos de cada plato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!menuData && !menuLoading ? (
            <p className="text-sm text-muted-foreground">
              Espera a que cargue el menú semanal.
            </p>
          ) : !exitoData ? (
            <Button onClick={handlePredecirExito} disabled={loadingExito || menuLoading}>
              {loadingExito ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Calcular predicción de éxito
                </>
              )}
            </Button>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Big number */}
              <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/30 p-6">
                {scoreIcon(exitoData.porcentaje_exito)}
                <div>
                  <p className="text-xs text-muted-foreground">Éxito estimado del menú</p>
                  <p
                    className={`text-5xl font-bold tabular-nums ${scoreColor(
                      exitoData.porcentaje_exito
                    )}`}
                  >
                    {exitoData.porcentaje_exito}
                    <span className="text-2xl">%</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Score medio: {exitoData.score_medio.toFixed(2)} / 5
                  </p>
                </div>
              </div>

              {/* Detalle por plato */}
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  Desglose por plato
                </p>
                <div className="flex flex-col gap-2">
                  {exitoData.detalle.map((d) => {
                    const pct = Math.round((d.weighted_score / 5) * 100)
                    return (
                      <div
                        key={d.IDPlato}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="w-40 shrink-0 truncate text-foreground">
                          {d.NombrePlato || `Plato #${d.IDPlato}`}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setExitoData(null)}
              >
                Recalcular
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
