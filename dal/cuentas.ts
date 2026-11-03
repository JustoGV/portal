import "server-only"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { auditoria, authAccount, authTwoFactor, authUser, usuarios } from "@/db/schema"
import { auth } from "@/lib/auth"
import { contrasenaInicial } from "@/lib/contrasena"
import type { FilaUsuario } from "@/lib/cuenta"

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

export const listarUsuarios = async (yo: string): Promise<FilaUsuario[]> => {
  const filas = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      activo: usuarios.activo,
      segundoFactor: sql<boolean>`coalesce(${authUser.twoFactorEnabled}, false)`,
      debeCambiarClave: usuarios.debeCambiarClave,
      creadoEn: sql<string>`${usuarios.creadoEn}::text`,
    })
    .from(usuarios)
    .innerJoin(authUser, eq(authUser.id, usuarios.authUserId))
    .orderBy(sql`lower(${usuarios.nombre}) collate "es-x-icu"`, usuarios.id)
    .limit(200)
  return filas.map((f) => ({ ...f, esYo: f.id === yo }))
}
