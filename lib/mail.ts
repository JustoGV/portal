import { limpiarTexto } from "./texto"

// Las reglas de un mail, escritas una vez (docs/reglas/06 §regla 7): las usan Clientes (el mail del
// responsable, D-033) y Usuarios (el mail con el que se entra, D-034). Corren en el navegador y en el
// servidor. Que el dominio reciba correo se pregunta aparte, al guardar (lib/mail-dominio.ts).

export const MAIL_MAX = 254

/** Parte local con los caracteres que admite un buzón, y un dominio con etiquetas válidas y su terminación. */
const RE_MAIL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/u

/** El mail se guarda en minúsculas y sin espacios. */
export const normalizarMail = (v: string) => limpiarTexto(v).replace(/\s/gu, "").toLowerCase()

/** ¿Tiene forma de mail? Se le pasa ya normalizado. */
export const mailValido = (m: string) => m.length <= MAIL_MAX && RE_MAIL.test(m)

/** El dominio de un mail ya normalizado: «ana@gmail.com» → «gmail.com». */
export const dominioDe = (m: string) => m.slice(m.lastIndexOf("@") + 1)

/** Los dominios de mail más usados acá, para avisar de un error de tipeo («gmial.com»). */
const DOMINIOS_COMUNES = ["gmail.com", "hotmail.com", "hotmail.com.ar", "outlook.com", "outlook.com.ar", "yahoo.com", "yahoo.com.ar", "live.com", "live.com.ar", "icloud.com", "fibertel.com.ar", "speedy.com.ar"]
/** Terminaciones que no existen y se escriben seguido. */
const CORRECCIONES: Record<string, string> = { "gmail.com.ar": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "hotmail.con": "hotmail.com", "outlook.con": "outlook.com" }

const distancia = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0]![j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length]![b.length]!
}

/** «ana@gmial.com» → «ana@gmail.com». null si el dominio está bien o no se parece a uno conocido. */
export const sugerirMail = (v: string): string | null => {
  const m = normalizarMail(v)
  const arroba = m.lastIndexOf("@")
  if (arroba < 1) return null
  const dominio = m.slice(arroba + 1)
  if (DOMINIOS_COMUNES.includes(dominio)) return null
  const fijo = CORRECCIONES[dominio]
  if (fijo) return `${m.slice(0, arroba)}@${fijo}`
  let mejor: string | null = null
  let menor = 3
  for (const d of DOMINIOS_COMUNES) {
    const n = distancia(dominio, d)
    if (n > 0 && n < menor) [mejor, menor] = [d, n]
  }
  return mejor ? `${m.slice(0, arroba)}@${mejor}` : null
}
