import { limpiarTexto } from "./texto"

export const NOMBRE_PROYECTO_MAX = 80
export const NOMBRE_GRUPO_MAX = 40
export const DESCRIPCION_MAX = 200
export const NOMBRE_PERSONA_MAX = 80

/** La clave con la que la base compara nombres: la misma expresión que la columna generada. */
export const claveNombre = (nombre: string) => limpiarTexto(nombre).toLowerCase()
