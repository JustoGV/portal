import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { usuarios } from "./usuarios"

/** Solo inserciones: el rol de la app no tiene UPDATE ni DELETE (db/migrations/0002). */
export const auditoria = pgTable(
  "auditoria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id),
    accion: text("accion").notNull(),
    tabla: text("tabla").notNull(),
    filaId: uuid("fila_id"),
    detalle: jsonb("detalle"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auditoria_creado_en_idx").on(t.creadoEn, t.id)],
)
