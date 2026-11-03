"use server"
import { APIError } from "better-auth/api"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { db } from "@/db"
import { auditoria, usuarios } from "@/db/schema"
import { sesion, usuarioPorAuthId } from "@/dal/sesion"
import { comun } from "@/i18n/es/comun"
import { erroresPorCampo, type EstadoFormulario, type Resultado } from "@/lib/acciones"
import { auth } from "@/lib/auth"
import { esquemaClaveNueva, MENSAJES_CUENTA } from "@/lib/cuenta"

/**
 * Cambiar la contraseña inicial (docs/reglas/10 §2.6). Pide sesión pero no el segundo factor, porque
 * es justamente el paso anterior a activarlo.
 */
export async function cambiarClaveInicial(_: EstadoFormulario, datos: FormData): Promise<Resultado> {
  const s = await sesion()
  if (!s) return { ok: false, mensaje: comun.sesionVencida, sesion: "vencida" }
  const u = await usuarioPorAuthId(s.user.id)
  if (!u || !u.activo) return { ok: false, mensaje: comun.sesionVencida, sesion: "vencida" }
  if (!u.debeCambiarClave) return { ok: true }

  const r = esquemaClaveNueva.safeParse(Object.fromEntries(datos))
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }

  try {
    await auth.api.changePassword({
      body: { currentPassword: r.data.actual, newPassword: r.data.nueva, revokeOtherSessions: true },
      headers: await headers(),
    })
  } catch (e) {
    if (e instanceof APIError) {
      if (e.status === "TOO_MANY_REQUESTS") return { ok: false, mensaje: "Demasiados intentos. Esperá 15 minutos y probá de nuevo." }
      return { ok: false, mensaje: MENSAJES_CUENTA.claveActualMal, errores: { actual: MENSAJES_CUENTA.claveActualMal } }
    }
    throw e
  }
  await db.update(usuarios).set({ debeCambiarClave: false }).where(eq(usuarios.id, u.id))
  await db.insert(auditoria).values({ usuarioId: u.id, accion: "usuario.cambiar-clave-inicial", tabla: "usuarios", filaId: u.id })
  return { ok: true }
}
