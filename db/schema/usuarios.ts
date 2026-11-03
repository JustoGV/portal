import { sql } from "drizzle-orm"
import { boolean, check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { authUser } from "./auth"

/** La fila que manda en los permisos (docs/reglas/10 §3): el rol sale de acá, nunca de la sesión. */
export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: text("auth_user_id").notNull().unique().references(() => authUser.id),
    nombre: text("nombre").notNull(),
    email: text("email").notNull(),
    rol: text("rol").notNull().default("admin"),
    activo: boolean("activo").notNull().default(true),
    debeCambiarClave: boolean("debe_cambiar_clave").notNull().default(true),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("usuarios_email_key").on(sql`lower(${t.email})`),
    check("usuarios_rol_check", sql`${t.rol} in ('admin')`),
    check("usuarios_nombre_check", sql`length(${t.nombre}) between 1 and 80`),
  ],
)
