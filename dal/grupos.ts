import "server-only"
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { grupos, proyectos } from "@/db/schema"
import type { FilaGrupo } from "@/lib/grupo"

// Catálogo chico (decenas de filas): excepción acotada sin paginar, escrita en docs/DATOS.md §3.

const orden = sql`${grupos.nombreClave} collate "es-x-icu"`

export const listarGruposActivos = async () =>
  db.select({ id: grupos.id, nombre: grupos.nombre }).from(grupos).where(isNull(grupos.archivadoEn)).orderBy(orden, grupos.id)

export const listarGrupos = async (estado: "activos" | "archivados"): Promise<FilaGrupo[]> =>
  db
    .select({
      id: grupos.id,
      nombre: grupos.nombre,
      proyectos: sql<number>`count(${proyectos.id}) filter (where ${proyectos.archivadoEn} is null)`.mapWith(Number),
      archivadoEn: sql<string | null>`${grupos.archivadoEn}::text`,
    })
    .from(grupos)
    .leftJoin(proyectos, eq(proyectos.grupoId, grupos.id))
    .where(estado === "activos" ? isNull(grupos.archivadoEn) : isNotNull(grupos.archivadoEn))
    .groupBy(grupos.id)
    .orderBy(orden, grupos.id)
    .limit(500)

export const contarGrupos = async () => {
  const [c] = await db
    .select({
      activos: sql<number>`count(*) filter (where ${grupos.archivadoEn} is null)`.mapWith(Number),
      archivados: sql<number>`count(*) filter (where ${grupos.archivadoEn} is not null)`.mapWith(Number),
    })
    .from(grupos)
  return { activos: c?.activos ?? 0, archivados: c?.archivados ?? 0 }
}

export const grupoPorNombre = async (nombre: string, excluir: string | null) => {
  const [g] = await db
    .select({ id: grupos.id })
    .from(grupos)
    .where(and(eq(grupos.nombreClave, nombre.toLowerCase()), excluir ? sql`${grupos.id} <> ${excluir}` : undefined))
    .limit(1)
  return g ?? null
}
