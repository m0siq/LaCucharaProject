"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Loader2, Upload, Trash2, ImageIcon, CalendarDays, X, ZoomIn } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function MenuPage() {
  const { data: menusData, isLoading: menusLoading } = useSWR("/api/menus", fetcher)

  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  // Estado para el lightbox (imagen grande)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)

    try {
      // 1. Crear el menú
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al crear el menu")
        return
      }

      const menuId = data.menuId

      // 2. Subir imagen si se seleccionó una
      if (imageFile) {
        const fd = new FormData()
        fd.append("menuId", String(menuId))
        fd.append("imagen", imageFile)

        const resImg = await fetch("/api/menus", {
          method: "PUT",
          body: fd,
        })

        if (!resImg.ok) {
          toast.warning("Menu creado pero no se pudo subir la imagen")
        }
      }

      toast.success("Menu creado correctamente")
      setImageFile(null)
      setImagePreview(null)
      mutate("/api/menus")

    } catch {
      toast.error("Error al crear el menu")
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(menuId: number) {
    setDeleting(menuId)
    try {
      const res = await fetch(`/api/menus/${menuId}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Error al eliminar el menu")
        return
      }
      toast.success("Menu eliminado")
      mutate("/api/menus")
    } catch {
      toast.error("Error al eliminar el menu")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl text-foreground">Menu del Dia</h1>

      {/* Crear menu */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <CalendarDays className="h-5 w-5 text-primary" />
            Publicar nuevo menu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
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
              <Label htmlFor="menu-imagen">Imagen del menu (opcional)</Label>
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
                    <img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
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

      {/* Lista de menus */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Menus publicados</CardTitle>
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
              {menusData.menus.map((menu: {
                IDMenu: number
                Fecha: string
                has_imagen: boolean
              }) => {
                const imageUrl = `/api/menus/${menu.IDMenu}/imagen`
                return (
                  <div
                    key={menu.IDMenu}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      {/* Miniatura: si hay imagen, la muestra y al clic abre el lightbox */}
                      {menu.has_imagen ? (
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(imageUrl)}
                          className="group relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          title="Ver imagen completa"
                        >
                          <img
                            src={imageUrl}
                            alt="Imagen del menu"
                            className="h-full w-full object-cover transition-opacity group-hover:opacity-75"
                          />
                          {/* Icono de lupa al hacer hover */}
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                            <ZoomIn className="h-4 w-4 text-white drop-shadow" />
                          </span>
                        </button>
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-border bg-muted">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}

                      <p className="text-sm font-medium text-foreground">
                        {new Date(menu.Fecha).toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
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
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox — imagen a pantalla completa */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxUrl}
              alt="Imagen completa del menu"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}