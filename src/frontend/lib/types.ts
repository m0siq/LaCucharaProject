export interface Usuario {
  IDUsuario: number
  NombreUsuario: string
  Rol: "cliente" | "hostelero"
  FechaCreacion: Date
}

export interface Restaurante {
  IDRestaurante: number
  IDHostelero: number
  NombreRestaurante: string
  Direccion: string | null
  Descripcion: string | null
  ImagenURL: string | null
}

export interface RestauranteConValoracion extends Restaurante {
  PromedioValoracion: number | null
  TotalValoraciones: number
  MenuHoy: MenuDelDia | null
}

export interface Menu {
  IDMenu: number
  IDRestaurante: number
  Fecha: string
  Precio: number
  ImagenMenu: string | null
  FechaCreacion: Date
}

export interface MenuDelDia extends Menu {
  Platos: Plato[]
}

export interface Plato {
  IDPlato: number
  IDMenu: number
  Nombre: string
  Tipo: "primero" | "segundo" | "postre" | "bebida" | "otro"
  Descripcion: string | null
}

export interface PlatoConValoracion extends Plato {
  PromedioValoracion: number | null
  TotalValoraciones: number
}

export interface Valoracion {
  IDValoracion: number
  IDPlato: number
  IDCliente: number
  Puntuacion: number
  Comentario: string | null
  FechaValoracion: Date
  NombreUsuario?: string
}

export interface SessionUser {
  IDUsuario: number
  NombreUsuario: string
  Rol: "cliente" | "hostelero"
}

export const TIPOS_PLATO = [
  { value: "primero" as const, label: "Primer Plato" },
  { value: "segundo" as const, label: "Segundo Plato" },
  { value: "postre" as const, label: "Postre" },
  { value: "bebida" as const, label: "Bebida" },
  { value: "otro" as const, label: "Otro" },
] as const
