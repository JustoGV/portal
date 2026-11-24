"use server"
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { auditoria, grupos, proyectos } from "@/db/schema"
import * as dal from "@/dal/grupos"
import { exigir, exigirEscritura } from "@/dal/guard"
import { comun } from "@/i18n/es/comun"
import { erroresPorCampo, rechazo, type EstadoFormulario, type Resultado } from "@/lib/acciones"
import { codigoPg } from "@/lib/errores"
import { camposCambiados, CAMPOS_RESPONSABLE, esquemaGrupo, MENSAJES_GRUPO, MENSAJES_RESPONSABLE, type Responsable } from "@/lib/grupo"
import { dominioDeMail } from "@/lib/mail-dominio"
import { NOMBRE_GRUPO_MAX } from "@/lib/nombre"
import { esUuid } from "@/lib/parametros"
import { limpiarTexto } from "@/lib/texto"

// Toda función exportada desde acá es una acción pública: todas empiezan por el guard (docs/reglas/10 §3).

type Guardado = { id: string; nombre: string; entraron: number; salieron: number }

/**
 * Crea o edita un cliente (por dentro, un grupo: D-032). Si el formulario mandó el paso «Responsable», guarda
 * sus cuatro datos; la auditoría anota cuáles cambiaron, nunca el valor (docs/reglas/10 §7). Y, si el formulario mandó el paso «Servicios», deja en el grupo exactamente
 * los servicios marcados: los que faltaban entran (aunque vinieran de otro grupo) y los desmarcados quedan
 * sin grupo. Todo en una transacción, con su fila de auditoría. Mover servicios pide además el permiso de
 * editarlos: se comprueba acá, en el servidor.
 */
export async function guardarGrupo(_: EstadoFormulario<Guardado>, datos: FormData): Promise<Resultado<Guardado>> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("grupos.gestionar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaGrupo.safeParse(Object.fromEntries(datos))
  if (!r.success) {
    const errores = erroresPorCampo(r.error.issues)
    return { ok: false, mensaje: errores.servicios ?? comun.datoMalTexto, errores }
  }
  const { id, nombre, conServicios, servicios, conResponsable } = r.data
  const responsable = Object.fromEntries(CAMPOS_RESPONSABLE.map((c) => [c, r.data[c]])) as Responsable
  // El dominio del mail tiene que recibir correo (D-033). Si el DNS no contesta, no se inventa un "no".
  if (conResponsable && responsable.responsableMail && (await dominioDeMail(responsable.responsableMail)) === "no-recibe") {
    const dominio = responsable.responsableMail.slice(responsable.responsableMail.lastIndexOf("@") + 1)
    const mensaje = MENSAJES_RESPONSABLE.mailSinCorreo(dominio)
    return { ok: false, mensaje, errores: { responsableMail: mensaje } }
  }
  const datosFila = conResponsable ? { nombre, ...responsable } : { nombre }
  if (conServicios) {
    try {
      await exigir("proyectos.editar")
    } catch (e) {
      return rechazo(e)
    }
  }
  try {
    const fila = await db.transaction(async (tx) => {
      // Lo que había, leído y bloqueado dentro de la transacción: sirve para saber qué datos del responsable cambian.
      const [antes] = id && conResponsable
        ? await tx
            .select({
              responsableNombre: grupos.responsableNombre,
              responsableCargo: grupos.responsableCargo,
              responsableDni: grupos.responsableDni,
              responsableMail: grupos.responsableMail,
              responsableTelefono: grupos.responsableTelefono,
            })
            .from(grupos)
            .where(eq(grupos.id, id))
            .for("update")
        : []
      const [g] = id
        ? await tx.update(grupos).set(datosFila).where(eq(grupos.id, id)).returning({ id: grupos.id, nombre: grupos.nombre })
        : await tx.insert(grupos).values(datosFila).returning({ id: grupos.id, nombre: grupos.nombre })
      if (!g) return null
      await tx.insert(auditoria).values({ usuarioId, accion: id ? "grupo.renombrar" : "grupo.crear", tabla: "grupos", filaId: g.id, detalle: { nombre } })
      if (conResponsable) {
        const vacio = Object.fromEntries(CAMPOS_RESPONSABLE.map((c) => [c, null])) as Responsable
        const campos = camposCambiados(antes ?? vacio, responsable)
        if (campos.length) await tx.insert(auditoria).values({ usuarioId, accion: "grupo.responsable", tabla: "grupos", filaId: g.id, detalle: { campos } })
      }
      let entraron: string[] = []
      let salieron: string[] = []
      if (conServicios) {
        // Lo que hay hoy se lee dentro de la transacción; solo se tocan servicios activos.
        const hoy = await tx.select({ id: proyectos.id }).from(proyectos).where(and(eq(proyectos.grupoId, g.id), isNull(proyectos.archivadoEn)))
        const tiene = new Set(hoy.map((p) => p.id))
        const quiere = new Set(servicios)
        const sacar = [...tiene].filter((p) => !quiere.has(p))
        const poner = servicios.filter((p) => !tiene.has(p))
        if (sacar.length)
          salieron = (await tx.update(proyectos).set({ grupoId: null }).where(and(inArray(proyectos.id, sacar), eq(proyectos.grupoId, g.id))).returning({ id: proyectos.id })).map((p) => p.id)
        if (poner.length)
          entraron = (await tx.update(proyectos).set({ grupoId: g.id }).where(and(inArray(proyectos.id, poner), isNull(proyectos.archivadoEn))).returning({ id: proyectos.id })).map((p) => p.id)
        if (entraron.length || salieron.length)
          await tx.insert(auditoria).values({ usuarioId, accion: "grupo.servicios", tabla: "grupos", filaId: g.id, detalle: { entraron, salieron } })
      }
      return { ...g, entraron: entraron.length, salieron: salieron.length }
    })
    if (!fila) return { ok: false, mensaje: "Ese cliente ya no existe. Cerrá el formulario y volvé a buscarlo." }
    revalidatePath("/clientes")
    revalidatePath("/servicios")
    revalidatePath("/")
    return { ok: true, datos: fila }
  } catch (e) {
    if (codigoPg(e) === "23505") return { ok: false, mensaje: MENSAJES_GRUPO.repetido, errores: { nombre: MENSAJES_GRUPO.repetido } }
    throw e
  }
}

