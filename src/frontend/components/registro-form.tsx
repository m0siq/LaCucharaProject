"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export function RegistroForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rol, setRol] = useState<string>("")
  const [nombreRestaurante, setNombreRestaurante] = useState("")
  const [direccion, setDireccion] = useState("")
  const [descripcion, setDescripcion] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          rol,
          nombreRestaurante,
          direccion,
          descripcion,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Error al registrar")
        return
      }

      toast.success("Cuenta creada con exito")

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
        <CardTitle className="font-serif text-2xl">Crear Cuenta</CardTitle>
        <CardDescription>
          Unete a La Cuchara para descubrir o publicar menus del dia
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="reg-username">Usuario</Label>
            <Input
              id="reg-username"
              placeholder="Elige un nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reg-password">Contraseña</Label>
            <Input
              id="reg-password"
              type="password"
              placeholder="Crea una contraseña segura"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reg-rol">Soy...</Label>
            <Select value={rol} onValueChange={setRol} required>
              <SelectTrigger id="reg-rol">
                <SelectValue placeholder="Selecciona tu rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">
                  Cliente - Busco menus del dia
                </SelectItem>
                <SelectItem value="hostelero">
                  Hostelero - Publico menus de mi restaurante
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rol === "hostelero" && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-restaurante">
                  Nombre del Restaurante
                </Label>
                <Input
                  id="reg-restaurante"
                  placeholder="Ej: Restaurante La Terraza"
                  value={nombreRestaurante}
                  onChange={(e) => setNombreRestaurante(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-direccion">Direccion</Label>
                <Input
                  id="reg-direccion"
                  placeholder="Ej: Calle Orense 12, Azca"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-descripcion">Descripcion</Label>
                <Textarea
                  id="reg-descripcion"
                  placeholder="Describe tu restaurante brevemente..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            disabled={loading || !rol}
            className="mt-2 w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              "Crear Cuenta"
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {"¿Ya tienes cuenta? "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Inicia sesion
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
