// Pone (o rota) la contraseña del rol de la app, portal_app, y lo habilita para entrar.
// La contraseña sale al azar y se muestra UNA vez en esta terminal: con ella se arma DATABASE_URL en el
// panel de Vercel. Nunca se escribe en el repo (docs/reglas/10 §6). Usa DATABASE_URL_DIRECT (el dueño).
import { randomBytes } from "node:crypto"
import { Client } from "pg"

const url = process.env.DATABASE_URL_DIRECT
if (!url) {
  console.error("Falta la variable DATABASE_URL_DIRECT (la conexión del dueño de la base).")
  process.exit(1)
}
const clave = randomBytes(24).toString("base64url")
const c = new Client({ connectionString: url })
await c.connect()
try {
  await c.query(`ALTER ROLE portal_app WITH LOGIN PASSWORD ${c.escapeLiteral(clave)}`)
  console.log("\nRol portal_app habilitado.")
  console.log(`Contraseña (se muestra esta única vez): ${clave}`)
  console.log("Armá DATABASE_URL en Vercel con el usuario portal_app y esta contraseña. Si rotás, las conexiones viejas dejan de entrar.\n")
} finally {
  await c.end()
}
