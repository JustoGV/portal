import "server-only"
import { and, asc, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm"
import { db } from "@/db"
import { auditoria, authAccount, authSession, authTwoFactor, authUser, usuarios } from "@/db/schema"
import { auth } from "@/lib/auth"
import { contrasenaInicial } from "@/lib/contrasena"
import type { DetalleUsuario, FilaUsuario, MiCuenta } from "@/lib/cuenta"
import { leerDispositivo, nombreDispositivo } from "@/lib/dispositivo"
import { POR_PAGINA_USUARIOS, type OrdenUsuarios, type VistaUsuarios } from "@/lib/parametros"
import { escaparLike } from "@/lib/texto"

/**
 * Crea una cuenta con una contraseña inicial al azar, sin registro público: por la API interna de
 * better-auth. La contraseña se devuelve UNA vez a quien la creó; no se guarda en ningún otro lado.
 */
export const crearCuentaInterna = async (nombre: string, email: string) => {
  const ctx = await auth.$context
  const clave = contrasenaInicial()
  const hash = await ctx.password.hash(clave)
  const user = await ctx.internalAdapter.createUser({ name: nombre, email, emailVerified: true }, { method: "admin" })
  try {
    await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: hash })
    const [u] = await db.insert(usuarios).values({ authUserId: user.id, nombre, email }).returning()
    return { usuario: u!, clave }
  } catch (e) {
    await ctx.internalAdapter.deleteUser(user.id).catch(() => {})
    throw e
  }
}

/** ¿Hay al menos una cuenta? Sin ninguna, el login manda a /configurar (D-015). */
export const hayCuentas = async () => {
  const [fila] = await db.select({ id: usuarios.id }).from(usuarios).limit(1)
  return Boolean(fila)
}

/**
 * La primera cuenta, con la contraseña que elige la persona (D-015). Todo en una transacción con un
 * candado de Postgres: dos pedidos al mismo tiempo no crean dos cuentas, y si ya hay una devuelve null.
 */
