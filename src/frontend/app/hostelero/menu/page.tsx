"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Loader2,
  Upload,
  Trash2,
  ImageIcon,
  CalendarDays,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function MenuPage() {
  const { data: restData, isLoading: restLoading } = useSWR(
    "/api/hostelero/restaurante",
    fetcher
  )
  const { data: menusData, isLoading: menusLoading } = useSWR(
    restData?.restaurante
      ? `/api/menus?restauranteId=${restData.restaurante.IDRestaurante}`
      : null,
    fetcher
  )

  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0])
  const [precio, setPrecio] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setImagePreview(result)
        setImageBase64(result)
      }
      reader.readAsDataURL(file)
    },
    []
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!restData?.restaurante) return
    setCreating(true)

    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restauranteId: restData.restaurante.IDRestaurante,
          fecha,
          precio: parseFloat(precio),
          imagenMenu: imageBase64,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }

      toast.success("Menu creado correctamente")
      setPrecio("")
      setImagePreview(null)
      setImageBase64(null)
      mutate(
        `/api/menus?restauranteId=${restData.restaurante.IDRestaurante}`
      )
    } catch {
      toast.error("Error al crear el menu")
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(menuId: number) {
    setDeleting(menuId)
    try {
      await fetch(`/api/menus/${menuId}`, { method: "DELETE" })
      toast.success("Menu eliminado")
      if (restData?.restaurante) {
        mutate(
          `/api/menus?restauranteId=${restData.restaurante.IDRestaurante}`
        )
      }
    } catch {
      toast.error("Error al eliminar el menu")
    } finally {
      setDeleting(null)
    }
  }

  if (restLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl text-foreground">Menu del Dia</h1>

      {/* Create Menu Form */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <CalendarDays className="h-5 w-5 text-primary" />
            Publicar nuevo menu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="menu-fecha">Fecha</Label>
                <Input
                  id="menu-fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="menu-precio">{"Precio (EUR)"}</Label>
                <Input
                  id="menu-precio"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="12.50"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="menu-imagen">
                Imagen del menu (opcional)
              </Label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="menu-imagen"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                  Subir imagen
                </label>
                <Input
                  id="menu-imagen"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imagePreview && (
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                    <img
                      src={imagePreview}
                      alt="Vista previa"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" disabled={creating} className="w-fit">
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                "Publicar Menu"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Menus */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-serif text-xl">
            Menus publicados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {menusLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !menusData?.menus?.length ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No has publicado ningun menu todavia
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {menusData.menus.map(
                (menu: {
                  IDMenu: number
                  Fecha: string
                  Precio: number
                  ImagenMenu: string | null
                }) => (
                  <div
                    key={menu.IDMenu}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      {menu.ImagenMenu ? (
                        <div className="h-10 w-10 overflow-hidden rounded border border-border">
                          <img
                            src={menu.ImagenMenu}
                            alt="Menu"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-muted">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(menu.Fecha).toLocaleDateString("es-ES", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Number(menu.Precio).toFixed(2)} EUR
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(menu.IDMenu)}
                      disabled={deleting === menu.IDMenu}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      {deleting === menu.IDMenu ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="sr-only">Eliminar menu</span>
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
