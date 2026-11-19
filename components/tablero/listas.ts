// Las cuatro listas del tablero (WU-07, D-038) y la forma de lo que se dibuja. Los datos salen de la base
// (D-040, `dal/tablero.ts`); acá no hay datos de muestra.

import type { ListaId, Tono } from "@/lib/tablero"

export type { ListaId, Tono } from "@/lib/tablero"

export type Persona = { id: string; nombre: string; iniciales: string; tono: Tono }
export type Tarjeta = {
  id: string
  titulo: string
  /** La etiqueta: el servicio, el cliente o «Otro». */
  servicio: string
  tono: Tono
  /** Quién la tiene. Las dudas no tienen: son para Claudio. */
  responsable: Persona | null
  /** Cuándo se abrió, en ISO. */
  creada: string
  prioridad?: "alta"
  comentarios: number
  resuelta: boolean
  descripcion: string | null
  respuestas: { pregunta: string; respuesta: string }[]
}

export const LISTAS: { id: ListaId; titulo: string; tono: Tono; pista: string; corta: string }[] = [
  { id: "dudas", titulo: "Dudas para Claudio", tono: "info", pista: "Lo que solo Claudio puede contestar", corta: "Sin contestar" },
  { id: "servicios", titulo: "Servicios", tono: "marca", pista: "Lo que se está armando para un cliente", corta: "En armado" },
  { id: "tareas", titulo: "Tareas", tono: "ok", pista: "Lo que hay que hacer y quién lo tiene", corta: "Por hacer" },
  { id: "correcciones", titulo: "Correcciones", tono: "warn", pista: "Lo que hay que arreglar en lo que ya anda", corta: "Por arreglar" },
]

/** Las dudas no tienen persona en la base: se muestran a nombre de Claudio, que es para quien es la lista. */
export const CLAUDIO: Persona = { id: "claudio", nombre: "Claudio", iniciales: "C", tono: "ok" }

/** Un mensaje de la conversación. `respuestaA`: el mensaje que cita, si responde a uno (D-041). */
export type Comentario = { id: string; autor: Persona; texto: string; creado: string; respuestaA: string | null }

/** Cuándo se abrió una tarjeta, corto: «hoy», «ayer» o «9 nov». */
const corto = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "short" })
const diaDe = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
export const fechaCorta = (iso: string, ahora: Date = new Date()) => {
  const d = diaDe.format(new Date(iso))
  if (d === diaDe.format(ahora)) return "hoy"
  if (d === diaDe.format(new Date(ahora.getTime() - 86_400_000))) return "ayer"
  return corto.format(new Date(iso)).replace(".", "")
}
