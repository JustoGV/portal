import "server-only"
import { sql } from "drizzle-orm"
import { db } from "@/db"
import { LISTAS_ID, type ListaId } from "@/lib/tablero"
import type { Moneda } from "@/lib/gasto"

// Lecturas del Inicio (D-045). Quien llama ya pasó por el guard. Todo sale de la base:
// nada se escribe a mano. La plata viaja como texto; para dibujar se manda además la proporción ya calculada
// en la base (un número entre 0 y 1), así el navegador nunca suma ni redondea plata.

const hoy = sql`(now() at time zone 'America/Argentina/Buenos_Aires')::date`

export type PersonaInicio = { id: string; nombre: string; abiertas: number; porLista: Record<ListaId, number> }
export type ClienteInicio = { id: string | null; nombre: string; servicios: number }
export type MesGastos = { mes: string; pesos: string; dolares: string; pPesos: number; pDolares: number }
export type DiaInicio = { dia: string; movimientos: number }

/** Las cuatro listas del tablero: abiertas ahora, las de prioridad y las que no tienen responsable. */
const leerTablero = async () => {
  const r = await db.execute<{ lista: ListaId; abiertas: number; prioridad: number; sin_dueno: number }>(sql`
    select lista, count(*)::int as abiertas, count(*) filter (where prioridad)::int as prioridad,
      count(*) filter (where responsable_id is null)::int as sin_dueno
    from tarjetas where resuelta_en is null group by lista`)
  const abiertas = Object.fromEntries(LISTAS_ID.map((l) => [l, 0])) as Record<ListaId, number>
  let prioridad = 0
  let sinDueno = 0
  for (const f of r.rows) {
    abiertas[f.lista] = f.abiertas
    prioridad += f.prioridad
    sinDueno += f.sin_dueno
  }
  return { abiertas, prioridad, sinDueno }
}

/** Quién tiene qué: las cuentas activas con sus tarjetas abiertas, por lista. */
const leerPersonas = async (): Promise<PersonaInicio[]> => {
  const r = await db.execute<{ id: string; nombre: string; lista: ListaId | null; n: number }>(sql`
    select u.id, u.nombre, t.lista, count(t.id)::int as n
    from usuarios u
    left join tarjetas t on t.responsable_id = u.id and t.resuelta_en is null
    where u.activo
    group by u.id, u.nombre, t.lista
    order by lower(u.nombre) collate "es-x-icu", u.id`)
  const porId = new Map<string, PersonaInicio>()
  for (const f of r.rows) {
    const p = porId.get(f.id) ?? { id: f.id, nombre: f.nombre, abiertas: 0, porLista: { dudas: 0, servicios: 0, tareas: 0, correcciones: 0 } }
    if (f.lista) {
      p.porLista[f.lista] = f.n
      p.abiertas += f.n
    }
    porId.set(f.id, p)
  }
  return [...porId.values()].sort((a, b) => b.abiertas - a.abiertas).slice(0, 8)
}

/** Servicios activos por cliente (y los que no tienen), de más a menos. */
const leerClientes = async () => {
  const r = await db.execute<{ id: string | null; nombre: string | null; servicios: number }>(sql`
    select g.id, g.nombre, count(p.id)::int as servicios
    from proyectos p left join grupos g on g.id = p.grupo_id
    where p.archivado_en is null
    group by g.id, g.nombre
    order by count(p.id) desc, lower(coalesce(g.nombre, '')) collate "es-x-icu"`)
  const [c] = (
    await db.execute<{ activos: number; archivados: number; clientes: number }>(sql`
      select count(*) filter (where archivado_en is null)::int as activos, count(*) filter (where archivado_en is not null)::int as archivados,
        (select count(*) from grupos where archivado_en is null)::int as clientes
      from proyectos`)
  ).rows
  const clientes: ClienteInicio[] = r.rows.map((f) => ({ id: f.id, nombre: f.nombre ?? "", servicios: f.servicios }))
  return { clientes: clientes.slice(0, 10), restantes: Math.max(0, clientes.length - 10), activos: c?.activos ?? 0, archivados: c?.archivados ?? 0, cuantosClientes: c?.clientes ?? 0 }
}

/**
 * Gastos: por mes en cada moneda (lo anual dividido 12), cuántos vencen en 7 días y lo que toca pagar en cada
 * uno de los próximos 6 meses.
 */
const leerGastos = async () => {
  const [c] = (
    await db.execute<{ pesos: string; dolares: string; semana: number }>(sql`
      select
        coalesce(round(sum(case when frecuencia = 'anual' then monto / 12 else monto end) filter (where moneda = 'ARS'), 2), 0)::text as pesos,
        coalesce(round(sum(case when frecuencia = 'anual' then monto / 12 else monto end) filter (where moneda = 'USD'), 2), 0)::text as dolares,
        count(*) filter (where proximo_pago(dia_pago, mes_pago, ${hoy}) <= ${hoy} + 7)::int as semana
      from gastos where archivado_en is null`)
  ).rows
  const meses = (
    await db.execute<{ mes: string; pesos: string; dolares: string; p_pesos: number; p_dolares: number }>(sql`
      with m as (
        select (date_trunc('month', ${hoy}) + make_interval(months => g))::date as mes from generate_series(0, 5) g
      ), s as (
        select m.mes,
          coalesce(sum(x.monto) filter (where x.moneda = 'ARS'), 0) as pesos,
          coalesce(sum(x.monto) filter (where x.moneda = 'USD'), 0) as dolares
        from m left join gastos x on x.archivado_en is null
          and (x.frecuencia = 'mensual' or x.mes_pago = extract(month from m.mes))
        group by m.mes
      )
      select mes::text, pesos::text, dolares::text,
        coalesce(pesos / nullif(max(pesos) over (), 0), 0)::float8 as p_pesos,
        coalesce(dolares / nullif(max(dolares) over (), 0), 0)::float8 as p_dolares
      from s order by mes`)
  ).rows
  return {
    pesos: c?.pesos ?? "0",
    dolares: c?.dolares ?? "0",
    semana: c?.semana ?? 0,
    meses: meses.map((f): MesGastos => ({ mes: f.mes, pesos: f.pesos, dolares: f.dolares, pPesos: f.p_pesos, pDolares: f.p_dolares })),
  }
}

