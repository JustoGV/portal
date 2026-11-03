// Datos de muestra para mirar las pantallas (docs/reglas/11 §7), SOLO contra una base local de prueba.
// Crea dos cuentas de prueba con el primer ingreso hecho, grupos y proyectos marcados "Muestra"
// (links a example.com, que no es de nadie), y una sesión para la primera cuenta: escribe la cookie
// firmada en el archivo que se le pasa (fuera del repo), así nadie escribe contraseñas en un navegador
// (docs/reglas/12 §3). Uso: pnpm exec tsx --conditions=react-server scripts/sembrar-prueba.ts <archivo-cookie>
import { createHmac } from "node:crypto"
import { writeFileSync } from "node:fs"

const url = process.env.DATABASE_URL ?? ""
const host = (() => {
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
})()
if (!["localhost", "127.0.0.1"].includes(host)) {
  console.error("Este script solo corre contra una base local de prueba.")
  process.exit(1)
}
const secreto = process.env.BETTER_AUTH_SECRET
const salida = process.argv[2]
if (!secreto || !salida) {
  console.error("Uso: sembrar-prueba.ts <archivo-cookie> (con BETTER_AUTH_SECRET en el entorno)")
  process.exit(1)
}

const { db } = await import("@/db")
const s = await import("@/db/schema")
const { auth } = await import("@/lib/auth")
const { crearCuentaInterna } = await import("@/dal/cuentas")
const { eq, sql } = await import("drizzle-orm")

const cuenta = async (nombre: string, email: string) => {
  const [ya] = await db.select().from(s.usuarios).where(eq(s.usuarios.email, email)).limit(1)
  const u = ya ?? (await crearCuentaInterna(nombre, email)).usuario
  await db.update(s.usuarios).set({ debeCambiarClave: false, activo: true }).where(eq(s.usuarios.id, u.id))
  await db.update(s.authUser).set({ twoFactorEnabled: true }).where(eq(s.authUser.id, u.authUserId))
  return u
}

const yo = await cuenta("Cuenta de prueba", "prueba@example.com")
await cuenta("Socio de prueba", "socio@example.com")

const nombresGrupos = ["Clientes", "Internos", "Paneles de admin", "Muestra archivado"]
for (const nombre of nombresGrupos) await db.insert(s.grupos).values({ nombre }).onConflictDoNothing({ target: s.grupos.nombreClave })
await db.update(s.grupos).set({ archivadoEn: sql`now()` }).where(eq(s.grupos.nombre, "Muestra archivado"))
const grupos = await db.select().from(s.grupos)
const id = (n: string) => grupos.find((g) => g.nombre === n)!.id

const ya = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(s.proyectos)
if ((ya[0]?.n ?? 0) === 0) {
  const filas = Array.from({ length: 34 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0")
    const g = i % 5 === 0 ? null : i % 3 === 0 ? id("Paneles de admin") : i % 2 === 0 ? id("Clientes") : id("Internos")
    return {
      nombre: `Proyecto de muestra ${n}`,
      url: `https://example.com/muestra-${n}`,
      descripcion: "Muestra",
      grupoId: g,
      creadoPor: yo.id,
      ...(i >= 31 ? { archivadoEn: sql`now()`, archivadoPor: yo.id } : {}),
    }
  })
  await db.insert(s.proyectos).values(filas)
}

// Sesión de la cuenta de prueba, con la cookie firmada como la firma better-auth (HMAC-SHA256, base64).
const ctx = await auth.$context
const sesion = await ctx.internalAdapter.createSession(yo.authUserId)
const firma = createHmac("sha256", secreto).update(sesion.token).digest("base64")
writeFileSync(salida, JSON.stringify({ nombre: "portal.session_token", valor: encodeURIComponent(`${sesion.token}.${firma}`) }))

// Comprobación: la cookie abre una sesión de verdad.
const probada = await auth.api.getSession({ headers: new Headers({ cookie: `portal.session_token=${encodeURIComponent(`${sesion.token}.${firma}`)}` }) })
console.log(probada ? "Muestra cargada y sesión de prueba lista." : "La sesión de prueba NO funcionó.")
process.exit(probada ? 0 : 1)
