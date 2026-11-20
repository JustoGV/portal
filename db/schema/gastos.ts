import { sql } from "drizzle-orm"
import { check, index, numeric, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { usuarios } from "./usuarios"

/**
 * Los gastos que se repiten (D-043): lo que paga la consultora todos los meses o todos los años (Claude,
 * Cloudflare, el dominio). La plata es numeric(12,2) (docs/reglas/11); el día de pago se guarda como día
 * del mes (y el mes, si es anual), y el próximo pago lo calcula la base con `proximo_pago()` (migración 0009).
 * «Con qué se paga» es texto ("Visa de Mateo"): un CHECK rechaza cualquier número de tarjeta.
 */
export const gastos = pgTable(
  "gastos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
    moneda: text("moneda").notNull(),
    frecuencia: text("frecuencia").notNull(),
    diaPago: smallint("dia_pago").notNull(),
    mesPago: smallint("mes_pago"),
    medioPago: text("medio_pago").notNull(),
    pagaId: uuid("paga_id").notNull().references(() => usuarios.id),
    archivadoEn: timestamp("archivado_en", { withTimezone: true }),
    archivadoPor: uuid("archivado_por").references(() => usuarios.id),
    creadoPor: uuid("creado_por").notNull().references(() => usuarios.id),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("gastos_nombre_check", sql`length(${t.nombre}) between 1 and 80 and ${t.nombre} = btrim(${t.nombre})`),
    check("gastos_descripcion_check", sql`${t.descripcion} is null or length(${t.descripcion}) between 1 and 200`),
    check("gastos_monto_check", sql`${t.monto} > 0`),
    check("gastos_moneda_check", sql`${t.moneda} in ('ARS', 'USD')`),
    check("gastos_frecuencia_check", sql`${t.frecuencia} in ('mensual', 'anual')`),
    check("gastos_dia_check", sql`${t.diaPago} between 1 and 31`),
    check("gastos_mes_check", sql`(${t.frecuencia} = 'anual') = (${t.mesPago} is not null) and (${t.mesPago} is null or ${t.mesPago} between 1 and 12)`),
    check("gastos_medio_check", sql`length(${t.medioPago}) between 1 and 60 and regexp_replace(${t.medioPago}, '[[:space:]-]', '', 'g') !~ '[0-9]{5,}'`),
    check("gastos_archivado_check", sql`(${t.archivadoEn} is null) = (${t.archivadoPor} is null)`),
    index("gastos_activos_idx").on(t.id).where(sql`${t.archivadoEn} is null`),
    index("gastos_paga_idx").on(t.pagaId),
  ],
)
