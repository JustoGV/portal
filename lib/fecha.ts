export const ZONA = "America/Argentina/Buenos_Aires"

const dia = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric" })
const diaHora = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })

export const formatDia = (d: Date | string) => dia.format(new Date(d))
export const formatDiaHora = (d: Date | string) => diaHora.format(new Date(d))

const MINUTO = 60_000
const HORA = 60 * MINUTO
const DIA = 24 * HORA

/** Cuánto pasó, como se dice: «recién», «hace 5 min», «hace 3 h», «ayer», «hace 4 días»; más de un mes, la fecha. */
export const haceCuanto = (d: Date | string, ahora: Date = new Date()) => {
  const ms = ahora.getTime() - new Date(d).getTime()
  if (ms < MINUTO) return "recién"
  if (ms < HORA) return `hace ${Math.floor(ms / MINUTO)} min`
  if (ms < DIA) return `hace ${Math.floor(ms / HORA)} h`
  const dias = Math.floor(ms / DIA)
  if (dias === 1) return "ayer"
  if (dias < 31) return `hace ${dias} días`
  return formatDia(d)
}
