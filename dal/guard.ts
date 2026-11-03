import "server-only"
import { sql } from "drizzle-orm"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { limitesEscritura } from "@/db/schema"
import { AuthError } from "@/lib/auth-error"
import { type Permiso, tienePermiso } from "@/lib/permisos"
import { hayCuentas } from "./cuentas"
import { sesion, usuarioPorAuthId } from "./sesion"

/**
 * El guard (docs/reglas/10 §3). Toda Server Action, todo route handler y toda página que lee datos
 * empieza por acá. Los permisos salen de la fila `usuarios`, nunca del pedido ni de la sesión.
 */
export const exigir = async (permiso: Permiso) => {
  const s = await sesion()
  if (!s) throw new AuthError("sin-sesion")
  const u = await usuarioPorAuthId(s.user.id)
  if (!u) throw new AuthError("sin-usuario")
  if (!u.activo) throw new AuthError("inactivo")
  // Sin segundo factor obligatorio (D-013): el primer ingreso es solo cambiar la contraseña inicial.
  if (u.debeCambiarClave) throw new AuthError("primer-ingreso-pendiente")
  if (!tienePermiso(u, permiso)) throw new AuthError("sin-permiso")
  return { usuario: u, sesion: s }
}

/**
 * El guard de /configurar (D-015): pasa solo mientras la base no tiene ninguna cuenta. Es el primer
 * filtro; el que decide es el candado de crearPrimeraCuenta, que vuelve a contar dentro de la transacción.
 */
export const exigirSinCuentas = async () => {
  if (await hayCuentas()) throw new AuthError("sin-permiso")
}

const ESCRITURAS_POR_MINUTO = 120

/** El guard de las acciones que escriben: además cuenta la escritura (docs/reglas/10 §4). */
export const exigirEscritura = async (permiso: Permiso) => {
  const r = await exigir(permiso)
  const [fila] = await db
    .insert(limitesEscritura)
    .values({ usuarioId: r.usuario.id, ventana: sql`date_trunc('minute', now())` })
    .onConflictDoUpdate({ target: [limitesEscritura.usuarioId, limitesEscritura.ventana], set: { cuenta: sql`${limitesEscritura.cuenta} + 1` } })
    .returning({ cuenta: limitesEscritura.cuenta })
  if ((fila?.cuenta ?? 0) > ESCRITURAS_POR_MINUTO) throw new AuthError("demasiadas-escrituras")
  return r
}

/** El guard de una página: convierte el rechazo en el lugar adonde ir. */
export const exigirPagina = async (permiso: Permiso, ruta: string) => {
  try {
    return await exigir(permiso)
  } catch (e) {
    if (!(e instanceof AuthError)) throw e
    if (e.motivo === "primer-ingreso-pendiente") redirect("/primer-ingreso")
    if (e.motivo === "sin-permiso") redirect("/")
    if (e.motivo === "inactivo") redirect("/ingresar?motivo=inactiva")
    redirect(`/ingresar?volver=${encodeURIComponent(ruta)}`)
  }
}
