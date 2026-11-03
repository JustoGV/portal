import { sql } from "drizzle-orm"
import { boolean, check, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { usuarios } from "./usuarios"

/** Una sola fila: `id` es siempre true. */
export const configuracion = pgTable(
  "configuracion",
  {
    id: boolean("id").primaryKey().default(true),
    inactividadMinutos: integer("inactividad_minutos").default(480),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoPor: uuid("actualizado_por").references(() => usuarios.id),
  },
  (t) => [
    check("configuracion_una_fila", sql`${t.id}`),
    check("configuracion_inactividad_check", sql`${t.inactividadMinutos} is null or ${t.inactividadMinutos} in (30, 60, 120, 240, 480)`),
  ],
)