export const crearPrimeraCuenta = async (nombre: string, email: string, clave: string) => {
  const ctx = await auth.$context
  const hash = await ctx.password.hash(clave)
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('portal.primera-cuenta'))`)
    const [existe] = await tx.select({ id: usuarios.id }).from(usuarios).limit(1)
    if (existe) return null
    const authId = crypto.randomUUID()
    const ahora = new Date()
    await tx.insert(authUser).values({ id: authId, name: nombre, email, emailVerified: true, createdAt: ahora, updatedAt: ahora })
    await tx.insert(authAccount).values({ id: crypto.randomUUID(), userId: authId, providerId: "credential", accountId: authId, password: hash, createdAt: ahora, updatedAt: ahora })
    const [u] = await tx.insert(usuarios).values({ authUserId: authId, nombre, email, debeCambiarClave: false }).returning()
    await tx.insert(auditoria).values({ usuarioId: u!.id, accion: "usuario.crear-primera-cuenta", tabla: "usuarios", filaId: u!.id })
    return u!
  })
}

/**
 * Contraseña inicial nueva: cierra todas sus sesiones y le borra el segundo factor (el caso típico es
 * un celular perdido). La persona vuelve a pasar por /primer-ingreso.
 */
export const restablecerCuenta = async (usuarioId: string) => {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1)
  if (!u) return null
  const ctx = await auth.$context
  const clave = contrasenaInicial()
  const hash = await ctx.password.hash(clave)
  await ctx.internalAdapter.updatePassword(u.authUserId, hash)
  await ctx.internalAdapter.deleteUserSessions(u.authUserId)
  await db.transaction(async (tx) => {
    await tx.delete(authTwoFactor).where(eq(authTwoFactor.userId, u.authUserId))
    await tx.update(authUser).set({ twoFactorEnabled: false }).where(eq(authUser.id, u.authUserId))
    await tx.update(usuarios).set({ debeCambiarClave: true }).where(eq(usuarios.id, u.id))
  })
  return { usuario: u, clave }
}

// ---------- La pantalla Usuarios (D-034). Quien llama ya pasó por el guard `usuarios.gestionar`. ----------

export type FiltroUsuarios = { q: string; ver: VistaUsuarios; orden: OrdenUsuarios; pagina: number }

/** Sesiones que siguen sirviendo: las vencidas quedan en la tabla hasta que better-auth las limpia. */
const vigente = sql`${authSession.expiresAt} > now()`
const ultimoIngreso = sql<string | null>`(select max(s.created_at)::text from auth_session s where s.user_id = ${usuarios.authUserId})`
const sesionesAbiertas = sql<number>`(select count(*)::int from auth_session s where s.user_id = ${usuarios.authUserId} and s.expires_at > now())`
const conFactor = sql<boolean>`coalesce(${authUser.twoFactorEnabled}, false)`

const condicionVista = (ver: VistaUsuarios): SQL | undefined => {
  if (ver === "activas") return eq(usuarios.activo, true)
  if (ver === "primer-ingreso") return and(eq(usuarios.activo, true), eq(usuarios.debeCambiarClave, true))
  if (ver === "sin-factor") return and(eq(usuarios.activo, true), sql`not ${conFactor}`)
  if (ver === "desactivadas") return eq(usuarios.activo, false)
  return undefined
}

/** Busca por nombre o mail, sin importar mayúsculas; el texto se escapa para LIKE. */
const condicionBusqueda = (q: string): SQL | undefined => {
  if (!q) return undefined
  const patron = `%${escaparLike(q)}%`
  return or(ilike(usuarios.nombre, patron), ilike(usuarios.email, patron))
}

const ordenDe = (o: OrdenUsuarios): SQL[] => {
  const nombre = sql`lower(${usuarios.nombre}) collate "es-x-icu"`
  if (o === "ingreso") return [sql`${ultimoIngreso} desc nulls last`, nombre]
  if (o === "nuevas") return [desc(usuarios.creadoEn), nombre]
  return [nombre, asc(usuarios.id)]
}

export const listarUsuarios = async (yo: string, f: FiltroUsuarios): Promise<{ filas: FilaUsuario[]; total: number }> => {
  const donde = and(condicionVista(f.ver), condicionBusqueda(f.q))
  const [filas, [cuenta]] = await Promise.all([
    db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        activo: usuarios.activo,
        segundoFactor: conFactor,
        debeCambiarClave: usuarios.debeCambiarClave,
        creadoEn: sql<string>`${usuarios.creadoEn}::text`,
        ultimoIngreso,
        sesiones: sesionesAbiertas,
      })
      .from(usuarios)
      .innerJoin(authUser, eq(authUser.id, usuarios.authUserId))
      .where(donde)
      .orderBy(...ordenDe(f.orden))
      .limit(POR_PAGINA_USUARIOS)
      .offset((f.pagina - 1) * POR_PAGINA_USUARIOS),
    db.select({ n: sql<number>`count(*)::int` }).from(usuarios).innerJoin(authUser, eq(authUser.id, usuarios.authUserId)).where(donde),
  ])
  return { filas: filas.map((u) => ({ ...u, esYo: u.id === yo })), total: cuenta?.n ?? 0 }
}

/** Las cuatro cifras de arriba: se cuentan en una sola lectura. */
export const cifrasUsuarios = async () => {
  const [c] = await db
    .select({
      activas: sql<number>`count(*) filter (where ${usuarios.activo})::int`,
      primerIngreso: sql<number>`count(*) filter (where ${usuarios.activo} and ${usuarios.debeCambiarClave})::int`,
      sinFactor: sql<number>`count(*) filter (where ${usuarios.activo} and not ${conFactor})::int`,
      desactivadas: sql<number>`count(*) filter (where not ${usuarios.activo})::int`,
    })
    .from(usuarios)
    .innerJoin(authUser, eq(authUser.id, usuarios.authUserId))
  return c ?? { activas: 0, primerIngreso: 0, sinFactor: 0, desactivadas: 0 }
}

/** Lo que muestra la ficha además de la fila: sus sesiones abiertas y sus últimos cinco movimientos. */
export const detalleUsuario = async (usuarioId: string, miSesion: string | null): Promise<DetalleUsuario | null> => {
  const [u] = await db.select({ authUserId: usuarios.authUserId }).from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1)
  if (!u) return null
  // Con el nombre de la tabla escrito: en una lectura de una sola tabla Drizzle lo omite (G-012).
  // Quién lo hizo, salvo que haya sido la misma persona («Eligió su contraseña», no «… por ella misma»).
  const quien = sql<string | null>`(select q.nombre from usuarios q where q.id = auditoria.usuario_id and auditoria.usuario_id is distinct from auditoria.fila_id)`
  const [sesiones, movimientos] = await Promise.all([
    db
      .select({ id: authSession.id, userAgent: authSession.userAgent, creada: authSession.createdAt, usada: authSession.updatedAt })
      .from(authSession)
      .where(and(eq(authSession.userId, u.authUserId), vigente))
      .orderBy(desc(authSession.updatedAt))
      .limit(10),
    db
      .select({ id: auditoria.id, accion: auditoria.accion, cuando: sql<string>`${auditoria.creadoEn}::text`, quien })
      .from(auditoria)
      .where(and(eq(auditoria.tabla, "usuarios"), eq(auditoria.filaId, usuarioId)))
      .orderBy(desc(auditoria.creadoEn), desc(auditoria.id))
      .limit(5),
  ])
  return {
    sesiones: sesiones.map((s) => {
      const d = leerDispositivo(s.userAgent)
      return { id: s.id, dispositivo: nombreDispositivo(s.userAgent), movil: d.movil, abierta: s.creada.toISOString(), usada: s.usada.toISOString(), esEsta: s.id === miSesion }
    }),
    movimientos,
  }
}

// ---------- Mi cuenta (WU-06 pantalla 6, D-035). La cuenta sale siempre de la sesión de quien pide. ----------

export const miCuenta = async (usuarioId: string, miSesion: string): Promise<MiCuenta | null> => {
  const [[u], d] = await Promise.all([
    db
      .select({ id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email, segundoFactor: conFactor, creadoEn: sql<string>`${usuarios.creadoEn}::text` })
      .from(usuarios)
      .innerJoin(authUser, eq(authUser.id, usuarios.authUserId))
      .where(eq(usuarios.id, usuarioId))
      .limit(1),
    detalleUsuario(usuarioId, miSesion),
  ])
  if (!u || !d) return null
  // La sesión en uso va primero; las demás, de la usada más recién a la más vieja.
  const sesiones = [...d.sesiones].sort((a, b) => Number(b.esEsta) - Number(a.esEsta))
  return { ...u, sesiones, movimientos: d.movimientos }
}

/**
 * Cierra una sesión propia (ASVS 7.4.1): se borra de la base y deja de servir en el próximo pedido (sin caché
 * en la cookie, lib/auth.ts). Solo si es de esta cuenta y no es la que está en uso. Devuelve cuántas cerró.
 */
export const cerrarSesionPropia = async (authUserId: string, sesionId: string, miSesion: string) => {
  if (sesionId === miSesion) return 0
  const r = await db
    .delete(authSession)
    .where(and(eq(authSession.id, sesionId), eq(authSession.userId, authUserId), vigente))
    .returning({ id: authSession.id })
  return r.length
}

/** Cierra todas las sesiones propias menos la que está en uso. Devuelve cuántas cerró. */
export const cerrarOtrasSesiones = async (authUserId: string, miSesion: string) => {
  const r = await db
    .delete(authSession)
    .where(and(eq(authSession.userId, authUserId), ne(authSession.id, miSesion), vigente))
    .returning({ id: authSession.id })
  return r.length
}

/** Cuántas sesiones abiertas tiene una cuenta además de la que está en uso. */
export const otrasSesiones = async (authUserId: string, miSesion: string) => {
  const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(authSession).where(and(eq(authSession.userId, authUserId), ne(authSession.id, miSesion), vigente))
  return c?.n ?? 0
}

/** Cierra todas las sesiones de una cuenta (ASVS 7.4.2 y 7.4.5). Devuelve cuántas cerró. */
export const cerrarSesionesDe = async (authUserId: string) => {
  const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(authSession).where(and(eq(authSession.userId, authUserId), vigente))
  const ctx = await auth.$context
  await ctx.internalAdapter.deleteUserSessions(authUserId)
  return c?.n ?? 0
}
