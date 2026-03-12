"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Loader2, Trash2, Pencil, Check, X, ChefHat, Scan, Plus } from "lucide-react"
import { TIPOS_PLATO } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PlatosPage() {
  const { data: restData, isLoading: restLoading } = useSWR(
    "/api/hostelero/restaurante",
    fetcher
  )

  const today = new Date().toISOString().split("T")[0]

  const { data: menusData } = useSWR(
    restData?.restaurante
      ? `/api/menus?restauranteId=${restData.restaurante.IDRestaurante}`
      : null,
    fetcher
  )

  const todayMenu = menusData?.menus?.find(
    (m: { Fecha: string }) =>
      new Date(m.Fecha).toISOString().split("T")[0] === today
  )

  const { data: platosData, isLoading: platosLoading } = useSWR(
    todayMenu ? `/api/menus/${todayMenu.IDMenu}/platos` : null,
    fetcher
  )

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState({ nombre: "", tipo: "", descripcion: "" })
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [addData, setAddData] = useState({ nombre: "", tipo: TIPOS_PLATO[0].value as string, descripcion: "" })
  const [addingPlato, setAddingPlato] = useState(false)

  async function handleUpdate(platoId: number) {
    try {
      const res = await fetch(`/api/platos/${platoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || "Error al actualizar plato")
        return
      }

      toast.success("Plato actualizado")
      setEditingId(null)
      setEditData({ nombre: "", tipo: "", descripcion: "" })
      if (todayMenu) mutate(`/api/menus/${todayMenu.IDMenu}/platos`)
    } catch {
      toast.error("Error al actualizar plato")
    }
  }

  async function handleDelete(platoId: number) {
    setDeletingId(platoId)
    try {
      const res = await fetch(`/api/platos/${platoId}`, { method: "DELETE" })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || "Error al eliminar plato")
        return
      }

      toast.success("Plato eliminado")
      if (todayMenu) mutate(`/api/menus/${todayMenu.IDMenu}/platos`)
    } catch {
      toast.error("Error al eliminar plato")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAddPlato() {
    if (!todayMenu) return
    if (!addData.nombre.trim() || addData.nombre.trim().length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres")
      return
    }
    setAddingPlato(true)
    try {
      const res = await fetch(`/api/menus/${todayMenu.IDMenu}/platos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          NombrePlato: addData.nombre.trim(),
          Tipo: addData.tipo,
          Descripcion: addData.descripcion.trim() || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || "Error al crear plato")
        return
      }

      toast.success("Plato añadido")
      setShowAddForm(false)
      setAddData({ nombre: "", tipo: TIPOS_PLATO[0].value as string, descripcion: "" })
      mutate(`/api/menus/${todayMenu.IDMenu}/platos`)
    } catch {
      toast.error("Error al crear plato")
    } finally {
      setAddingPlato(false)
    }
  }

  async function handleOCR() {
    if (!todayMenu?.ImagenMenu) {
      toast.error("El menu de hoy no tiene imagen para analizar")
      return
    }
    setOcrLoading(true)
    console.log("🔍 Iniciando OCR con menú:", todayMenu)
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: todayMenu.ImagenMenu, menuId: todayMenu.IDMenu }),
      })
      const data = await res.json()
      console.log("✅ Respuesta OCR:", data)
      console.log("Estado respuesta:", res.status, res.ok)
      if (!res.ok) {
        console.error("❌ Error OCR:", data.error)
        toast.error(data.error || "Error en OCR")
        return
      }
      console.log(`🎉 Se extrajeron ${data.platosCreados || 0} platos`)
      toast.success(`Se extrajeron ${data.platosCreados || 0} platos de la imagen`)
      mutate(`/api/menus/${todayMenu.IDMenu}/platos`)
    } catch (error) {
      console.error("💥 Error al procesar OCR:", error)
      toast.error("Error al procesar OCR")
    } finally {
      setOcrLoading(false)
    }
  }

  function startEdit(plato: { IDPlato: number; NombrePlato: string; Tipo: string; Descripcion: string | null }) {
    setEditingId(plato.IDPlato)
    setEditData({
      nombre: plato.NombrePlato,
      tipo: plato.Tipo,
      descripcion: plato.Descripcion || "",
    })
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-3xl text-foreground">Platos del Dia</h1>
        {todayMenu && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleOCR}
              disabled={ocrLoading}
              className="w-fit"
            >
              {ocrLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Scan className="mr-2 h-4 w-4" />
              )}
              Extraer platos con OCR
            </Button>
            <Button
              onClick={() => {
                setShowAddForm(true)
                setEditingId(null)
              }}
              disabled={showAddForm}
              className="w-fit"
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir Plato
            </Button>
          </div>
        )}
      </div>

      {!todayMenu ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <ChefHat className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">
                No hay menu publicado para hoy
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ve a &quot;Menu del Dia&quot; para publicar el menu de hoy antes de anadir platos.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Dishes table */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="font-serif text-xl">
                Platos del menu de hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {platosLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : !platosData?.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay platos anadidos al menu de hoy
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripcion</TableHead>
                        <TableHead className="w-24 text-right">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {platosData.map(
                        (plato: {
                          IDPlato: number
                          NombrePlato: string
                          Tipo: string
                          Descripcion: string | null
                        }) => (
                          <TableRow key={plato.IDPlato}>
                            <TableCell>
                              {editingId === plato.IDPlato ? (
                                <Input
                                  value={editData.nombre}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      nombre: e.target.value,
                                    })
                                  }
                                  className="h-8"
                                />
                              ) : (
                                plato.NombrePlato
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === plato.IDPlato ? (
                                <Select
                                  value={editData.tipo}
                                  onValueChange={(v) =>
                                    setEditData({ ...editData, tipo: v })
                                  }
                                >
                                  <SelectTrigger className="h-8 w-36">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIPOS_PLATO.map((t) => (
                                      <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  {TIPOS_PLATO.find(
                                    (t) => t.value === plato.Tipo
                                  )?.label || plato.Tipo}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {editingId === plato.IDPlato ? (
                                <Input
                                  value={editData.descripcion}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      descripcion: e.target.value.slice(0, 150),
                                    })
                                  }
                                  className="h-8"
                                  maxLength={150}
                                />
                              ) : (
                                <span className="text-muted-foreground">
                                  {plato.Descripcion || "-"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {editingId === plato.IDPlato ? (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                      handleUpdate(plato.IDPlato)
                                    }
                                  >
                                    <Check className="h-4 w-4 text-primary" />
                                    <span className="sr-only">
                                      Guardar
                                    </span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditingId(null)}
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">
                                      Cancelar
                                    </span>
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => startEdit(plato)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">
                                      Editar
                                    </span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                      handleDelete(plato.IDPlato)
                                    }
                                    disabled={deletingId === plato.IDPlato}
                                  >
                                    {deletingId === plato.IDPlato ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">
                                      Eliminar
                                    </span>
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              {showAddForm && (
                <div className="mt-4 rounded-lg border border-border/50 p-4">
                  <p className="mb-3 text-sm font-medium">Nuevo plato</p>
                  <div className="flex flex-wrap gap-3">
                    <Input
                      placeholder="Nombre *"
                      value={addData.nombre}
                      onChange={(e) =>
                        setAddData({ ...addData, nombre: e.target.value })
                      }
                      className="h-9 w-40"
                      maxLength={150}
                    />
                    <Select
                      value={addData.tipo}
                      onValueChange={(v) =>
                        setAddData({ ...addData, tipo: v })
                      }
                    >
                      <SelectTrigger className="h-9 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_PLATO.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Descripcion"
                      value={addData.descripcion}
                      onChange={(e) =>
                        setAddData({
                          ...addData,
                          descripcion: e.target.value.slice(0, 150),
                        })
                      }
                      className="h-9 min-w-48 flex-1"
                      maxLength={150}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddPlato}
                        disabled={addingPlato}
                      >
                        {addingPlato ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowAddForm(false)
                          setAddData({
                            nombre: "",
                            tipo: TIPOS_PLATO[0].value as string,
                            descripcion: "",
                          })
                        }}
                        disabled={addingPlato}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
