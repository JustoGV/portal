"use server"
import { and, eq, isNull, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { auditoria, comentarios, grupos, proyectos, tarjetas, usuarios } from "@/db/schema"
import type { Comentario, Tarjeta } from "@/components/tablero/listas"
import { leerConversacion as leer, leerTarjeta, persona } from "@/dal/tablero"
import { exigir, exigirEscritura } from "@/dal/guard"
import { comun } from "@/i18n/es/comun"
import { erroresPorCampo, rechazo, type Resultado } from "@/lib/acciones"
import { codigoPg } from "@/lib/errores"
import { esquemaComentario, esquemaMover, esquemaNuevaTarjeta, esquemaResolver, MENSAJES_TABLERO, reordenar, type NuevaTarjeta } from "@/lib/tablero"
import { esUuid } from "@/lib/parametros"

// Toda función exportada desde acá es una acción pública: todas empiezan por el guard (docs/reglas/10 §3).
// Las escrituras del tablero se hacen de a una (un candado de la transacción): son tres personas y así el orden
// de las listas nunca queda a medias.

const candado = sql`select pg_advisory_xact_lock(hashtext('tablero'))`
const NO_EXISTE = { ok: false as const, mensaje: MENSAJES_TABLERO.noExiste }

/** Reescribe el lugar de cada tarjeta de una lista, en el orden dado (0, 1, 2…). */
const ubicar = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], lista: string, ids: string[]) => {
  if (!ids.length) return
  await tx.execute(sql`
    update tarjetas t set posicion = v.n - 1, lista = ${lista}
    from unnest(${`{${ids.join(",")}}`}::uuid[]) with ordinality as v(id, n)
    where t.id = v.id and (t.posicion <> v.n - 1 or t.lista <> ${lista})`)
}

const idsDe = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], lista: string) =>
  (await tx.select({ id: tarjetas.id }).from(tarjetas).where(eq(tarjetas.lista, lista)).orderBy(tarjetas.posicion, sql`${tarjetas.creadoEn} desc`, tarjetas.id)).map((f) => f.id)

/** Crea una tarjeta arriba de su lista. Comprueba que el servicio, el cliente y la persona sigan activos. */
export async function crearTarjeta(datos: NuevaTarjeta): Promise<Resultado<Tarjeta>> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("tablero.editar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaNuevaTarjeta.safeParse(datos)
  if (!r.success) {
    const errores = erroresPorCampo(r.error.issues)
    return { ok: false, mensaje: errores.titulo ?? errores.descripcion ?? errores.proyectoId ?? errores.responsableId ?? comun.datoMalTexto, errores }
  }
  const t = r.data
  const id = await db.transaction(async (tx) => {
    await tx.execute(candado)
    if (t.proyectoId) {
      const [p] = await tx.select({ id: proyectos.id }).from(proyectos).where(and(eq(proyectos.id, t.proyectoId), isNull(proyectos.archivadoEn)))
      if (!p) return "servicio" as const
    }
    if (t.grupoId) {
      const [g] = await tx.select({ id: grupos.id }).from(grupos).where(and(eq(grupos.id, t.grupoId), isNull(grupos.archivadoEn)))
      if (!g) return "servicio" as const
    }
    if (t.responsableId) {
      const [u] = await tx.select({ id: usuarios.id }).from(usuarios).where(and(eq(usuarios.id, t.responsableId), eq(usuarios.activo, true)))
      if (!u) return "persona" as const
    }
    const [nueva] = await tx
      .insert(tarjetas)
      .values({ lista: t.lista, posicion: 0, titulo: t.titulo, descripcion: t.descripcion, proyectoId: t.proyectoId, grupoId: t.grupoId, responsableId: t.responsableId, prioridad: t.prioridad, respuestas: t.respuestas, creadoPor: usuarioId })
      .returning({ id: tarjetas.id })
    await ubicar(tx, t.lista, [nueva!.id, ...(await idsDe(tx, t.lista)).filter((x) => x !== nueva!.id)])
    await tx.insert(auditoria).values({ usuarioId, accion: "tarjeta.crear", tabla: "tarjetas", filaId: nueva!.id, detalle: { lista: t.lista } })
    return nueva!.id
  })
  if (id === "servicio") return { ok: false, mensaje: MENSAJES_TABLERO.servicioNoEsta }
  if (id === "persona") return { ok: false, mensaje: MENSAJES_TABLERO.personaNoEsta }
  revalidatePath("/tablero")
  const vista = await leerTarjeta(id)
  return vista ? { ok: true, datos: vista } : NO_EXISTE
}

