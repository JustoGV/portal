import "server-only"
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { comentarios, grupos, proyectos, tarjetas, usuarios } from "@/db/schema"
import type { Comentario, Persona, Tarjeta } from "@/components/tablero/listas"
import { iniciales } from "@/lib/nombre"
import { LISTAS_ID, TARJETAS_POR_LISTA, tonoDe, type ListaId } from "@/lib/tablero"

// Las lecturas del tablero (D-040). Quien llama ya pasó por el guard.

const ordenNombre = (col: typeof proyectos.nombreClave | typeof grupos.nombreClave) => sql`${col} collate "es-x-icu"`

export const persona = (id: string, nombre: string): Persona => ({ id, nombre, iniciales: iniciales(nombre) || nombre.slice(0, 1).toUpperCase(), tono: tonoDe(id) })

/** Las cuentas activas: a quién se le puede dar una tarjeta y a quién se puede mencionar. */
export const listarPersonas = async () =>
  (await db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios).where(eq(usuarios.activo, true)).orderBy(asc(usuarios.nombre), asc(usuarios.id))).map((u) =>
    persona(u.id, u.nombre),
  )

/** Los servicios activos (la pregunta «¿De qué sistema es?»). Catálogo acotado, como el formulario de Clientes. */
export const listarSistemas = async () =>
  db.select({ id: proyectos.id, nombre: proyectos.nombre }).from(proyectos).where(isNull(proyectos.archivadoEn)).orderBy(ordenNombre(proyectos.nombreClave), asc(proyectos.id)).limit(500)

/** Los clientes activos (la pregunta «¿Para qué cliente es?»). */
export const listarClientesTablero = async () =>
  db.select({ id: grupos.id, nombre: grupos.nombre }).from(grupos).where(isNull(grupos.archivadoEn)).orderBy(ordenNombre(grupos.nombreClave), asc(grupos.id)).limit(500)

type Fila = {
  id: string
  lista: ListaId
  titulo: string
  descripcion: string | null
  prioridad: boolean
  respuestas: { pregunta: string; respuesta: string }[]
  resuelta_en: Date | null
  creado_en: Date
  servicio_id: string | null
  servicio: string | null
  cliente_id: string | null
  cliente: string | null
  responsable_id: string | null
  responsable: string | null
  comentarios: number
  n: number
}

/** Una tarjeta como la dibuja el tablero. */
const vista = (f: Fila): Tarjeta => ({
  id: f.id,
  titulo: f.titulo,
  servicio: f.servicio ?? f.cliente ?? "Otro",
  tono: f.servicio_id ? tonoDe(f.servicio_id) : f.cliente_id ? tonoDe(f.cliente_id) : "marca",
  responsable: f.responsable_id && f.responsable ? persona(f.responsable_id, f.responsable) : null,
  creada: new Date(f.creado_en).toISOString(),
  ...(f.prioridad ? { prioridad: "alta" as const } : {}),
  comentarios: Number(f.comentarios),
  resuelta: f.resuelta_en !== null,
  descripcion: f.descripcion,
  respuestas: f.respuestas,
})

const seleccion = sql`
  select t.id, t.lista, t.titulo, t.descripcion, t.prioridad, t.respuestas, t.resuelta_en, t.creado_en,
    p.id as servicio_id, p.nombre as servicio, g.id as cliente_id, g.nombre as cliente,
    u.id as responsable_id, u.nombre as responsable,
    (select count(*) from comentarios c where c.tarjeta_id = t.id)::int as comentarios`

/**
 * Las cuatro listas, cada una en su orden y con hasta `TARJETAS_POR_LISTA` tarjetas. Trae una más por lista
 * para saber si quedaron afuera.
 */
export const leerTablero = async () => {
  const r = await db.execute<Fila>(sql`
    select * from (
      ${seleccion},
        row_number() over (partition by t.lista order by t.posicion, t.creado_en desc, t.id)::int as n
      from tarjetas t
      left join proyectos p on p.id = t.proyecto_id
      left join grupos g on g.id = t.grupo_id
      left join usuarios u on u.id = t.responsable_id
    ) x
    where x.n <= ${TARJETAS_POR_LISTA + 1}
    order by x.lista, x.n`)
  const orden = Object.fromEntries(LISTAS_ID.map((l) => [l, [] as string[]])) as Record<ListaId, string[]>
  const masDe = Object.fromEntries(LISTAS_ID.map((l) => [l, false])) as Record<ListaId, boolean>
  const porId: Record<string, Tarjeta> = {}
  for (const f of r.rows) {
    if (f.n > TARJETAS_POR_LISTA) {
      masDe[f.lista] = true
      continue
    }
    orden[f.lista].push(f.id)
    porId[f.id] = vista(f)
  }
  return { tarjetas: porId, orden, masDe }
}

/** Una tarjeta sola, como la dibuja el tablero (después de crearla). */
export const leerTarjeta = async (id: string) => {
  const r = await db.execute<Fila>(sql`
    ${seleccion}, 1 as n
    from tarjetas t
    left join proyectos p on p.id = t.proyecto_id
    left join grupos g on g.id = t.grupo_id
    left join usuarios u on u.id = t.responsable_id
    where t.id = ${id}`)
  const f = r.rows[0]
  return f ? vista(f) : null
}

/** La conversación de una tarjeta: los mensajes en orden, cada uno con el que cita. Los últimos 500. */
export const leerConversacion = async (tarjetaId: string): Promise<Comentario[]> => {
  const filas = await db
    .select({ id: comentarios.id, respuestaA: comentarios.respuestaA, texto: comentarios.texto, creadoEn: comentarios.creadoEn, autorId: usuarios.id, autor: usuarios.nombre })
    .from(comentarios)
    .innerJoin(usuarios, eq(usuarios.id, comentarios.autorId))
    .where(and(eq(comentarios.tarjetaId, tarjetaId)))
    .orderBy(desc(comentarios.creadoEn), desc(comentarios.id))
    .limit(500)
  return filas.reverse().map((f) => ({ id: f.id, autor: persona(f.autorId, f.autor), texto: f.texto, creado: f.creadoEn.toISOString(), respuestaA: f.respuestaA }))
}
