"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { StarRating } from "./star-rating"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface RatingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platoId: number
  platoNombre: string
  onSuccess: () => void
}

export function RatingModal({
  open,
  onOpenChange,
  platoId,
  platoNombre,
  onSuccess,
}: RatingModalProps) {
  const [puntuacion, setPuntuacion] = useState(0)
  const [comentario, setComentario] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (puntuacion === 0) {
      toast.error("Selecciona una puntuacion")
      return
    }
    setLoading(true)

    try {
      const res = await fetch(`/api/platos/${platoId}/valoraciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntuacion, comentario }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Error al guardar valoracion")
        return
      }

      toast.success("Valoracion guardada")
      setPuntuacion(0)
      setComentario("")
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error("Error de conexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Valorar plato
          </DialogTitle>
          <DialogDescription className="text-balance">
            {platoNombre}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2">
            <Label className="text-sm text-muted-foreground">
              Tu puntuacion
            </Label>
            <StarRating value={puntuacion} onChange={setPuntuacion} size="lg" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rating-comment">
              Comentario{" "}
              <span className="text-xs text-muted-foreground">
                (opcional, {comentario.length}/150)
              </span>
            </Label>
            <Textarea
              id="rating-comment"
              placeholder="Que te ha parecido este plato?"
              value={comentario}
              onChange={(e) => setComentario(e.target.value.slice(0, 150))}
              maxLength={150}
              rows={3}
            />
          </div>
          <Button type="submit" disabled={loading || puntuacion === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Enviar Valoracion"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
