// La forma de lo que devuelve una acción, y cómo se traduce un rechazo del guard. Sin "use server":
// desde un archivo de acciones solo se exportan funciones async (docs/reglas/06 §13).
import { AuthError } from "./auth-error"
import { comun } from "@/i18n/es/comun"

export type Resultado<T = undefined> =
  | ({ ok: true; mensaje?: string } & (T extends undefined ? { datos?: undefined } : { datos: T }))
  | { ok: false; mensaje: string; errores?: Record<string, string>; sesion?: "vencida" }

export type EstadoFormulario<T = undefined> = Resultado<T> | null

/** Un rechazo del guard como resultado; cualquier otro error sigue de largo (lo registra Sentry). */
export const rechazo = (e: unknown): { ok: false; mensaje: string; sesion?: "vencida" } => {
  if (e instanceof AuthError) {
    if (e.status === 401) return { ok: false, mensaje: comun.sesionVencida, sesion: "vencida" }
    if (e.motivo === "demasiadas-escrituras") return { ok: false, mensaje: comun.demasiadas }
    return { ok: false, mensaje: comun.sinPermiso }
  }
  throw e
}

/** El primer mensaje de cada campo de un error de zod. */
export const erroresPorCampo = (issues: readonly { path: readonly PropertyKey[]; message: string }[]) => {
  const r: Record<string, string> = {}
  for (const i of issues) {
    const k = String(i.path[0] ?? "")
    if (k && !r[k]) r[k] = i.message
  }
  return r
}
