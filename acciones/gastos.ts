"use server"
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { auditoria, gastos, usuarios } from "@/db/schema"
import { exigirEscritura } from "@/dal/guard"
import { comun } from "@/i18n/es/comun"
import { erroresPorCampo, rechazo, type EstadoFormulario, type Resultado } from "@/lib/acciones"
import { codigoPg } from "@/lib/errores"
import { esquemaGasto, MENSAJES_GASTO } from "@/lib/gasto"
import { esUuid } from "@/lib/parametros"

// Toda función exportada desde acá es una acción pública: todas empiezan por el guard (docs/reglas/10 §3).

export async function guardarGasto(_: EstadoFormulario<{ id: string; nombre: string }>, datos: FormData): Promise<Resultado<{ id: string; nombre: string }>> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("gastos.editar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaGasto.safeParse(Object.fromEntries(datos))
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  const { id, ...d } = r.data

  try {
    const fila = await db.transaction(async (tx) => {
      // Quien paga tiene que ser una cuenta activa (la clave foránea solo dice que existe).
      const [paga] = await tx.select({ id: usuarios.id }).from(usuarios).where(and(eq(usuarios.id, d.pagaId), eq(usuarios.activo, true))).limit(1)
      if (!paga) return "paga" as const
      if (id) {
        const [g] = await tx.update(gastos).set(d).where(eq(gastos.id, id)).returning({ id: gastos.id, nombre: gastos.nombre })
        if (!g) return null
        await tx.insert(auditoria).values({ usuarioId, accion: "gasto.editar", tabla: "gastos", filaId: g.id, detalle: d })
        return g
      }
      const [g] = await tx.insert(gastos).values({ ...d, creadoPor: usuarioId }).returning({ id: gastos.id, nombre: gastos.nombre })
      await tx.insert(auditoria).values({ usuarioId, accion: "gasto.crear", tabla: "gastos", filaId: g!.id, detalle: d })
      return g!
    })
    if (fila === "paga") return { ok: false, mensaje: MENSAJES_GASTO.pagaMal, errores: { pagaId: MENSAJES_GASTO.pagaMal } }
    if (!fila) return { ok: false, mensaje: "Ese gasto ya no existe. Cerrá el formulario y volvé a buscarlo." }
    revalidatePath("/gastos")
    return { ok: true, datos: fila }
  } catch (e) {
    // La base repite las reglas (CHECK): si algo pasó el formulario y no la base, se dice en criollo.
    if (codigoPg(e) === "23514") return { ok: false, mensaje: comun.datoMalTexto }
    throw e
  }
}

async function cambiarArchivo(id: string, archivar: boolean): Promise<Resultado<{ nombre: string }>> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("gastos.editar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  if (!esUuid(String(id))) return { ok: false, mensaje: "Gasto inválido" }
  const fila = await db.transaction(async (tx) => {
    const [g] = await tx
      .update(gastos)
      .set(archivar ? { archivadoEn: sql`now()`, archivadoPor: usuarioId } : { archivadoEn: null, archivadoPor: null })
      .where(and(eq(gastos.id, id), archivar ? isNull(gastos.archivadoEn) : isNotNull(gastos.archivadoEn)))
      .returning({ id: gastos.id, nombre: gastos.nombre })
    if (g) await tx.insert(auditoria).values({ usuarioId, accion: archivar ? "gasto.archivar" : "gasto.restaurar", tabla: "gastos", filaId: g.id })
    return g
  })
  if (!fila) return { ok: false, mensaje: archivar ? "Ese gasto ya estaba archivado." : "Ese gasto ya estaba activo." }
  revalidatePath("/gastos")
  return { ok: true, datos: { nombre: fila.nombre } }
}

export async function archivarGasto(id: string) {
  return cambiarArchivo(id, true)
}

export async function restaurarGasto(id: string) {
  return cambiarArchivo(id, false)
}