/** Movimientos por día (lo anotado en la auditoría más los mensajes del tablero) de los últimos 30 días. */
const leerDias = async (): Promise<DiaInicio[]> => {
  const r = await db.execute<{ dia: string; n: number }>(sql`
    with d as (select (${hoy} - g)::date as dia from generate_series(0, 29) g),
    e as (
      select (creado_en at time zone 'America/Argentina/Buenos_Aires')::date as dia from auditoria
      where creado_en > now() - interval '31 days'
      union all
      select (creado_en at time zone 'America/Argentina/Buenos_Aires')::date from comentarios
      where creado_en > now() - interval '31 days'
    )
    select d.dia::text, count(e.dia)::int as n from d left join e on e.dia = d.dia group by d.dia order by d.dia`)
  return r.rows.map((f) => ({ dia: f.dia, movimientos: f.n }))
}


// ---------- Lo urgente (D-045): reglas fijadas en el plan del 2026-11-22, un solo lugar ----------

/** Un pago que vence en estos días es urgente; hoy o mañana, grave. */
export const URGENTE_PAGO_DIAS = 7
export const GRAVE_PAGO_DIAS = 1
/** Una duda sin movimiento (ni mensajes) en estos días es urgente; pasado el segundo, grave. */
export const URGENTE_DUDA_DIAS = 3
export const GRAVE_DUDA_DIAS = 7

export type Urgencia =
  | { tipo: "pago"; nivel: "grave" | "atencion"; id: string; nombre: string; monto: string; moneda: Moneda; faltan: number }
  | { tipo: "duda"; nivel: "grave" | "atencion"; id: string; titulo: string; dias: number }
  | { tipo: "prioridad"; nivel: "atencion"; id: string; titulo: string; lista: ListaId }
  | { tipo: "sin-dueno"; nivel: "atencion"; cuantas: number }

/** Todo lo urgente, de lo más grave a lo menos: pagos, dudas quietas, prioridad alta y tarjetas sin responsable. */
const leerUrgencias = async (conGastos: boolean): Promise<Urgencia[]> => {
  const pagos = conGastos
    ? (
        await db.execute<{ id: string; nombre: string; monto: string; moneda: Moneda; faltan: number }>(sql`
          select id, nombre, monto::text, moneda, (proximo_pago(dia_pago, mes_pago, ${hoy}) - ${hoy})::int as faltan
          from gastos where archivado_en is null and proximo_pago(dia_pago, mes_pago, ${hoy}) <= ${hoy} + ${URGENTE_PAGO_DIAS}::int
          order by faltan, lower(nombre) collate "es-x-icu", id`)
      ).rows
    : []
  const dudas = (
    await db.execute<{ id: string; titulo: string; dias: number }>(sql`
      select t.id, t.titulo,
        (${hoy} - (greatest(t.creado_en, coalesce((select max(c.creado_en) from comentarios c where c.tarjeta_id = t.id), t.creado_en))
          at time zone 'America/Argentina/Buenos_Aires')::date)::int as dias
      from tarjetas t where t.lista = 'dudas' and t.resuelta_en is null`)
  ).rows.filter((d) => d.dias > URGENTE_DUDA_DIAS)
  const prioridad = (
    await db.execute<{ id: string; titulo: string; lista: ListaId }>(sql`
      select id, titulo, lista from tarjetas where resuelta_en is null and prioridad order by creado_en, id limit 20`)
  ).rows
  const [sd] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from tarjetas where resuelta_en is null and responsable_id is null`)).rows
  const lista: Urgencia[] = [
    ...pagos.map((p): Urgencia => ({ tipo: "pago", nivel: p.faltan <= GRAVE_PAGO_DIAS ? "grave" : "atencion", ...p })),
    ...dudas.map((d): Urgencia => ({ tipo: "duda", nivel: d.dias > GRAVE_DUDA_DIAS ? "grave" : "atencion", ...d })),
    ...prioridad.filter((p) => !dudas.some((d) => d.id === p.id)).map((p): Urgencia => ({ tipo: "prioridad", nivel: "atencion", ...p })),
    ...(sd && sd.n > 0 ? [{ tipo: "sin-dueno", nivel: "atencion", cuantas: sd.n } as Urgencia] : []),
  ]
  // Lo grave primero; dentro de cada nivel, el orden de arriba (pagos, dudas, prioridad, sin responsable).
  return [...lista.filter((u) => u.nivel === "grave"), ...lista.filter((u) => u.nivel !== "grave")]
}

/** Todo el Inicio en una vuelta: las lecturas van en paralelo. Gastos, solo si la cuenta puede verlos. */
export const leerInicio = async (conGastos: boolean) => {
  const [tablero, personas, clientes, gastos, dias, urgencias] = await Promise.all([
    leerTablero(),
    leerPersonas(),
    leerClientes(),
    conGastos ? leerGastos() : Promise.resolve(null),
    leerDias(),
    leerUrgencias(conGastos),
  ])
  return { tablero, personas, clientes, gastos, dias, urgencias }
}
export type DatosInicio = Awaited<ReturnType<typeof leerInicio>>
