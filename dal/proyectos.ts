import "server-only"
import { and, eq, ilike, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm"
import { db } from "@/db"
import { grupos, proyectos } from "@/db/schema"
import type { FilaProyecto } from "@/lib/proyecto"
import { escaparLike } from "@/lib/texto"

// Lecturas de Proyectos. Quien llama ya pasó por el guard (la página o la acción).

export type FiltroProyectos = { q: string; grupo: string | null; estado: "activos" | "archivados"; pagina: number; por: number }

const ordenNombre = sql`${proyectos.nombreClave} collate "es-x-icu"`

const condBusqueda = (q: string): SQL | undefined => {
  if (!q) return undefined
  const patron = `%${escaparLike(q)}%`
  return or(ilike(proyectos.nombre, patron), ilike(proyectos.descripcion, patron), ilike(proyectos.url, patron))
}
const condEstado = (estado: FiltroProyectos["estado"]) => (estado === "activos" ? isNull(proyectos.archivadoEn) : isNotNull(proyectos.archivadoEn))

/** Una página de la lista, con el total en la misma lectura (docs/reglas/07 §3). */
export const listarProyectos = async (f: FiltroProyectos): Promise<{ filas: FilaProyecto[]; total: number }> => {
  const donde = and(condEstado(f.estado), f.grupo ? eq(proyectos.grupoId, f.grupo) : undefined, condBusqueda(f.q))
  const filas = await db
    .select({
      id: proyectos.id,
      nombre: proyectos.nombre,
      url: proyectos.url,
      descripcion: proyectos.descripcion,
      grupoId: proyectos.grupoId,
      grupoNombre: grupos.nombre,
      actualizadoEn: sql<string>`${proyectos.actualizadoEn}::text`,
      archivadoEn: sql<string | null>`${proyectos.archivadoEn}::text`,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(proyectos)
    .leftJoin(grupos, eq(grupos.id, proyectos.grupoId))
    .where(donde)
    .orderBy(ordenNombre, proyectos.id)
    .limit(f.por)
    .offset((f.pagina - 1) * f.por)
  let total = filas[0]?.total ?? 0
  if (filas.length === 0 && f.pagina > 1) {
    const [c] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(proyectos).where(donde)
    total = c?.n ?? 0
  }
  return { filas: filas.map(({ total: _, ...resto }) => resto), total }
}

/** Los números de los filtros: activos/archivados y cuántos por grupo en el estado elegido. */
export const contarProyectos = async (q: string, estado: FiltroProyectos["estado"]) => {
  const busqueda = condBusqueda(q)
  const [[estados], porGrupo] = await Promise.all([
    db
      .select({
        activos: sql<number>`count(*) filter (where ${proyectos.archivadoEn} is null)`.mapWith(Number),
        archivados: sql<number>`count(*) filter (where ${proyectos.archivadoEn} is not null)`.mapWith(Number),
      })
      .from(proyectos)
      .where(busqueda),
    db
      .select({ id: grupos.id, nombre: grupos.nombre, cuenta: sql<number>`count(*)`.mapWith(Number) })
      .from(proyectos)
      .innerJoin(grupos, eq(grupos.id, proyectos.grupoId))
      .where(and(condEstado(estado), busqueda))
      .groupBy(grupos.id, grupos.nombre)
      .orderBy(sql`lower(${grupos.nombre}) collate "es-x-icu"`),
  ])
  return { activos: estados?.activos ?? 0, archivados: estados?.archivados ?? 0, porGrupo }
}

/** ¿Hay otro proyecto con este nombre o este link? (el aviso en vivo; la base lo frena igual). */
export const buscarDuplicado = async (campo: "nombre" | "url", valor: string, excluir: string | null) => {
  const cond = campo === "nombre" ? eq(proyectos.nombreClave, valor.toLowerCase()) : eq(proyectos.url, valor)
  const [fila] = await db
    .select({ id: proyectos.id, nombre: proyectos.nombre, archivado: sql<boolean>`${proyectos.archivadoEn} is not null` })
    .from(proyectos)
    .where(and(cond, excluir ? ne(proyectos.id, excluir) : undefined))
    .limit(1)
  return fila ?? null
}

/** Para Ctrl+K: hasta 8, activos, por nombre. */
export const buscarRapido = async (q: string) =>
  db
    .select({ id: proyectos.id, nombre: proyectos.nombre, url: proyectos.url, grupo: grupos.nombre })
    .from(proyectos)
    .leftJoin(grupos, eq(grupos.id, proyectos.grupoId))
    .where(and(isNull(proyectos.archivadoEn), condBusqueda(q)))
    .orderBy(ordenNombre, proyectos.id)
    .limit(8)
