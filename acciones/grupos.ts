"use server"
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { auditoria, grupos } from "@/db/schema"
import { exigirEscritura } from "@/dal/guard"
import { comun } from "@/i18n/es/comun"
import { erroresPorCampo, rechazo, type EstadoFormulario, type Resultado } from "@/lib/acciones"
import { codigoPg } from "@/lib/errores"
import { esquemaGrupo, MENSAJES_GRUPO } from "@/lib/grupo"
import { esUuid } from "@/lib/parametros"

export async function guardarGrupo(_: EstadoFormulario<{ nombre: string }>, datos: FormData): Promise<Resultado<{ nombre: string }>> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("grupos.gestionar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaGrupo.safeParse(Object.fromEntries(datos))
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  const { id, nombre } = r.data
  try {
    const fila = await db.transaction(async (tx) => {
      const [g] = id
        ? await tx.update(grupos).set({ nombre }).where(eq(grupos.id, id)).returning({ id: grupos.id, nombre: grupos.nombre })
        : await tx.insert(grupos).values({ nombre }).returning({ id: grupos.id, nombre: grupos.nombre })
      if (g) await tx.insert(auditoria).values({ usuarioId, accion: id ? "grupo.renombrar" : "grupo.crear", tabla: "grupos", filaId: g.id, detalle: { nombre } })
      return g
    })
    if (!fila) return { ok: false, mensaje: "Ese grupo ya no existe." }
    revalidatePath("/grupos")
    revalidatePath("/")
    return { ok: true, datos: { nombre: fila.nombre } }
  } catch (e) {
    if (codigoPg(e) === "23505") return { ok: false, mensaje: MENSAJES_GRUPO.repetido, errores: { nombre: MENSAJES_GRUPO.repetido } }
    throw e
  }
}

async function cambiarArchivo(id: string, archivar: boolean): Promise<Resultado<{ nombre: string }>> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("grupos.gestionar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  if (!esUuid(String(id))) return { ok: false, mensaje: "Grupo inválido" }
  const fila = await db.transaction(async (tx) => {
    const [g] = await tx
      .update(grupos)
      .set({ archivadoEn: archivar ? sql`now()` : null })
      .where(and(eq(grupos.id, id), archivar ? isNull(grupos.archivadoEn) : isNotNull(grupos.archivadoEn)))
      .returning({ id: grupos.id, nombre: grupos.nombre })
    if (g) await tx.insert(auditoria).values({ usuarioId, accion: archivar ? "grupo.archivar" : "grupo.restaurar", tabla: "grupos", filaId: g.id })
    return g
  })
  if (!fila) return { ok: false, mensaje: archivar ? "Ese grupo ya estaba archivado." : "Ese grupo ya estaba activo." }
  revalidatePath("/grupos")
  revalidatePath("/")
  return { ok: true, datos: { nombre: fila.nombre } }
}

export async function archivarGrupo(id: string) {
  return cambiarArchivo(id, true)
}

export async function restaurarGrupo(id: string) {
  return cambiarArchivo(id, false)
}
