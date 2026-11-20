import "server-only"
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { gastos, usuarios } from "@/db/schema"
import type { FilaGasto, Frecuencia, Moneda } from "@/lib/gasto"

// Lecturas de Gastos (D-043). Quien llama ya pasó por el guard (la página o la acción).

export type VistaGastos = "activos" | "semana" | "archivados"
export type FiltroGastos = { vista: VistaGastos; pagina: number; por: number }

/** Hoy en Buenos Aires (docs/reglas/11): el próximo pago se cuenta desde este día. */
const hoy = sql`(now() at time zone 'America/Argentina/Buenos_Aires')::date`
const proximo = sql`proximo_pago(${gastos.diaPago}, ${gastos.mesPago}, ${hoy})`

const condVista = (vista: VistaGastos) =>
  vista === "archivados" ? isNotNull(gastos.archivadoEn) : vista === "semana" ? and(isNull(gastos.archivadoEn), sql`${proximo} <= ${hoy} + 7`) : isNull(gastos.archivadoEn)

/** Una página, ordenada por lo que vence primero, con el total en la misma lectura (docs/reglas/07 §3). */
export const listarGastos = async (f: FiltroGastos): Promise<{ filas: FilaGasto[]; total: number }> => {
  const donde = condVista(f.vista)
  const filas = await db
    .select({
      id: gastos.id,
      nombre: gastos.nombre,
      descripcion: gastos.descripcion,
      monto: sql<string>`${gastos.monto}::text`,
      moneda: sql<Moneda>`${gastos.moneda}`,
      frecuencia: sql<Frecuencia>`${gastos.frecuencia}`,
      diaPago: gastos.diaPago,
      mesPago: gastos.mesPago,
      medioPago: gastos.medioPago,
      pagaId: gastos.pagaId,
      pagaNombre: usuarios.nombre,
      proximoPago: sql<string>`${proximo}::text`,
      faltan: sql<number>`(${proximo} - ${hoy})`.mapWith(Number),
      actualizadoEn: sql<string>`${gastos.actualizadoEn}::text`,
      archivadoEn: sql<string | null>`${gastos.archivadoEn}::text`,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(gastos)
    .innerJoin(usuarios, eq(usuarios.id, gastos.pagaId))
    .where(donde)
    .orderBy(sql`${proximo}`, sql`lower(${gastos.nombre}) collate "es-x-icu"`, gastos.id)
    .limit(f.por)
    .offset((f.pagina - 1) * f.por)
  let total = filas[0]?.total ?? 0
  if (filas.length === 0 && f.pagina > 1) {
    const [c] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(gastos).where(donde)
    total = c?.n ?? 0
  }
  return { filas: filas.map(({ total: _, ...resto }) => resto), total }
}

/**
 * Las cifras de arriba: cuánto se va por mes en cada moneda (lo anual dividido 12), cuántos vencen en los
 * próximos 7 días, activos y archivados. Las sumas viajan como texto: nunca pasan por un number.
 */
export const cifrasGastos = async () => {
  const [c] = await db
    .select({
      pesos: sql<string>`coalesce(round(sum(case when ${gastos.frecuencia} = 'anual' then ${gastos.monto} / 12 else ${gastos.monto} end) filter (where ${gastos.archivadoEn} is null and ${gastos.moneda} = 'ARS'), 2), 0)::text`,
      dolares: sql<string>`coalesce(round(sum(case when ${gastos.frecuencia} = 'anual' then ${gastos.monto} / 12 else ${gastos.monto} end) filter (where ${gastos.archivadoEn} is null and ${gastos.moneda} = 'USD'), 2), 0)::text`,
      semana: sql<number>`count(*) filter (where ${gastos.archivadoEn} is null and ${proximo} <= ${hoy} + 7)`.mapWith(Number),
      activos: sql<number>`count(*) filter (where ${gastos.archivadoEn} is null)`.mapWith(Number),
      archivados: sql<number>`count(*) filter (where ${gastos.archivadoEn} is not null)`.mapWith(Number),
    })
    .from(gastos)
  return { pesos: c?.pesos ?? "0", dolares: c?.dolares ?? "0", semana: c?.semana ?? 0, activos: c?.activos ?? 0, archivados: c?.archivados ?? 0 }
}

/** Quién puede pagar: las cuentas activas, por nombre. Son pocas (los socios). */
export const listarPagadores = () =>
  db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.activo, true))
    .orderBy(asc(sql`lower(${usuarios.nombre}) collate "es-x-icu"`), usuarios.id)
    .limit(50)
