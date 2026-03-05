"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        const mensaje = typeof data.error === "string"
          ? data.error
          : Array.isArray(data.detail)
          ? data.detail[0]?.msg || "Error al iniciar sesion"
          : typeof data.detail === "string"
          ? data.detail
          : "Credenciales incorrectas"

        toast.error(mensaje)
        return
      }

      toast.success(`Bienvenido, ${data.user.NombreUsuario}`)

      if (data.user.Rol === "hostelero") {
        router.push("/hostelero")
      } else {
        router.push("/cliente")
      }
    } catch {
      toast.error("Error de conexion. Intentalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-border/50 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="font-serif text-2xl">Iniciar Sesion</CardTitle>
        <CardDescription>
          Accede a tu cuenta para descubrir los menus del dia
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              placeholder="Tu nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {"¿No tienes cuenta? "}
          <Link href="/registro" className="font-medium text-primary underline-offset-4 hover:underline">
            Registrate
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}