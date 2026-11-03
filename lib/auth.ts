import "server-only"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"
import { twoFactor } from "better-auth/plugins/two-factor"
import { and, count, eq, gte, sql } from "drizzle-orm"
import { db } from "@/db"
import { authAccount, authRateLimit, authSession, authTwoFactor, authUser, authVerification, intentosIngreso, usuarios } from "@/db/schema"
import { CONTRASENA_MAX, CONTRASENA_MIN } from "./contrasena"
import { EMISOR_TOTP } from "./marca"

const QUINCE_MINUTOS = 15 * 60
const INTENTOS_POR_CUENTA = 5
const MENSAJE_GENERICO = "Email o contraseña incorrectos"

const baseURL = process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)

export const auth = betterAuth({
  appName: EMISOR_TOTP,
  baseURL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
      twoFactor: authTwoFactor,
      rateLimit: authRateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // sin registro público (D-002)
    minPasswordLength: CONTRASENA_MIN,
    maxPasswordLength: CONTRASENA_MAX,
    autoSignIn: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // vida máxima: 30 días
    updateAge: 60 * 60 * 24, // se renueva como mucho una vez por día
    cookieCache: { enabled: false }, // sin caché en la cookie: una cuenta desactivada se corta en el próximo pedido
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: QUINCE_MINUTOS, max: 5 },
      "/two-factor/verify-totp": { window: QUINCE_MINUTOS, max: 5 },
      "/two-factor/verify-backup-code": { window: QUINCE_MINUTOS, max: 5 },
      "/two-factor/enable": { window: QUINCE_MINUTOS, max: 10 },
      "/change-password": { window: QUINCE_MINUTOS, max: 10 },
    },
  },
  advanced: {
    cookiePrefix: "portal",
    database: { generateId: () => crypto.randomUUID() },
  },
  databaseHooks: {
    session: {
      create: {
        // Una cuenta desactivada no recibe sesión, por ningún camino.
        before: async (sesion) => {
          const [u] = await db.select({ activo: usuarios.activo }).from(usuarios).where(eq(usuarios.authUserId, sesion.userId)).limit(1)
          if (!u?.activo) return false
        },
      },
    },
  },
  hooks: {
    // Límite por cuenta (el de la IP lo lleva rateLimit): 5 intentos cada 15 minutos.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return
      const email = String((ctx.body as { email?: unknown } | undefined)?.email ?? "").trim().toLowerCase()
      if (!email) return
      const desde = sql`now() - interval '15 minutes'`
      const [fila] = await db
        .select({ n: count() })
        .from(intentosIngreso)
        .where(and(eq(intentosIngreso.emailClave, email), gte(intentosIngreso.creadoEn, desde)))
      if ((fila?.n ?? 0) >= INTENTOS_POR_CUENTA) {
        throw new APIError("TOO_MANY_REQUESTS", { message: "Demasiados intentos. Esperá 15 minutos y probá de nuevo." })
      }
      await db.insert(intentosIngreso).values({ emailClave: email })
      // Una cuenta desactivada recibe el mismo mensaje que una contraseña mal (no se revela que existe).
      const [u] = await db.select({ activo: usuarios.activo }).from(usuarios).where(sql`lower(${usuarios.email}) = ${email}`).limit(1)
      if (u && !u.activo) throw new APIError("UNAUTHORIZED", { message: MENSAJE_GENERICO })
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return
      const devuelto = ctx.context.returned
      if (devuelto instanceof APIError) {
        // Mismo mensaje exista o no la cuenta (docs/reglas/10 §2.3).
        if (devuelto.status === "UNAUTHORIZED" || devuelto.status === "FORBIDDEN") throw new APIError("UNAUTHORIZED", { message: MENSAJE_GENERICO })
        return
      }
      const email = String((ctx.body as { email?: unknown } | undefined)?.email ?? "").trim().toLowerCase()
      if (email) await db.delete(intentosIngreso).where(eq(intentosIngreso.emailClave, email))
    }),
  },
  plugins: [
    twoFactor({
      issuer: EMISOR_TOTP,
      backupCodeOptions: { amount: 10 },
    }),
    nextCookies(), // siempre el último
  ],
})

export type Sesion = typeof auth.$Infer.Session
