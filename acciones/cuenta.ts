"use server"
import { APIError } from "better-auth/api"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { db } from "@/db"
import { auditoria, usuarios } from "@/db/schema"
import { cerrarOtrasSesiones, cerrarSesionPropia, otrasSesiones } from "@/dal/cuentas"
import { exigirEscritura } from "@/dal/guard"
import { comun } from "@/i18n/es/comun"
import { cuenta as t } from "@/i18n/es/cuenta"
import { erroresPorCampo, rechazo, type EstadoFormulario, type Resultado } from "@/lib/acciones"
import { auth } from "@/lib/auth"
import { esquemaClaveNueva, esquemaMiNombre } from "@/lib/cuenta"
import { esUuid } from "@/lib/parametros"

// Mi cuenta (WU-06 pantalla 6, D-035). Toda función de acá es una acción pública y empieza por el guard
// (docs/reglas/10 §3). El guard pide «proyectos.ver», el permiso que tiene toda cuenta activa: lo que se
// toca es siempre la cuenta de la sesión, nunca una que venga en el pedido.

/** Cambia el nombre propio. El mail no: es con lo que se entra. */
export async function editarMiNombre(_: EstadoFormulario<{ nombre: string }>, datos: FormData): Promise<Resultado<{ nombre: string }>> {
  let yo: string
  try {
    yo = (await exigirEscritura("proyectos.ver")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaMiNombre.safeParse(Object.fromEntries(datos))
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  const [u] = await db.update(usuarios).set({ nombre: r.data.nombre, actualizadoEn: sql`now()` }).where(eq(usuarios.id, yo)).returning({ nombre: usuarios.nombre })
  if (!u) return { ok: false, mensaje: comun.sesionVencida, sesion: "vencida" }
  await db.insert(auditoria).values({ usuarioId: yo, accion: "usuario.editar", tabla: "usuarios", filaId: yo, detalle: { campos: ["nombre"], propia: true } })
  revalidatePath("/", "layout")
  return { ok: true, datos: u }
}

/**
 * Cambia la contraseña propia. Pide la actual y cierra las demás sesiones (ASVS 7.4.3): si alguien más
 * tenía la cuenta abierta, queda afuera. better-auth deja una sesión nueva en este navegador. Límite: 10
 * intentos cada 15 minutos (lib/auth.ts).
 */
export async function cambiarMiClave(_: EstadoFormulario<{ cerradas: number }>, datos: FormData): Promise<Resultado<{ cerradas: number }>> {
  let yo: string
  let authId: string
  let miSesion: string
  try {
    const g = await exigirEscritura("proyectos.ver")
    yo = g.usuario.id
    authId = g.sesion.user.id
    miSesion = g.sesion.session.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaClaveNueva.safeParse(Object.fromEntries(datos))
  if (!r.success) {
    const errores = erroresPorCampo(r.error.issues)
    // El esquema es el del primer ingreso, que habla de la contraseña «inicial»: acá es la actual.
    if (errores.actual) errores.actual = t.claveActualFalta
    return { ok: false, mensaje: comun.datoMalTexto, errores }
  }
  const cerradas = await otrasSesiones(authId, miSesion)
  try {
    await auth.api.changePassword({
      body: { currentPassword: r.data.actual, newPassword: r.data.nueva, revokeOtherSessions: true },
      headers: await headers(),
    })
  } catch (e) {
    if (e instanceof APIError) {
      if (e.status === "TOO_MANY_REQUESTS") return { ok: false, mensaje: t.demasiados }
      return { ok: false, mensaje: t.claveActualMal, errores: { actual: t.claveActualMal } }
    }
    throw e
  }
  await db.insert(auditoria).values({ usuarioId: yo, accion: "usuario.cambiar-clave", tabla: "usuarios", filaId: yo, detalle: { sesionesCerradas: cerradas } })
  revalidatePath("/cuenta")
  return { ok: true, datos: { cerradas } }
}

/** Cierra una sesión propia que no es la que está en uso: «Cerrar» en la fila de un dispositivo. */
export async function cerrarMiSesion(id: string): Promise<Resultado<{ cerradas: number }>> {
  let yo: string
  let authId: string
  let miSesion: string
  try {
    const g = await exigirEscritura("proyectos.ver")
    yo = g.usuario.id
    authId = g.sesion.user.id
    miSesion = g.sesion.session.id
  } catch (e) {
    return rechazo(e)
  }
  if (!esUuid(String(id))) return { ok: false, mensaje: t.sesionInvalida }
  if (id === miSesion) return { ok: false, mensaje: t.estaNo }
  const cerradas = await cerrarSesionPropia(authId, id, miSesion)
  if (cerradas) await db.insert(auditoria).values({ usuarioId: yo, accion: "usuario.cerrar-sesion", tabla: "usuarios", filaId: yo })
  revalidatePath("/cuenta")
  return { ok: true, datos: { cerradas } }
}

/** «Cerrar las demás»: todas las sesiones propias menos la que está en uso. */
export async function cerrarMisOtrasSesiones(): Promise<Resultado<{ cerradas: number }>> {
  let yo: string
  let authId: string
  let miSesion: string
  try {
    const g = await exigirEscritura("proyectos.ver")
    yo = g.usuario.id
    authId = g.sesion.user.id
    miSesion = g.sesion.session.id
  } catch (e) {
    return rechazo(e)
  }
  const cerradas = await cerrarOtrasSesiones(authId, miSesion)
  if (cerradas) await db.insert(auditoria).values({ usuarioId: yo, accion: "usuario.cerrar-otras-sesiones", tabla: "usuarios", filaId: yo, detalle: { sesionesCerradas: cerradas } })
  revalidatePath("/cuenta")
  return { ok: true, datos: { cerradas } }
}
