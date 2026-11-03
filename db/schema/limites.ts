import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { usuarios } from "./usuarios"

/** Escrituras por usuario y por minuto (docs/reglas/10 §4). */
export const limitesEscritura = pgTable(
  "limites_escritura",
  {
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id),
    ventana: timestamp("ventana", { withTimezone: true }).notNull(),
    cuenta: integer("cuenta").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.ventana] })],
)

/** Intentos de ingreso por cuenta (el límite por IP lo lleva better-auth en auth_rate_limit). */
export const intentosIngreso = pgTable(
  "intentos_ingreso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailClave: text("email_clave").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("intentos_ingreso_email_idx").on(t.emailClave, t.creadoEn)],
)
