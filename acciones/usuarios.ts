"use server"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { auditoria, configuracion, usuarios } from "@/db/schema"
import { crearCuentaInterna, restablecerCuenta } from "@/dal/cuentas"
import { exigirEscritura } from "@/dal/guard"
import { comun } from "@/i18n/es/comun"
import { erroresPorCampo, rechazo, type EstadoFormulario, type Resultado } from "@/lib/acciones"
import { esquemaCuenta, esquemaInactividad, MENSAJES_CUENTA, OPCIONES_INACTIVIDAD } from "@/lib/cuenta"
import { codigoPg } from "@/lib/errores"
import { esUuid } from "@/lib/parametros"

type Alta = { nombre: string; email: string; clave: string }

export async function crearCuenta(_: EstadoFormulario<Alta>, datos: FormData): Promise<Resultado<Alta>> {
  let yo: string
  try {
    yo = (await exigirEscritura("usuarios.gestionar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaCuenta.safeParse(Object.fromEntries(datos))
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  const { nombre, email } = r.data
  const [existe] = await db.select({ id: usuarios.id }).from(usuarios).where(sql`lower(${usuarios.email}) = ${email}`).limit(1)
  if (existe) return { ok: false, mensaje: MENSAJES_CUENTA.emailRepetido, errores: { email: MENSAJES_CUENTA.emailRepetido } }
  try {
    const { usuario, clave } = await crearCuentaInterna(nombre, email)
    await db.insert(auditoria).values({ usuarioId: yo, accion: "usuario.crear", tabla: "usuarios", filaId: usuario.id, detalle: { nombre } })
    revalidatePath("/usuarios")
    return { ok: true, datos: { nombre, email, clave } }
  } catch (e) {
    if (codigoPg(e) === "23505") return { ok: false, mensaje: MENSAJES_CUENTA.emailRepetido, errores: { email: MENSAJES_CUENTA.emailRepetido } }
    throw e
  }
}

export async function cambiarActivo(id: string, activo: boolean): Promise<Resultado<{ nombre: string }>> {
  let yo: string
  try {
    yo = (await exigirEscritura("usuarios.gestionar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  if (!esUuid(String(id)) || typeof activo !== "boolean") return { ok: false, mensaje: "Cuenta inválida" }
  if (id === yo && !activo) return { ok: false, mensaje: "No podés desactivar tu propia cuenta." }
  try {
    const [u] = await db.update(usuarios).set({ activo }).where(eq(usuarios.id, id)).returning({ id: usuarios.id, nombre: usuarios.nombre, authUserId: usuarios.authUserId })
    if (!u) return { ok: false, mensaje: "Esa cuenta ya no existe." }
    await db.insert(auditoria).values({ usuarioId: yo, accion: activo ? "usuario.activar" : "usuario.desactivar", tabla: "usuarios", filaId: u.id })
    revalidatePath("/usuarios")
    return { ok: true, datos: { nombre: u.nombre } }
  } catch (e) {
    if (codigoPg(e) === "P0001") return { ok: false, mensaje: "Tiene que quedar al menos una cuenta activa." }
    throw e
  }
}

export async function nuevaClaveInicial(id: string): Promise<Resultado<{ nombre: string; clave: string }>> {
  let yo: string
  try {
    yo = (await exigirEscritura("usuarios.gestionar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  if (!esUuid(String(id))) return { ok: false, mensaje: "Cuenta inválida" }
  if (id === yo) return { ok: false, mensaje: "Tu propia contraseña la cambiás vos. Para esto, pedíselo a tu socio." }
  const r = await restablecerCuenta(id)
  if (!r) return { ok: false, mensaje: "Esa cuenta ya no existe." }
  await db.insert(auditoria).values({ usuarioId: yo, accion: "usuario.clave-inicial", tabla: "usuarios", filaId: r.usuario.id })
  revalidatePath("/usuarios")
  return { ok: true, datos: { nombre: r.usuario.nombre, clave: r.clave } }
}

export async function guardarInactividad(_: EstadoFormulario, datos: FormData): Promise<Resultado> {
  let yo: string
  try {
    yo = (await exigirEscritura("configuracion.editar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaInactividad.safeParse(Object.fromEntries(datos))
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  const minutos = OPCIONES_INACTIVIDAD.find((o) => o.id === r.data.inactividad)!.minutos
  await db.update(configuracion).set({ inactividadMinutos: minutos, actualizadoPor: yo }).where(eq(configuracion.id, true))
  await db.insert(auditoria).values({ usuarioId: yo, accion: "configuracion.editar", tabla: "configuracion", detalle: { inactividadMinutos: minutos } })
  revalidatePath("/", "layout")
  return { ok: true }
}
