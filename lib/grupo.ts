import { z } from "zod"
import { NOMBRE_GRUPO_MAX } from "./nombre"
import { esUuid } from "./parametros"
import { limpiarTexto } from "./texto"

export const MENSAJES_GRUPO = {
  falta: "Escribí el nombre del grupo",
  largo: `El nombre tiene hasta ${NOMBRE_GRUPO_MAX} letras`,
  repetido: "Ya existe un grupo con ese nombre",
} as const

export const esquemaGrupo = z.object({
  id: z
    .string()
    .optional()
    .refine((v) => !v || esUuid(v), "Grupo inválido")
    .transform((v) => v || null),
  nombre: z.string().transform(limpiarTexto).pipe(z.string().min(1, MENSAJES_GRUPO.falta).max(NOMBRE_GRUPO_MAX, MENSAJES_GRUPO.largo)),
})

export type FilaGrupo = { id: string; nombre: string; proyectos: number; archivadoEn: string | null }
