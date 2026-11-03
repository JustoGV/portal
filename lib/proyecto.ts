// Las reglas de un proyecto (D-003), escritas una vez: las usan el formulario y la acción.
import { z } from "zod"
import { esUuid } from "./parametros"
import { DESCRIPCION_MAX, NOMBRE_GRUPO_MAX, NOMBRE_PROYECTO_MAX } from "./nombre"
import { limpiarTexto } from "./texto"
import { MENSAJE_URL, normalizarUrl } from "./url"

export const MENSAJES_PROYECTO = {
  nombreFalta: "Escribí el nombre del proyecto",
  nombreLargo: `El nombre tiene hasta ${NOMBRE_PROYECTO_MAX} letras`,
  descripcionLarga: `La descripción tiene hasta ${DESCRIPCION_MAX} letras`,
  grupoLargo: `El nombre del grupo tiene hasta ${NOMBRE_GRUPO_MAX} letras`,
  grupoInvalido: "Elegí un grupo de la lista",
  nombreRepetido: "Ya existe un proyecto con ese nombre",
  urlRepetida: "Ya existe un proyecto con ese link",
} as const

export const validarNombreProyecto = (nombre: string): string | null => {
  const n = limpiarTexto(nombre)
  if (!n) return MENSAJES_PROYECTO.nombreFalta
  if (n.length > NOMBRE_PROYECTO_MAX) return MENSAJES_PROYECTO.nombreLargo
  return null
}

const textoOpcional = (max: number, mensaje: string) =>
  z
    .string()
    .optional()
    .transform((v) => limpiarTexto(v ?? ""))
    .pipe(z.string().max(max, mensaje))
    .transform((v) => v || null)

export const esquemaProyecto = z.object({
  id: z
    .string()
    .optional()
    .refine((v) => !v || esUuid(v), "Proyecto inválido")
    .transform((v) => v || null),
  nombre: z
    .string()
    .transform(limpiarTexto)
    .pipe(z.string().min(1, MENSAJES_PROYECTO.nombreFalta).max(NOMBRE_PROYECTO_MAX, MENSAJES_PROYECTO.nombreLargo)),
  url: z.string().transform((v, ctx) => {
    const r = normalizarUrl(v)
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: MENSAJE_URL[r.error] })
      return z.NEVER
    }
    return r.url
  }),
  descripcion: textoOpcional(DESCRIPCION_MAX, MENSAJES_PROYECTO.descripcionLarga),
  grupoId: z
    .string()
    .optional()
    .refine((v) => !v || esUuid(v), MENSAJES_PROYECTO.grupoInvalido)
    .transform((v) => v || null),
  grupoNuevo: textoOpcional(NOMBRE_GRUPO_MAX, MENSAJES_PROYECTO.grupoLargo),
})

export type DatosProyecto = z.output<typeof esquemaProyecto>

export type FilaProyecto = {
  id: string
  nombre: string
  url: string
  descripcion: string | null
  grupoId: string | null
  grupoNombre: string | null
  actualizadoEn: string
  archivadoEn: string | null
}
