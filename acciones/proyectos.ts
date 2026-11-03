"use server"
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { auditoria, grupos, proyectos } from "@/db/schema"
import * as dal from "@/dal/proyectos"
import { exigir, exigirEscritura } from "@/dal/guard"
import { comun } from "@/i18n/es/comun"
import { erroresPorCampo, rechazo, type EstadoFormulario, type Resultado } from "@/lib/acciones"
import { codigoPg, restriccionPg } from "@/lib/errores"
import { esUuid } from "@/lib/parametros"
import { esquemaProyecto, MENSAJES_PROYECTO } from "@/lib/proyecto"
import { limpiarTexto } from "@/lib/texto"
import { normalizarUrl } from "@/lib/url"

// Toda función exportada desde acá es una acción pública: todas empiezan por el guard (docs/reglas/10 §3).

export async function guardarProyecto(_: EstadoFormulario<{ id: string; nombre: string }>, datos: FormData): Promise<Resultado<{ id: string; nombre: string }>> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("proyectos.editar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaProyecto.safeParse(Object.fromEntries(datos))
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  const d = r.data

  try {
    const fila = await db.transaction(async (tx) => {
      let grupoId = d.grupoId
      if (!grupoId && d.grupoNuevo) {
        // Si el grupo ya existe (aunque esté archivado) se usa ese y se desarchiva.
        await tx.insert(grupos).values({ nombre: d.grupoNuevo }).onConflictDoNothing({ target: grupos.nombreClave })
        const [g] = await tx
          .update(grupos)
          .set({ archivadoEn: null })
          .where(eq(grupos.nombreClave, d.grupoNuevo.toLowerCase()))
          .returning({ id: grupos.id })
        grupoId = g?.id ?? null
        if (grupoId) await tx.insert(auditoria).values({ usuarioId, accion: "grupo.crear", tabla: "grupos", filaId: grupoId, detalle: { nombre: d.grupoNuevo } })
      }
      const valores = { nombre: d.nombre, url: d.url, descripcion: d.descripcion, grupoId }
      if (d.id) {
        const [p] = await tx.update(proyectos).set(valores).where(eq(proyectos.id, d.id)).returning({ id: proyectos.id, nombre: proyectos.nombre })
        if (!p) return null
        await tx.insert(auditoria).values({ usuarioId, accion: "proyecto.editar", tabla: "proyectos", filaId: p.id, detalle: valores })
        return p
      }
      const [p] = await tx.insert(proyectos).values({ ...valores, creadoPor: usuarioId }).returning({ id: proyectos.id, nombre: proyectos.nombre })
      await tx.insert(auditoria).values({ usuarioId, accion: "proyecto.crear", tabla: "proyectos", filaId: p!.id, detalle: valores })
      return p!
    })
    if (!fila) return { ok: false, mensaje: "Ese proyecto ya no existe. Cerrá el formulario y volvé a buscarlo." }
    revalidatePath("/")
    revalidatePath("/grupos")
    return { ok: true, datos: fila }
  } catch (e) {
    if (codigoPg(e) === "23505") {
      const c = restriccionPg(e)
      if (c === "proyectos_nombre_clave_key") return { ok: false, mensaje: MENSAJES_PROYECTO.nombreRepetido, errores: { nombre: MENSAJES_PROYECTO.nombreRepetido } }
      if (c === "proyectos_url_key") return { ok: false, mensaje: MENSAJES_PROYECTO.urlRepetida, errores: { url: MENSAJES_PROYECTO.urlRepetida } }
    }
    if (codigoPg(e) === "23503") return { ok: false, mensaje: MENSAJES_PROYECTO.grupoInvalido, errores: { grupo: MENSAJES_PROYECTO.grupoInvalido } }
    throw e
  }
}

export type Duplicado = { id: string; nombre: string; archivado: boolean } | null

/** El aviso en vivo de nombre o link repetido (docs/reglas/06 §3, §14). */
export async function verificarDuplicado(campo: "nombre" | "url", valor: string, excluir: string | null): Promise<Resultado<{ para: string; duplicado: Duplicado }>> {
  try {
    await exigir("proyectos.ver")
  } catch (e) {
    return rechazo(e)
  }
  if (campo !== "nombre" && campo !== "url") return { ok: false, mensaje: "Campo inválido" }
  if (excluir !== null && !esUuid(String(excluir))) return { ok: false, mensaje: "Proyecto inválido" }
  let clave: string
  if (campo === "nombre") {
    clave = limpiarTexto(String(valor)).slice(0, 80)
  } else {
    const u = normalizarUrl(String(valor))
    if (!u.ok) return { ok: true, datos: { para: String(valor), duplicado: null } }
    clave = u.url
  }
  if (!clave) return { ok: true, datos: { para: String(valor), duplicado: null } }
  return { ok: true, datos: { para: String(valor), duplicado: await dal.buscarDuplicado(campo, clave, excluir) } }
}

async function cambiarArchivo(id: string, archivar: boolean): Promise<Resultado<{ nombre: string }>> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("proyectos.archivar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  if (!esUuid(String(id))) return { ok: false, mensaje: "Proyecto inválido" }
  const fila = await db.transaction(async (tx) => {
    const [p] = await tx
      .update(proyectos)
      .set(archivar ? { archivadoEn: sql`now()`, archivadoPor: usuarioId } : { archivadoEn: null, archivadoPor: null })
      .where(and(eq(proyectos.id, id), archivar ? isNull(proyectos.archivadoEn) : isNotNull(proyectos.archivadoEn)))
      .returning({ id: proyectos.id, nombre: proyectos.nombre })
    if (p) await tx.insert(auditoria).values({ usuarioId, accion: archivar ? "proyecto.archivar" : "proyecto.restaurar", tabla: "proyectos", filaId: p.id })
    return p
  })
  if (!fila) return { ok: false, mensaje: archivar ? "Ese proyecto ya estaba archivado." : "Ese proyecto ya estaba activo." }
  revalidatePath("/")
  revalidatePath("/grupos")
  return { ok: true, datos: { nombre: fila.nombre } }
}

export async function archivarProyecto(id: string) {
  return cambiarArchivo(id, true)
}

export async function restaurarProyecto(id: string) {
  return cambiarArchivo(id, false)
}

export type ResultadoRapido = { id: string; nombre: string; url: string; grupo: string | null }

/** Ctrl+K. */
export async function buscarProyectosRapido(texto: string): Promise<Resultado<ResultadoRapido[]>> {
  try {
    await exigir("proyectos.ver")
  } catch (e) {
    return rechazo(e)
  }
  const q = limpiarTexto(String(texto ?? "")).slice(0, 80)
  return { ok: true, datos: await dal.buscarRapido(q) }
}
