import { defineConfig } from "drizzle-kit"

// Sin la variable, drizzle-kit generate lanza aunque no se conecte (docs/reglas/11 §8): una URL de mentira.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL_DIRECT ?? "postgresql://nadie@localhost/nada" },
  strict: true,
  verbose: true,
})
