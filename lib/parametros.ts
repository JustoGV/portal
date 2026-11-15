// Los filtros viven en la URL (docs/reglas/07 §3). Un valor inválido vuelve al de por defecto, nunca a un error.
export const POR_PAGINA = [10, 25, 50] as const
export type PorPagina = (typeof POR_PAGINA)[number]

export type ParametrosLista = Record<string, string | string[] | undefined>

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export const leerPagina = (p: ParametrosLista) => {
  const n = Number(uno(p.pagina))
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1
}
export const leerPorPagina = (p: ParametrosLista): PorPagina => {
  const n = Number(uno(p.por))
  return (POR_PAGINA as readonly number[]).includes(n) ? (n as PorPagina) : 25
}
export const leerBusqueda = (p: ParametrosLista) => (uno(p.q) ?? "").replace(/\s+/gu, " ").trim().slice(0, 80)
export const leerEstado = (p: ParametrosLista): "activos" | "archivados" => (uno(p.estado) === "archivados" ? "archivados" : "activos")
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const leerUuid = (v: string | string[] | undefined) => {
  const s = uno(v)
  return s && UUID.test(s) ? s.toLowerCase() : null
}
export const esUuid = (s: string) => UUID.test(s)

/** El filtro de grupo: un grupo, "ninguno" (los que no tienen grupo) o todos (null). */
export const SIN_GRUPO = "ninguno"
export const leerGrupo = (v: string | string[] | undefined) => (uno(v) === SIN_GRUPO ? SIN_GRUPO : leerUuid(v))

/** Por qué columna se ordena la tabla y hacia dónde. Por defecto, por nombre de la A a la Z. */
export const ORDENES = ["nombre", "grupo", "actualizado"] as const
export type Orden = (typeof ORDENES)[number]
export const leerOrden = (p: ParametrosLista): { orden: Orden; dir: "asc" | "desc" } => {
  const o = uno(p.orden)
  return { orden: (ORDENES as readonly string[]).includes(o ?? "") ? (o as Orden) : "nombre", dir: uno(p.dir) === "desc" ? "desc" : "asc" }
}

/** La misma dirección con algunos parámetros cambiados. `null` saca el parámetro. */
export const conParametros = (ruta: string, actuales: Record<string, string | null | undefined>, cambios: Record<string, string | number | null>) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(actuales)) if (v) q.set(k, v)
  for (const [k, v] of Object.entries(cambios)) {
    if (v === null || v === "") q.delete(k)
    else q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `${ruta}?${s}` : ruta
}
