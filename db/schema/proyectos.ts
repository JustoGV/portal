import { sql } from "drizzle-orm"
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { grupos } from "./grupos"
import { usuarios } from "./usuarios"

export const proyectos = pgTable(
  "proyectos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    nombreClave: text("nombre_clave").generatedAlwaysAs(sql`lower(nombre)`),
    url: text("url").notNull(),
    descripcion: text("descripcion"),
    grupoId: uuid("grupo_id").references(() => grupos.id),
    archivadoEn: timestamp("archivado_en", { withTimezone: true }),
    archivadoPor: uuid("archivado_por").references(() => usuarios.id),
    creadoPor: uuid("creado_por").notNull().references(() => usuarios.id),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("proyectos_nombre_clave_key").on(t.nombreClave),
    uniqueIndex("proyectos_url_key").on(t.url),
    check("proyectos_nombre_check", sql`length(${t.nombre}) between 1 and 80 and ${t.nombre} = btrim(${t.nombre})`),
    check("proyectos_url_https", sql`${t.url} ~ '^https://[^\\s]+$' and length(${t.url}) <= 2048`),
    check("proyectos_descripcion_check", sql`${t.descripcion} is null or length(${t.descripcion}) between 1 and 200`),
    check("proyectos_archivado_check", sql`(${t.archivadoEn} is null) = (${t.archivadoPor} is null)`),
    index("proyectos_activos_orden_idx").on(t.nombreClave, t.id).where(sql`${t.archivadoEn} is null`),
    index("proyectos_archivados_orden_idx").on(t.nombreClave, t.id).where(sql`${t.archivadoEn} is not null`),
    index("proyectos_grupo_idx").on(t.grupoId),
    index("proyectos_nombre_trgm").using("gin", sql`${t.nombre} gin_trgm_ops`),
    index("proyectos_descripcion_trgm").using("gin", sql`${t.descripcion} gin_trgm_ops`),
    index("proyectos_url_trgm").using("gin", sql`${t.url} gin_trgm_ops`),
  ],
)
