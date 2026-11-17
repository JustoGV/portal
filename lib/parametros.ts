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
  return (POR_PAGINA as readonly number[]).includes(n) ? (n as PorPagina) : 10
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
/** En la URL de Servicios el filtro se llama `cliente` (D-032). `grupo` se sigue leyendo: los links viejos no se rompen. */
export const leerCliente = (p: ParametrosLista) => leerGrupo(p.cliente ?? p.grupo)

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

/** La pantalla Clientes (WU-06 pantalla 4; por dentro, grupos: D-032): qué se ve y en qué orden. Listas cerradas; lo inválido vuelve al valor por defecto. */
export const VISTAS_GRUPOS = ["activos", "vacios", "archivados"] as const
export type VistaGrupos = (typeof VISTAS_GRUPOS)[number]
export const leerVistaGrupos = (p: ParametrosLista): VistaGrupos => {
  const v = uno(p.ver)
  return (VISTAS_GRUPOS as readonly string[]).includes(v ?? "") ? (v as VistaGrupos) : "activos"
}
/** Clientes (D-033): con o sin responsable, con o sin servicios. null es «todos». */
export type SiNo = "con" | "sin"
export const leerSiNo = (v: string | string[] | undefined): SiNo | null => {
  const s = uno(v)
  return s === "con" || s === "sin" ? s : null
}
/** Los clientes van de a 12: entran justo en filas de 4, 3, 2 y 1. */
export const POR_PAGINA_CLIENTES = 12
export const ORDENES_GRUPOS = ["nombre", "servicios", "nuevos"] as const
export type OrdenGrupos = (typeof ORDENES_GRUPOS)[number]
export const leerOrdenGrupos = (p: ParametrosLista): OrdenGrupos => {
  const o = uno(p.orden)
  return (ORDENES_GRUPOS as readonly string[]).includes(o ?? "") ? (o as OrdenGrupos) : "nombre"
}
