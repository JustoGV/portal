// Crea una cuenta con una contraseña inicial al azar y la muestra UNA vez en esta terminal.
// Lo corre el dueño, nunca Claude (docs/reglas/10 §2.6). Uso:
//   pnpm crear-admin "Nombre Apellido" persona@dominio.com
// Necesita DATABASE_URL (la conexión de la app) en el entorno. No imprime la conexión.
import { esquemaCuenta } from "@/lib/cuenta"

const [nombreArg, emailArg] = process.argv.slice(2)
const r = esquemaCuenta.safeParse({ nombre: nombreArg ?? "", email: emailArg ?? "" })
if (!r.success) {
  console.error('Uso: pnpm crear-admin "Nombre Apellido" persona@dominio.com')
  console.error(r.error.issues.map((i) => `- ${i.message}`).join("\n"))
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error("Falta la variable DATABASE_URL.")
  process.exit(1)
}

const { crearCuentaInterna } = await import("@/dal/cuentas")
const { db } = await import("@/db")
const { auditoria } = await import("@/db/schema")
try {
  const { usuario, clave } = await crearCuentaInterna(r.data.nombre, r.data.email)
  await db.insert(auditoria).values({ usuarioId: usuario.id, accion: "usuario.crear-por-script", tabla: "usuarios", filaId: usuario.id })
  console.log(`\nCuenta creada: ${usuario.nombre} <${usuario.email}>`)
  console.log(`Contraseña inicial (se muestra esta única vez): ${clave}`)
  console.log("En el primer ingreso se cambia y se activa el segundo factor.\n")
} catch (e) {
  const codigo = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code
  console.error(codigo === "23505" ? "Ya existe una cuenta con ese email." : "No se pudo crear la cuenta.")
  process.exitCode = 1
} finally {
  process.exit()
}
