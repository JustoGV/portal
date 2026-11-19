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
const socio = await cuenta("Socio de prueba", "socio@example.com")

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

// Tablero (D-040): tarjetas de muestra en las cuatro listas, creadas por la cuenta de prueba (así se borran
// juntas). Los títulos salen de la cola del cerebro; los comentarios son ilustrativos.
const yaTarjetas = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(s.tarjetas)
if ((yaTarjetas[0]?.n ?? 0) === 0) {
  const servicios = await db.select({ id: s.proyectos.id }).from(s.proyectos).limit(3)
  const sv = (i: number) => servicios[i]?.id ?? null
  const muestra: (typeof s.tarjetas.$inferInsert)[] = [
    { lista: "dudas", posicion: 0, titulo: "Leer y corregir los seis formularios de diagnóstico", descripcion: "No hay preguntas: que los lea y corrija lo que le parezca.", proyectoId: sv(0), prioridad: true, creadoPor: yo.id },
    { lista: "dudas", posicion: 1, titulo: "Las alertas del portal: ¿juntan las de cada sistema o son propias?", proyectoId: sv(1), creadoPor: yo.id },
    { lista: "servicios", posicion: 0, titulo: "Administración del relevamiento institucional de entidades de medicina privada", grupoId: id("Clientes"), responsableId: yo.id, creadoPor: yo.id, respuestas: [{ pregunta: "¿Quién lo va a usar?", respuesta: "El cliente" }] },
    { lista: "tareas", posicion: 0, titulo: "Cargar el IR‑03 en producción", proyectoId: sv(0), responsableId: yo.id, creadoPor: yo.id },
    { lista: "tareas", posicion: 1, titulo: "Acordar con Justo el reparto y el nombre visible", proyectoId: sv(2), responsableId: socio.id, creadoPor: yo.id },
    { lista: "correcciones", posicion: 0, titulo: "Cambiar «SSN» por «SSS» en seis archivos", responsableId: socio.id, creadoPor: yo.id },
  ]
  const creadas = await db.insert(s.tarjetas).values(muestra).returning({ id: s.tarjetas.id, titulo: s.tarjetas.titulo })
  const duda = creadas[0]!.id
  const [c1] = await db.insert(s.comentarios).values({ tarjetaId: duda, autorId: yo.id, texto: "Te los dejé en el portal. Cuando puedas, marcá lo que no te cierre." }).returning({ id: s.comentarios.id })
  await db.insert(s.comentarios).values({ tarjetaId: duda, autorId: socio.id, respuestaA: c1!.id, texto: "Los empiezo esta semana." })
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
