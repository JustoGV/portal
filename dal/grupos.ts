import "server-only"
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm"
import { db } from "@/db"
import { grupos, proyectos } from "@/db/schema"
import { SERVICIOS_POR_GRUPO_MAX, type FilaGrupo, type ServicioDeGrupo, type ServicioElegible } from "@/lib/grupo"
import { POR_PAGINA_CLIENTES, type OrdenGrupos, type SiNo, type VistaGrupos } from "@/lib/parametros"
import { escaparLike } from "@/lib/texto"

// La pantalla Clientes pagina de a 12 en el servidor (D-033). Quien llama ya pasó por el guard.

const orden = sql`${grupos.nombreClave} collate "es-x-icu"`
const ordenServicio = sql`${proyectos.nombreClave} collate "es-x-icu"`
/** Cuántos servicios activos tiene el grupo. */
const cuenta = sql<number>`count(${proyectos.id}) filter (where ${proyectos.archivadoEn} is null)`

/** Cuántos servicios de cada grupo viajan a la pantalla: la tarjeta muestra tres y la ficha, hasta estos. */
const SERVICIOS_EN_FICHA = 60

export type FiltroGrupos = { q: string; ver: VistaGrupos; orden: OrdenGrupos; responsable: SiNo | null; servicios: SiNo | null; pagina: number }

/** El orden sale de una lista cerrada (lib/parametros), nunca del texto del pedido. Siempre con desempate único (07 §3). */
export const ordenDeGrupos = (o: OrdenGrupos): SQL[] => {
  if (o === "servicios") return [desc(cuenta), sql`${orden}`, asc(grupos.id)]
  if (o === "nuevos") return [desc(grupos.creadoEn), sql`${orden}`, asc(grupos.id)]
  return [sql`${orden}`, asc(grupos.id)]
}

/** El buscador encuentra por el nombre del cliente, el de su responsable o su DNI (con o sin puntos). */
const buscar = (q: string) => {
  const patron = `%${escaparLike(q)}%`
  const numeros = q.replace(/[.\s-]/gu, "")
  return or(ilike(grupos.nombre, patron), ilike(grupos.responsableNombre, patron), /^[0-9]{3,8}$/u.test(numeros) ? ilike(grupos.responsableDni, `%${numeros}%`) : undefined)
}

/** Tiene responsable si tiene cargado al menos un dato de la persona. */
const conResponsable = sql`coalesce(${grupos.responsableNombre}, ${grupos.responsableCargo}, ${grupos.responsableDni}, ${grupos.responsableMail}, ${grupos.responsableTelefono}) is not null`

const condiciones = (f: FiltroGrupos) =>
  and(
    f.ver === "archivados" ? isNotNull(grupos.archivadoEn) : isNull(grupos.archivadoEn),
    f.q ? buscar(f.q) : undefined,
    f.responsable === "con" ? conResponsable : f.responsable === "sin" ? sql`not ${conResponsable}` : undefined,
  )
const condicionServicios = (f: FiltroGrupos) => (f.servicios === "sin" || f.ver === "vacios" ? sql`${cuenta} = 0` : f.servicios === "con" ? sql`${cuenta} > 0` : undefined)

export const listarGruposActivos = async () =>
  db.select({ id: grupos.id, nombre: grupos.nombre }).from(grupos).where(isNull(grupos.archivadoEn)).orderBy(orden, grupos.id)

