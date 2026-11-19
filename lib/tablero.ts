import { z } from "zod"
import { esUuid } from "./parametros"
import { limpiarTexto } from "./texto"

// Las reglas del tablero (D-038, D-040), escritas una vez: las usan el alta en el navegador y las acciones en
// el servidor. Los topes son los mismos que los checks de la migración 0005: la base los frena igual.

export const LISTAS_ID = ["dudas", "servicios", "tareas", "correcciones"] as const
export type ListaId = (typeof LISTAS_ID)[number]
export const esLista = (v: string): v is ListaId => (LISTAS_ID as readonly string[]).includes(v)

export const TONOS = ["marca", "info", "ok", "warn", "violeta", "danger"] as const
export type Tono = (typeof TONOS)[number]

/** El color de un servicio o de una persona sale de su id: siempre el mismo, sin guardarlo. */
export const tonoDe = (id: string): Tono => {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TONOS[h % TONOS.length]!
}

export const TITULO_MAX = 120
export const TEXTO_MAX = 2000
export const RESPUESTAS_MAX = 12
export const RESPUESTA_MAX = 300
/** Cuántas tarjetas trae cada lista (docs/reglas/07: ninguna tabla entera). */
export const TARJETAS_POR_LISTA = 200

export const MENSAJES_TABLERO = {
  titulo: "Escribí el título de la tarjeta",
  tituloLargo: `El título tiene hasta ${TITULO_MAX} letras`,
  textoLargo: `El texto tiene hasta ${TEXTO_MAX} letras`,
  comentarioVacio: "Escribí algo antes de mandar",
  comentarioLargo: `El comentario tiene hasta ${TEXTO_MAX} letras`,
  noExiste: "Esa tarjeta ya no está en el tablero. Recargá la página.",
  servicioNoEsta: "Ese servicio o cliente ya no está en el portal. Elegí otro.",
  personaNoEsta: "Esa persona ya no tiene cuenta activa. Elegí otra.",
  respuestaMal: "Ese comentario no se puede responder. Recargá la página.",
} as const

const id = z.string().refine(esUuid, "id")
const idONulo = id.nullable()
const textoLibre = (max: number, largo: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length <= max, largo)

export const esquemaNuevaTarjeta = z
  .object({
    lista: z.enum(LISTAS_ID),
    titulo: z
      .string()
      .transform(limpiarTexto)
      .refine((s) => s.length >= 1, MENSAJES_TABLERO.titulo)
      .refine((s) => s.length <= TITULO_MAX, MENSAJES_TABLERO.tituloLargo),
    descripcion: textoLibre(TEXTO_MAX, MENSAJES_TABLERO.textoLargo).transform((s) => s || null),
    proyectoId: idONulo,
    grupoId: idONulo,
    responsableId: idONulo,
    prioridad: z.boolean(),
    respuestas: z
      .array(z.object({ pregunta: z.string().transform(limpiarTexto).pipe(z.string().min(1).max(RESPUESTA_MAX)), respuesta: z.string().transform((s) => s.trim()).pipe(z.string().max(RESPUESTA_MAX)) }))
      .max(RESPUESTAS_MAX),
  })
  .strict()
  // Una tarjeta lleva un servicio o un cliente, nunca los dos; las dudas no tienen persona (D-040).
  .refine((t) => !(t.proyectoId && t.grupoId), { path: ["proyectoId"], message: MENSAJES_TABLERO.servicioNoEsta })
  .refine((t) => t.lista !== "dudas" || t.responsableId === null, { path: ["responsableId"], message: MENSAJES_TABLERO.personaNoEsta })
export type NuevaTarjeta = z.input<typeof esquemaNuevaTarjeta>

export const esquemaMover = z.object({ id, lista: z.enum(LISTAS_ID), indice: z.number().int().min(0).max(TARJETAS_POR_LISTA) }).strict()

export const esquemaComentario = z
  .object({
    tarjetaId: id,
    respuestaA: idONulo,
    texto: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s.length >= 1, MENSAJES_TABLERO.comentarioVacio)
      .refine((s) => s.length <= TEXTO_MAX, MENSAJES_TABLERO.comentarioLargo),
  })
  .strict()

export const esquemaResolver = z.object({ id, resuelta: z.boolean() }).strict()

/** Dónde queda cada id después de sacar `id` de su lista y ponerlo en `indice` de `destino`. */
export const reordenar = (origen: string[], destino: string[], movida: string, indice: number, mismaLista: boolean) => {
  const sinElla = (mismaLista ? origen : destino).filter((x) => x !== movida)
  const i = Math.min(Math.max(indice, 0), sinElla.length)
  const nuevoDestino = [...sinElla.slice(0, i), movida, ...sinElla.slice(i)]
  return { origen: mismaLista ? nuevoDestino : origen.filter((x) => x !== movida), destino: nuevoDestino }
}
