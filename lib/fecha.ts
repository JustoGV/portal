export const ZONA = "America/Argentina/Buenos_Aires"

const dia = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric" })
const diaHora = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })

export const formatDia = (d: Date | string) => dia.format(new Date(d))
export const formatDiaHora = (d: Date | string) => diaHora.format(new Date(d))
