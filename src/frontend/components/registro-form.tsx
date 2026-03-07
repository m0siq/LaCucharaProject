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
import { Loader2, Upload } from "lucide-react"
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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>("")

async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // ── Elige el endpoint según el rol ──────────────────────
      const endpoint = rol === "hostelero" ? "/hosteleros/" : "/clientes/"
      
      if (rol === "hostelero") {
        // Para hostelero, enviar FormData con archivo
        const formData = new FormData()
        formData.append("NombreUsuario", username)
        formData.append("Contrasena", password)
        formData.append("NombreRestaurante", nombreRestaurante)
        if (logoFile) {
          formData.append("logo", logoFile)
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${endpoint}`, {
          method: "POST",
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          toast.error(data.detail || "Error al registrar")
          return
        }

        toast.success("Cuenta creada con exito")
        router.push("/hostelero")
      } else {
        // Para cliente, JSON normal
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ NombreUsuario: username, Contrasena: password }),
        })

        const data = await res.json()

        if (!res.ok) {
          toast.error(data.detail || "Error al registrar")
          return
        }

        toast.success("Cuenta creada con exito")
        router.push("/cliente")
      }
    } catch {
      toast.error("Error de conexion. Intentalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
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
                <Label htmlFor="reg-logo">Logo del Restaurante</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="reg-logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("reg-logo")?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {logoFile ? "Cambiar logo" : "Seleccionar logo"}
                  </Button>
                </div>
                {logoPreview && (
                  <div className="mt-2 flex items-center justify-center rounded-lg border border-border/50 bg-muted p-2">
                    <img src={logoPreview} alt="Logo preview" className="h-20 w-20 object-contain" />
                  </div>
                )}
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
