import { limpiarTexto } from "./texto"

export const NOMBRE_PROYECTO_MAX = 80
export const NOMBRE_GRUPO_MAX = 40
export const DESCRIPCION_MAX = 200
export const NOMBRE_PERSONA_MAX = 80

/** La clave con la que la base compara nombres: la misma expresión que la columna generada. */
export const claveNombre = (nombre: string) => limpiarTexto(nombre).toLowerCase()

/** «María de los Ángeles Fernández» → «MF». */
export const iniciales = (nombre: string) => {
  const p = nombre
    .trim()
    .split(/\s+/u)
    // Solo palabras que empiezan con letra: «Prueba 24» no da «P2».
    .filter((x) => /^\p{L}/u.test(x) && (x.length > 2 || /^\p{Lu}/u.test(x)))
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? (p[p.length - 1]?.[0] ?? "") : "")).toUpperCase()
}