/** Los clientes de la pantalla (por dentro, grupos: D-032), cada uno con su responsable y sus servicios activos. */
export const listarGrupos = async (f: FiltroGrupos): Promise<{ filas: FilaGrupo[]; total: number }> => {
  // El total, con los mismos filtros, para el contador y las páginas.
  const base = db
    .select({ id: grupos.id })
    .from(grupos)
    .leftJoin(proyectos, eq(proyectos.grupoId, grupos.id))
    .where(condiciones(f))
    .groupBy(grupos.id)
    .having(condicionServicios(f))
    .as("base")
  const [conteo, filas] = await Promise.all([
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(base),
    db
    .select({
      id: grupos.id,
      nombre: grupos.nombre,
      responsableNombre: grupos.responsableNombre,
      responsableCargo: grupos.responsableCargo,
      responsableMail: grupos.responsableMail,
      responsableTelefono: grupos.responsableTelefono,
      responsableDni: grupos.responsableDni,
      proyectos: cuenta.mapWith(Number),
      archivadoEn: sql<string | null>`${grupos.archivadoEn}::text`,
      creadoEn: sql<string>`${grupos.creadoEn}::text`,
      actualizadoEn: sql<string>`${grupos.actualizadoEn}::text`,
    })
    .from(grupos)
    .leftJoin(proyectos, eq(proyectos.grupoId, grupos.id))
    .where(condiciones(f))
    .groupBy(grupos.id)
    .having(condicionServicios(f))
    .orderBy(...ordenDeGrupos(f.orden))
    .limit(POR_PAGINA_CLIENTES)
    .offset((f.pagina - 1) * POR_PAGINA_CLIENTES),
  ])
  const total = conteo[0]?.n ?? 0
  if (filas.length === 0) return { filas: [], total }

  // Los servicios de esos grupos en una sola lectura, numerados dentro de su grupo para cortar en SERVICIOS_EN_FICHA.
  const numerados = db
    .select({
      id: proyectos.id,
      nombre: proyectos.nombre,
      url: proyectos.url,
      grupoId: proyectos.grupoId,
      n: sql<number>`row_number() over (partition by ${proyectos.grupoId} order by ${ordenServicio}, ${proyectos.id})`.as("n"),
    })
    .from(proyectos)
    .where(and(isNull(proyectos.archivadoEn), inArray(proyectos.grupoId, filas.map((g) => g.id))))
    .as("numerados")
  const servicios = await db
    .select({ id: numerados.id, nombre: numerados.nombre, url: numerados.url, grupoId: numerados.grupoId })
    .from(numerados)
    .where(sql`${numerados.n} <= ${SERVICIOS_EN_FICHA}`)
    .orderBy(numerados.grupoId, numerados.n)
  const porGrupo = new Map<string, ServicioDeGrupo[]>()
  for (const s of servicios) {
    if (!s.grupoId) continue
    const lista = porGrupo.get(s.grupoId) ?? []
    lista.push({ id: s.id, nombre: s.nombre, url: s.url })
    porGrupo.set(s.grupoId, lista)
  }
  return { filas: filas.map((g) => ({ ...g, servicios: porGrupo.get(g.id) ?? [] })), total }
}

/** Las cuatro cifras de arriba de la pantalla: no dependen de la búsqueda ni del orden. */
export const cifrasGrupos = async () => {
  const [[g], [p]] = await Promise.all([
    db
      .select({
        activos: sql<number>`count(*) filter (where ${grupos.archivadoEn} is null)`.mapWith(Number),
        archivados: sql<number>`count(*) filter (where ${grupos.archivadoEn} is not null)`.mapWith(Number),
        // Con nombres escritos a mano: en una lectura de una sola tabla Drizzle no califica las columnas, y `grupo_id = id` compararía mal.
        vacios: sql<number>`count(*) filter (where grupos.archivado_en is null and not exists (select 1 from proyectos p where p.grupo_id = grupos.id and p.archivado_en is null))`.mapWith(Number),
      })
      .from(grupos),
    db
      .select({ sinGrupo: sql<number>`count(*)`.mapWith(Number) })
      .from(proyectos)
      .where(and(isNull(proyectos.archivadoEn), isNull(proyectos.grupoId))),
  ])
  return { activos: g?.activos ?? 0, archivados: g?.archivados ?? 0, vacios: g?.vacios ?? 0, sinGrupo: p?.sinGrupo ?? 0 }
}

/** Los servicios activos que se pueden marcar al armar un grupo, con el grupo que tiene cada uno hoy. Acotado. */
export const listarServiciosElegibles = async (): Promise<ServicioElegible[]> =>
  db
    .select({ id: proyectos.id, nombre: proyectos.nombre, grupoId: proyectos.grupoId, grupoNombre: grupos.nombre })
    .from(proyectos)
    .leftJoin(grupos, eq(grupos.id, proyectos.grupoId))
    .where(isNull(proyectos.archivadoEn))
    .orderBy(ordenServicio, proyectos.id)
    .limit(SERVICIOS_POR_GRUPO_MAX)

/** ¿Hay otro grupo con este nombre? (el aviso en vivo; el índice único lo frena igual). */
export const grupoPorNombre = async (nombre: string, excluir: string | null) => {
  const [g] = await db
    .select({ id: grupos.id, nombre: grupos.nombre, archivado: sql<boolean>`${grupos.archivadoEn} is not null` })
    .from(grupos)
    .where(and(eq(grupos.nombreClave, nombre.toLowerCase()), excluir ? sql`${grupos.id} <> ${excluir}` : undefined))
    .limit(1)
  return g ?? null
}
