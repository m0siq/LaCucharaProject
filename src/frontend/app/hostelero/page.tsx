"use client"

import Link from "next/link"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, BookOpen, MessageSquare, Store } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function HosteleroDashboard() {
  const { data, isLoading } = useSWR("/api/hostelero/restaurante", fetcher)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  const restaurante = data?.restaurante

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Panel de Control</h1>
        {restaurante && (
          <p className="mt-1 text-muted-foreground">
            {restaurante.NombreRestaurante}
            {restaurante.Direccion && ` - ${restaurante.Direccion}`}
          </p>
        )}
      </div>

      {!restaurante ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Store className="h-12 w-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              No se encontro tu restaurante. Asegurate de que la base de datos
              esta configurada correctamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Restaurante"
            value={restaurante.NombreRestaurante}
            icon={<Store className="h-5 w-5 text-primary" />}
          />
          <StatCard
            title="Menus Publicados"
            value={String(restaurante.TotalMenus || 0)}
            icon={<BookOpen className="h-5 w-5 text-primary" />}
          />
          <StatCard
            title="Valoracion Media"
            value={
              restaurante.PromedioValoracion
                ? `${Number(restaurante.PromedioValoracion).toFixed(1)} / 5`
                : "Sin valoraciones"
            }
            icon={<Star className="h-5 w-5 text-primary" />}
            href="/hostelero/valoraciones"
          />
          <StatCard
            title="Total Valoraciones"
            value={String(restaurante.TotalValoraciones || 0)}
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
            href="/hostelero/valoraciones"
          />
        </div>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Como empezar</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                1
              </span>
              Ve a &quot;Menu del Dia&quot; para subir la imagen de tu menu diario con la fecha y el precio.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                2
              </span>
              En &quot;Platos&quot;, anade los platos del menu manualmente o usa OCR para extraerlos de la imagen.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                3
              </span>
              Los clientes podran ver tu menu y valorar cada plato. Revisa las puntuaciones en tu panel.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  href,
}: {
  title: string
  value: string
  icon: React.ReactNode
  href?: string
}) {
  const inner = (
    <Card className={`border-border/50 ${href ? "transition-colors hover:border-primary/40 hover:bg-muted/30" : ""}`}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="truncate font-serif text-lg text-card-foreground">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{inner}</Link>
  }
  return inner
}
