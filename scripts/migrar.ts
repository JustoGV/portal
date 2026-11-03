// Aplica las migraciones con la conexión del dueño (DATABASE_URL_DIRECT). Nunca imprime la conexión.
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"

const url = process.env.DATABASE_URL_DIRECT
if (!url) {
  console.error("Falta la variable DATABASE_URL_DIRECT (la conexión del dueño de la base).")
  process.exit(1)
}
const pool = new Pool({ connectionString: url, max: 1 })
try {
  await migrate(drizzle(pool), { migrationsFolder: "db/migrations" })
  console.log("Migraciones aplicadas.")
} finally {
  await pool.end()
}
