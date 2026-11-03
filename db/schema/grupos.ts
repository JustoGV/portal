import { sql } from "drizzle-orm"
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

export const grupos = pgTable(
  "grupos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    nombreClave: text("nombre_clave").generatedAlwaysAs(sql`lower(nombre)`),
    archivadoEn: timestamp("archivado_en", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("grupos_nombre_clave_key").on(t.nombreClave),
    check("grupos_nombre_check", sql`length(${t.nombre}) between 1 and 40 and ${t.nombre} = btrim(${t.nombre})`),
  ],
)
