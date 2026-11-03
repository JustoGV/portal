"use server"
import { crearPrimeraCuenta } from "@/dal/cuentas"
import { exigirSinCuentas } from "@/dal/guard"
import { comun } from "@/i18n/es/comun"
import { primeraCuenta as t } from "@/i18n/es/ingreso"
import { erroresPorCampo, type EstadoFormulario, type Resultado } from "@/lib/acciones"
import { AuthError } from "@/lib/auth-error"
import { esquemaPrimeraCuenta, MENSAJES_CUENTA } from "@/lib/cuenta"
import { codigoPg } from "@/lib/errores"

/**
 * Crear la primera cuenta desde la web (D-015). No hay sesión que pedir: no existe nadie todavía. El
 * guard es que la base no tenga ninguna cuenta, y crearPrimeraCuenta lo vuelve a mirar bajo candado.
 */
export async function crearPrimera(_: EstadoFormulario, datos: FormData): Promise<Resultado> {
  try {
    await exigirSinCuentas()
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, mensaje: t.yaExiste }
    throw e
  }
  const r = esquemaPrimeraCuenta.safeParse(Object.fromEntries(datos))
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  try {
    const u = await crearPrimeraCuenta(r.data.nombre, r.data.email, r.data.clave)
    if (!u) return { ok: false, mensaje: t.yaExiste }
    return { ok: true }
  } catch (e) {
    if (codigoPg(e) === "23505") return { ok: false, mensaje: MENSAJES_CUENTA.emailRepetido, errores: { email: MENSAJES_CUENTA.emailRepetido } }
    throw e
  }
}
