import "server-only"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { authTwoFactor, authUser, usuarios } from "@/db/schema"
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
