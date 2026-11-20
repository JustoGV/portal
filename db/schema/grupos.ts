import { sql } from "drizzle-orm"
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

/** En la pantalla se llaman «Clientes» (D-032); por dentro siguen siendo `grupos`, como «Servicios» es `proyectos` (D-027). */
export const grupos = pgTable(
  "grupos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    nombreClave: text("nombre_clave").generatedAlwaysAs(sql`lower(nombre)`),
    // El responsable del cliente (D-032, migración 0003): cuatro datos optativos de una persona.
    responsableNombre: text("responsable_nombre"),
    responsableCargo: text("responsable_cargo"),
    responsableMail: text("responsable_mail"),
    responsableTelefono: text("responsable_telefono"),
    responsableDni: text("responsable_dni"),
    archivadoEn: timestamp("archivado_en", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("grupos_nombre_clave_key").on(t.nombreClave),
    check("grupos_nombre_check", sql`length(${t.nombre}) between 1 and 40 and ${t.nombre} = btrim(${t.nombre})`),
    check("grupos_responsable_nombre_check", sql`${t.responsableNombre} is null or (length(${t.responsableNombre}) between 1 and 80 and ${t.responsableNombre} = btrim(${t.responsableNombre}))`),
    check("grupos_responsable_cargo_check", sql`${t.responsableCargo} is null or (length(${t.responsableCargo}) between 1 and 60 and ${t.responsableCargo} = btrim(${t.responsableCargo}))`),
    check(
      "grupos_responsable_mail_check",
      sql`${t.responsableMail} is null or (length(${t.responsableMail}) <= 254 and ${t.responsableMail} = lower(${t.responsableMail}) and ${t.responsableMail} ~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$')`,
    ),
    // Desde la 0004 (D-033): formato internacional, «+5493424551234».
    check("grupos_responsable_telefono_check", sql`${t.responsableTelefono} is null or ${t.responsableTelefono} ~ '^\\+[1-9][0-9]{7,14}$'`),
    check("grupos_responsable_dni_check", sql`${t.responsableDni} is null or ${t.responsableDni} ~ '^[0-9]{7,8}$'`),
  ],
)
