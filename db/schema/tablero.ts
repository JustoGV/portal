import { sql } from "drizzle-orm"
import { type AnyPgColumn, boolean, check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { grupos } from "./grupos"
import { proyectos } from "./proyectos"
import { usuarios } from "./usuarios"

/**
 * El tablero de trabajo (WU-07, D-038, D-040). Una tarjeta vive en una de cuatro listas y tiene su lugar en
 * ella (`posicion`, de 0 en adelante, que reescribe la acción de mover). No se borra. Su etiqueta es un
 * servicio (`proyecto_id`) o, en la lista «Servicios», el cliente (`grupo_id`); sin ninguno de los dos es
 * «Otro». Las dudas no tienen persona: la lista ya dice que son para Claudio.
 */
export const tarjetas = pgTable(
  "tarjetas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lista: text("lista").notNull(),
    posicion: integer("posicion").notNull().default(0),
    titulo: text("titulo").notNull(),
    descripcion: text("descripcion"),
    proyectoId: uuid("proyecto_id").references(() => proyectos.id),
    grupoId: uuid("grupo_id").references(() => grupos.id),
    responsableId: uuid("responsable_id").references(() => usuarios.id),
    prioridad: boolean("prioridad").notNull().default(false),
    /** Lo que se respondió al crearla: una lista de `{ pregunta, respuesta }`, copiada tal cual se vio. */
    respuestas: jsonb("respuestas").$type<{ pregunta: string; respuesta: string }[]>().notNull().default(sql`'[]'::jsonb`),
    resueltaEn: timestamp("resuelta_en", { withTimezone: true }),
    resueltaPor: uuid("resuelta_por").references(() => usuarios.id),
    creadoPor: uuid("creado_por").notNull().references(() => usuarios.id),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("tarjetas_lista_check", sql`${t.lista} in ('dudas', 'servicios', 'tareas', 'correcciones')`),
    check("tarjetas_posicion_check", sql`${t.posicion} >= 0`),
    check("tarjetas_titulo_check", sql`length(${t.titulo}) between 1 and 120 and ${t.titulo} = btrim(${t.titulo})`),
    check("tarjetas_descripcion_check", sql`${t.descripcion} is null or (length(${t.descripcion}) between 1 and 2000)`),
    check("tarjetas_respuestas_check", sql`jsonb_typeof(${t.respuestas}) = 'array' and jsonb_array_length(${t.respuestas}) <= 12`),
    check("tarjetas_resuelta_check", sql`(${t.resueltaEn} is null) = (${t.resueltaPor} is null)`),
    check("tarjetas_resuelta_duda_check", sql`${t.resueltaEn} is null or ${t.lista} = 'dudas'`),
    index("tarjetas_lista_posicion_idx").on(t.lista, t.posicion, t.id),
  ],
)

/**
 * La conversación de una tarjeta, como mensajes de chat (D-041). Solo se agregan: no se editan ni se borran
 * (D-040). Un mensaje puede responder a cualquier otro de la misma tarjeta (lo cuida un trigger, migraciones
 * 0006 y 0007).
 */
export const comentarios = pgTable(
  "comentarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tarjetaId: uuid("tarjeta_id").notNull().references(() => tarjetas.id),
    autorId: uuid("autor_id").notNull().references(() => usuarios.id),
    respuestaA: uuid("respuesta_a").references((): AnyPgColumn => comentarios.id),
    texto: text("texto").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("comentarios_texto_check", sql`length(${t.texto}) between 1 and 2000 and ${t.texto} = btrim(${t.texto})`),
    index("comentarios_tarjeta_idx").on(t.tarjetaId, t.creadoEn, t.id),
  ],
)
