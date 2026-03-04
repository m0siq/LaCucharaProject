import { RegistroForm } from "@/components/registro-form"
import { UtensilsCrossed } from "lucide-react"
import Link from "next/link"

export default function RegistroPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-foreground transition-colors hover:text-primary">
        <UtensilsCrossed className="h-7 w-7" />
        <span className="font-serif text-3xl">La Cuchara</span>
      </Link>
      <RegistroForm />
    </main>
  )
}