/**
 * Lleva una tarjeta a una lista y a un lugar. Reescribe el orden de la lista de destino y el de la de origen.
 * Una duda resuelta que sale de «Dudas» deja de estar resuelta (la base no deja una resolución fuera de esa lista).
 */
export async function moverTarjeta(id: string, lista: string, indice: number): Promise<Resultado> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("tablero.editar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaMover.safeParse({ id, lista, indice })
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto }
  const ok = await db.transaction(async (tx) => {
    await tx.execute(candado)
    const [antes] = await tx.select({ lista: tarjetas.lista }).from(tarjetas).where(eq(tarjetas.id, r.data.id))
    if (!antes) return false
    const misma = antes.lista === r.data.lista
    if (!misma && r.data.lista !== "dudas") await tx.update(tarjetas).set({ resueltaEn: null, resueltaPor: null }).where(eq(tarjetas.id, r.data.id))
    const n = reordenar(await idsDe(tx, antes.lista), misma ? [] : await idsDe(tx, r.data.lista), r.data.id, r.data.indice, misma)
    await ubicar(tx, r.data.lista, n.destino)
    if (!misma) await ubicar(tx, antes.lista, n.origen)
    if (!misma) await tx.insert(auditoria).values({ usuarioId, accion: "tarjeta.mover", tabla: "tarjetas", filaId: r.data.id, detalle: { de: antes.lista, a: r.data.lista } })
    return true
  })
  if (!ok) return NO_EXISTE
  revalidatePath("/tablero")
  return { ok: true }
}

/** Suma un mensaje a la conversación, o una respuesta a cualquier mensaje de la misma tarjeta (D-041). */
export async function comentar(tarjetaId: string, texto: string, respuestaA: string | null): Promise<Resultado<Comentario>> {
  let usuario: { id: string; nombre: string }
  try {
    usuario = (await exigirEscritura("tablero.editar")).usuario
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaComentario.safeParse({ tarjetaId, texto, respuestaA })
  if (!r.success) {
    const errores = erroresPorCampo(r.error.issues)
    return { ok: false, mensaje: errores.texto ?? comun.datoMalTexto, errores }
  }
  const [t] = await db.select({ id: tarjetas.id }).from(tarjetas).where(eq(tarjetas.id, r.data.tarjetaId))
  if (!t) return NO_EXISTE
  try {
    const [c] = await db
      .insert(comentarios)
      .values({ tarjetaId: r.data.tarjetaId, autorId: usuario.id, respuestaA: r.data.respuestaA, texto: r.data.texto })
      .returning({ id: comentarios.id, creadoEn: comentarios.creadoEn })
    revalidatePath("/tablero")
    return { ok: true, datos: { id: c!.id, autor: persona(usuario.id, usuario.nombre), texto: r.data.texto, creado: c!.creadoEn.toISOString(), respuestaA: r.data.respuestaA } }
  } catch (e) {
    // El trigger frena una respuesta a otra tarjeta; la FK, un mensaje que no existe.
    if (codigoPg(e) === "23514" || codigoPg(e) === "23503") return { ok: false, mensaje: MENSAJES_TABLERO.respuestaMal }
    throw e
  }
}

/** Marca una duda como resuelta o la reabre. Solo las tarjetas de «Dudas». */
export async function resolverDuda(id: string, resuelta: boolean): Promise<Resultado> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("tablero.editar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaResolver.safeParse({ id, resuelta })
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto }
  const cambio = await db.transaction(async (tx) => {
    const [f] = await tx
      .update(tarjetas)
      .set(r.data.resuelta ? { resueltaEn: sql`now()`, resueltaPor: usuarioId } : { resueltaEn: null, resueltaPor: null })
      .where(and(eq(tarjetas.id, r.data.id), eq(tarjetas.lista, "dudas")))
      .returning({ id: tarjetas.id })
    if (f) await tx.insert(auditoria).values({ usuarioId, accion: "tarjeta.resolver", tabla: "tarjetas", filaId: f.id, detalle: { resuelta: r.data.resuelta } })
    return !!f
  })
  if (!cambio) return NO_EXISTE
  revalidatePath("/tablero")
  return { ok: true }
}

/** La conversación de una tarjeta, al abrir su ficha. */
export async function leerConversacion(tarjetaId: string): Promise<Resultado<Comentario[]>> {
  try {
    await exigir("tablero.ver")
  } catch (e) {
    return rechazo(e)
  }
  if (typeof tarjetaId !== "string" || !esUuid(tarjetaId)) return NO_EXISTE
  return { ok: true, datos: await leer(tarjetaId) }
}
