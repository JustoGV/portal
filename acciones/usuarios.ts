"use server"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { auditoria, configuracion, usuarios } from "@/db/schema"
import { cerrarSesionesDe, crearCuentaInterna, detalleUsuario, restablecerCuenta } from "@/dal/cuentas"
import { exigir, exigirEscritura } from "@/dal/guard"
import { comun } from "@/i18n/es/comun"
import { erroresPorCampo, rechazo, type EstadoFormulario, type Resultado } from "@/lib/acciones"
import { esquemaCuenta, esquemaEditarCuenta, esquemaInactividad, MENSAJES_CUENTA, OPCIONES_INACTIVIDAD, type DetalleUsuario } from "@/lib/cuenta"
import { codigoPg } from "@/lib/errores"
import { dominioDe } from "@/lib/mail"
import { dominioDeMail } from "@/lib/mail-dominio"
import { esUuid } from "@/lib/parametros"

// Toda función exportada desde acá es una acción pública: todas empiezan por el guard (docs/reglas/10 §3).

type Alta = { id: string; nombre: string; email: string; clave: string }

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
  // El mail es con lo que la persona va a entrar: si su dominio no recibe correo, está mal escrito (D-034).
  if ((await dominioDeMail(email)) === "no-recibe") {
    const mensaje = MENSAJES_CUENTA.emailSinCorreo(dominioDe(email))
    return { ok: false, mensaje, errores: { email: mensaje } }
  }
  try {
    const { usuario, clave } = await crearCuentaInterna(nombre, email)
    await db.insert(auditoria).values({ usuarioId: yo, accion: "usuario.crear", tabla: "usuarios", filaId: usuario.id, detalle: { nombre } })
    revalidatePath("/usuarios")
    return { ok: true, datos: { id: usuario.id, nombre, email, clave } }
  } catch (e) {
    if (codigoPg(e) === "23505") return { ok: false, mensaje: MENSAJES_CUENTA.emailRepetido, errores: { email: MENSAJES_CUENTA.emailRepetido } }
    throw e
  }
}

/** Cambia el nombre de una cuenta. El mail no se cambia: es con lo que se entra. */
export async function editarCuenta(_: EstadoFormulario<{ nombre: string }>, datos: FormData): Promise<Resultado<{ id: string; nombre: string }>> {
  let yo: string
  try {
    yo = (await exigirEscritura("usuarios.gestionar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  const r = esquemaEditarCuenta.safeParse(Object.fromEntries(datos))
  if (!r.success) return { ok: false, mensaje: comun.datoMalTexto, errores: erroresPorCampo(r.error.issues) }
  const [u] = await db.update(usuarios).set({ nombre: r.data.nombre, actualizadoEn: sql`now()` }).where(eq(usuarios.id, r.data.id)).returning({ id: usuarios.id, nombre: usuarios.nombre })
  if (!u) return { ok: false, mensaje: "Esa cuenta ya no existe." }
  await db.insert(auditoria).values({ usuarioId: yo, accion: "usuario.editar", tabla: "usuarios", filaId: u.id, detalle: { campos: ["nombre"] } })
  revalidatePath("/usuarios")
  revalidatePath("/", "layout")
  return { ok: true, datos: u }
}

/** Activa o desactiva. Desactivar además cierra todas sus sesiones (ASVS 7.4.2): no queda ninguna guardada. */
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
    const cerradas = activo ? 0 : await cerrarSesionesDe(u.authUserId)
    await db.insert(auditoria).values({ usuarioId: yo, accion: activo ? "usuario.activar" : "usuario.desactivar", tabla: "usuarios", filaId: u.id, detalle: activo ? null : { sesionesCerradas: cerradas } })
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

/** Cierra todas las sesiones de otra cuenta (ASVS 7.4.5). Sobre la propia no: para eso está «Salir». */
export async function cerrarSesiones(id: string): Promise<Resultado<{ nombre: string; cerradas: number }>> {
  let yo: string
  try {
    yo = (await exigirEscritura("usuarios.gestionar")).usuario.id
  } catch (e) {
    return rechazo(e)
  }
  if (!esUuid(String(id))) return { ok: false, mensaje: "Cuenta inválida" }
  if (id === yo) return { ok: false, mensaje: "Para cerrar tu propia sesión usá «Salir»." }
  const [u] = await db.select({ id: usuarios.id, nombre: usuarios.nombre, authUserId: usuarios.authUserId }).from(usuarios).where(eq(usuarios.id, id)).limit(1)
  if (!u) return { ok: false, mensaje: "Esa cuenta ya no existe." }
  const cerradas = await cerrarSesionesDe(u.authUserId)
  await db.insert(auditoria).values({ usuarioId: yo, accion: "usuario.cerrar-sesiones", tabla: "usuarios", filaId: u.id, detalle: { sesionesCerradas: cerradas } })
  revalidatePath("/usuarios")
  return { ok: true, datos: { nombre: u.nombre, cerradas } }
}

/** Lo que la ficha trae al abrirse: sesiones abiertas (sin la IP) y los últimos movimientos. Solo lee. */
export async function verDetalleUsuario(id: string): Promise<Resultado<DetalleUsuario>> {
  let sesionId: string | null
  try {
    sesionId = (await exigir("usuarios.gestionar")).sesion.session.id
  } catch (e) {
    return rechazo(e)
  }
  if (!esUuid(String(id))) return { ok: false, mensaje: "Cuenta inválida" }
  const d = await detalleUsuario(id, sesionId)
  return d ? { ok: true, datos: d } : { ok: false, mensaje: "Esa cuenta ya no existe." }
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
