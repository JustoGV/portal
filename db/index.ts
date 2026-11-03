import "server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

// Driver TCP (pg) en vez del HTTP de Neon: anda igual contra Neon y contra un Postgres de prueba, y
// permite transacciones (D-006). Una sola pool por instancia.
const global = globalThis as unknown as { __pool?: Pool }

const pool =
  global.__pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
  })
if (process.env.NODE_ENV !== "production") global.__pool = pool

export const db = drizzle(pool, { schema })
export type Db = typeof db
