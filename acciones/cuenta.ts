"use server"
import { APIError } from "better-auth/api"
import { and, count, eq, gte, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { db } from "@/db"
import { auditoria, intentosIngreso, usuarios } from "@/db/schema"
import { cerrarOtrasSesiones, cerrarSesionPropia, otrasSesiones } from "@/dal/cuentas"
import { exigirEscritura } from "@/dal/guard"
import { comun } from "@/i18n/es/comun"
import { cuenta as t } from "@/i18n/es/cuenta"
import { erroresPorCampo, rechazo, type EstadoFormulario, type Resultado } from "@/lib/acciones"
import { auth } from "@/lib/auth"
import { claveIntentosFactor, esquemaClaveFactor, esquemaClaveNueva, esquemaMiNombre, FACTOR_INTENTOS, secretoDeUri } from "@/lib/cuenta"
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

// ---------- El segundo factor (D-044) ----------
// Las llamadas a auth.api desde el servidor no pasan por el límite de lib/auth.ts (ese corre en la ruta
// /api/auth): por eso cada equivocación de contraseña o de código se anota acá, 5 cada 15 minutos por cuenta.
// La contraseña y el código llegan dentro de un FormData y no como texto suelto: en desarrollo, Next anota
// en la consola los argumentos de cada acción.

const intentosFactor = async (usuarioId: string) => {
  const [f] = await db
    .select({ n: count() })
    .from(intentosIngreso)
    .where(and(eq(intentosIngreso.emailClave, claveIntentosFactor(usuarioId)), gte(intentosIngreso.creadoEn, sql`now() - interval '15 minutes'`)))
  return f?.n ?? 0
}
const anotarFallo = (usuarioId: string) => db.insert(intentosIngreso).values({ emailClave: claveIntentosFactor(usuarioId) })
const limpiarFallos = (usuarioId: string) => db.delete(intentosIngreso).where(eq(intentosIngreso.emailClave, claveIntentosFactor(usuarioId)))

type Guardia = { yo: string; authId: string; miSesion: string; conFactor: boolean }
const datosDe = (g: Awaited<ReturnType<typeof exigirEscritura>>): Guardia => ({
  yo: g.usuario.id,
  authId: g.sesion.user.id,
  miSesion: g.sesion.session.id,
  conFactor: !!g.sesion.user.twoFactorEnabled,
})

/** Paso 1 de «Activar»: con la contraseña, la clave nueva (para el QR) y los 10 códigos de respaldo. Todavía no queda activo. */
export async function empezarFactor(datos: FormData): Promise<Resultado<{ uri: string; secreto: string; codigos: string[] }>> {
  let g: Guardia
  try {
    g = datosDe(await exigirEscritura("proyectos.ver"))
  } catch (e) {
    return rechazo(e)
  }
  if (g.conFactor) return { ok: false, mensaje: t.factorYaActivo }
  const r = esquemaClaveFactor.safeParse({ clave: datos.get("clave") })
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  if ((await intentosFactor(g.yo)) >= FACTOR_INTENTOS) return { ok: false, mensaje: t.demasiados }
  let alta: { totpURI: string; backupCodes: string[] }
  try {
    const d = await auth.api.enableTwoFactor({ body: { password: r.data.clave, method: "totp" }, headers: await headers() })
    if (d.method !== "totp") throw new Error("Se pidió el factor por app y volvió otro")
    alta = d
  } catch (e) {
    if (e instanceof APIError) {
      await anotarFallo(g.yo)
      return { ok: false, mensaje: t.factorClaveMal, errores: { clave: t.factorClaveMal } }
    }
    throw e
  }
  const secreto = secretoDeUri(alta.totpURI)
  if (!secreto) throw new Error("La dirección del segundo factor no trae la clave")
  return { ok: true, datos: { uri: alta.totpURI, secreto, codigos: alta.backupCodes } }
}

/**
 * Paso 2 de «Activar», después de que el navegador verificó el código contra /api/auth/two-factor/verify-totp
 * (como en el ingreso: ese camino tiene su límite de 5 cada 15 minutos en lib/auth.ts). Se verifica por ahí
 * y no desde una acción porque better-auth cambia la cookie de la sesión al activar, y una cookie cambiada
 * dentro de una acción hace que Next vuelva a dibujar la página y se pierdan los códigos de respaldo.
 * Esta acción comprueba que el factor quedó activo, cierra las demás sesiones (ASVS 7.4.3) y lo anota.
 */
export async function confirmarFactor(): Promise<Resultado<{ cerradas: number }>> {
  let g: Guardia
  try {
    g = datosDe(await exigirEscritura("proyectos.ver"))
  } catch (e) {
    return rechazo(e)
  }
  if (!g.conFactor) return { ok: false, mensaje: t.factorNoActivo }
  await limpiarFallos(g.yo)
  const cerradas = await cerrarOtrasSesiones(g.authId, g.miSesion)
  await db.insert(auditoria).values({ usuarioId: g.yo, accion: "usuario.activar-factor", tabla: "usuarios", filaId: g.yo, detalle: { sesionesCerradas: cerradas } })
  return { ok: true, datos: { cerradas } }
}

/** «Códigos nuevos»: con la contraseña, 10 códigos nuevos; los anteriores dejan de servir. */
export async function codigosNuevos(datos: FormData): Promise<Resultado<{ codigos: string[] }>> {
  let g: Guardia
  try {
    g = datosDe(await exigirEscritura("proyectos.ver"))
  } catch (e) {
    return rechazo(e)
  }
  if (!g.conFactor) return { ok: false, mensaje: t.factorNoActivo }
  const r = esquemaClaveFactor.safeParse({ clave: datos.get("clave") })
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  if ((await intentosFactor(g.yo)) >= FACTOR_INTENTOS) return { ok: false, mensaje: t.demasiados }
  let codigos: string[]
  try {
    codigos = (await auth.api.generateBackupCodes({ body: { password: r.data.clave }, headers: await headers() })).backupCodes
  } catch (e) {
    if (e instanceof APIError) {
      await anotarFallo(g.yo)
      return { ok: false, mensaje: t.factorClaveMal, errores: { clave: t.factorClaveMal } }
    }
    throw e
  }
  await limpiarFallos(g.yo)
  await db.insert(auditoria).values({ usuarioId: g.yo, accion: "usuario.codigos-nuevos", tabla: "usuarios", filaId: g.yo })
  return { ok: true, datos: { codigos } }
}

/** «Desactivar»: con la contraseña. Desde ese momento se entra solo con la contraseña. */
export async function quitarFactor(datos: FormData): Promise<Resultado> {
  let g: Guardia
  try {
    g = datosDe(await exigirEscritura("proyectos.ver"))
  } catch (e) {
    return rechazo(e)
  }
  if (!g.conFactor) return { ok: false, mensaje: t.factorNoActivo }
  const r = esquemaClaveFactor.safeParse({ clave: datos.get("clave") })
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  if ((await intentosFactor(g.yo)) >= FACTOR_INTENTOS) return { ok: false, mensaje: t.demasiados }
  try {
    await auth.api.disableTwoFactor({ body: { password: r.data.clave }, headers: await headers() })
  } catch (e) {
    if (e instanceof APIError) {
      await anotarFallo(g.yo)
      return { ok: false, mensaje: t.factorClaveMal, errores: { clave: t.factorClaveMal } }
    }
    throw e
  }
  await limpiarFallos(g.yo)
  await db.insert(auditoria).values({ usuarioId: g.yo, accion: "usuario.desactivar-factor", tabla: "usuarios", filaId: g.yo })
  revalidatePath("/", "layout")
  return { ok: true }
}
