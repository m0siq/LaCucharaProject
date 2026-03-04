import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { UtensilsCrossed, Star, Clock, MapPin } from "lucide-react"

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-food.jpg"
            alt="Mesa con platos del menu del dia"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-foreground/60" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-10 w-10 text-primary-foreground" />
            <h1 className="font-serif text-5xl text-primary-foreground md:text-7xl">
              La Cuchara
            </h1>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-primary-foreground/90 md:text-xl">
            Descubre los mejores menus del dia en el distrito empresarial de
            Azca, Madrid. Valora platos y encuentra tu restaurante favorito.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-w-[180px]">
              <Link href="/login">Iniciar Sesion</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-w-[180px] border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            >
              <Link href="/registro">Crear Cuenta</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-card px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center font-serif text-3xl text-card-foreground md:text-4xl">
            Tu hora del almuerzo, simplificada
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Clock className="h-8 w-8 text-primary" />}
              title="Menus actualizados"
              description="Los hosteleros publican sus menus del dia cada mañana. Siempre sabras que se ofrece hoy."
            />
            <FeatureCard
              icon={<Star className="h-8 w-8 text-primary" />}
              title="Valoraciones reales"
              description="Puntua cada plato del 1 al 5 y lee los comentarios de otros comensales del distrito."
            />
            <FeatureCard
              icon={<MapPin className="h-8 w-8 text-primary" />}
              title="Zona Azca"
              description="Todos los restaurantes estan en el corazon empresarial de Madrid. A pocos pasos de tu oficina."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary px-4 py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <h2 className="font-serif text-3xl text-primary-foreground md:text-4xl">
            Empieza hoy mismo
          </h2>
          <p className="text-lg leading-relaxed text-primary-foreground/80">
            Ya seas hostelero y quieras dar a conocer tu menu, o trabajador
            buscando donde comer, La Cuchara es para ti.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="min-w-[200px]"
          >
            <Link href="/registro">Registrate gratis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground px-4 py-8 text-center text-sm text-background/60">
        <p>La Cuchara - Menus del dia en Azca, Madrid</p>
      </footer>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border/50 bg-background p-8 text-center shadow-sm">
      {icon}
      <h3 className="font-serif text-xl text-card-foreground">{title}</h3>
      <p className="leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}