export type GrupoRepetido = { id: string; nombre: string; archivado: boolean } | null

/** El aviso en vivo de nombre repetido (docs/reglas/06 §3): el índice único lo frena igual al guardar. */
export async function verificarGrupo(nombre: string, excluir: string | null): Promise<Resultado<{ para: string; repetido: GrupoRepetido }>> {
  try {
    await exigir("grupos.gestionar")
  } catch (e) {
    return rechazo(e)
  }
  if (excluir !== null && !esUuid(String(excluir))) return { ok: false, mensaje: "Cliente inválido" }
  const clave = limpiarTexto(String(nombre ?? "")).slice(0, NOMBRE_GRUPO_MAX)
  if (!clave) return { ok: true, datos: { para: String(nombre), repetido: null } }
  return { ok: true, datos: { para: String(nombre), repetido: await dal.grupoPorNombre(clave, excluir) } }
}

async function cambiarArchivo(id: string, archivar: boolean): Promise<Resultado<{ nombre: string }>> {
  let usuarioId: string
  try {
    usuarioId = (await exigirEscritura("grupos.gestionar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  if (!esUuid(String(id))) return { ok: false, mensaje: "Cliente inválido" }
  const fila = await db.transaction(async (tx) => {
    const [g] = await tx
      .update(grupos)
      .set({ archivadoEn: archivar ? sql`now()` : null })
      .where(and(eq(grupos.id, id), archivar ? isNull(grupos.archivadoEn) : isNotNull(grupos.archivadoEn)))
      .returning({ id: grupos.id, nombre: grupos.nombre })
    if (g) await tx.insert(auditoria).values({ usuarioId, accion: archivar ? "grupo.archivar" : "grupo.restaurar", tabla: "grupos", filaId: g.id })
    return g
  })
  if (!fila) return { ok: false, mensaje: archivar ? "Ese cliente ya estaba archivado." : "Ese cliente ya estaba activo." }
  revalidatePath("/clientes")
  revalidatePath("/servicios")
  revalidatePath("/")
  return { ok: true, datos: { nombre: fila.nombre } }
}

export async function archivarGrupo(id: string) {
  return cambiarArchivo(id, true)
}

export async function restaurarGrupo(id: string) {
  return cambiarArchivo(id, false)
}
