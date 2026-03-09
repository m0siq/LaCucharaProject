"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import type { SessionUser } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  UtensilsCrossed,
  LayoutDashboard,
  BookOpen,
  ChefHat,
  MessageSquare,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { toast } from "sonner"

const NAV_ITEMS = [
  { href: "/hostelero",             label: "Panel",        icon: LayoutDashboard },
  { href: "/hostelero/menu",        label: "Menu del Dia", icon: BookOpen        },
  { href: "/hostelero/platos",      label: "Platos",       icon: ChefHat         },
  { href: "/hostelero/valoraciones", label: "Reseñas",     icon: MessageSquare   },
]

export default function HosteleroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.Rol !== "hostelero") {
          router.push("/login")
        } else {
          setUser(data.user)
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false))
  }, [router])

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    toast.success("Sesion cerrada")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-6 py-5">
          <UtensilsCrossed className="h-6 w-6 text-sidebar-primary" />
          <span className="font-serif text-xl text-sidebar-foreground">
            La Cuchara
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-sidebar-border px-3 py-4">
          <div className="mb-3 px-3 text-xs text-sidebar-foreground/50">
            {user.NombreUsuario}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Cerrar Sesion
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <span className="font-serif text-lg">La Cuchara</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {/* Mobile Nav Overlay */}
        {mobileOpen && (
          <div className="border-b border-border bg-card px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
              <Button
                variant="ghost"
                className="mt-2 w-full justify-start gap-3 text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Cerrar Sesion
              </Button>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 bg-background p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
