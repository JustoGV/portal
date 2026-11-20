// De dónde está abierta una sesión, dicho como lo diría una persona: «Chrome en Windows» (D-034).
// Sale del user agent que guarda better-auth; no se muestra la dirección IP. Sin librería: solo hacen
// falta el navegador y el sistema, y un user agent raro queda como «Otro navegador».

const NAVEGADORES: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//u, "Edge"],
  [/OPR\/|Opera/u, "Opera"],
  [/SamsungBrowser\//u, "Samsung Internet"],
  [/Firefox\/|FxiOS\//u, "Firefox"],
  [/Chrome\/|CriOS\//u, "Chrome"],
  [/Safari\//u, "Safari"],
]

const SISTEMAS: [RegExp, string][] = [
  [/iPhone/u, "iPhone"],
  [/iPad/u, "iPad"],
  [/Android/u, "Android"],
  [/Windows/u, "Windows"],
  [/Mac OS X|Macintosh/u, "Mac"],
  [/CrOS/u, "ChromeOS"],
  [/Linux/u, "Linux"],
]

export type Dispositivo = { navegador: string | null; sistema: string | null; movil: boolean }

export const leerDispositivo = (ua: string | null | undefined): Dispositivo => {
  const u = ua ?? ""
  const navegador = NAVEGADORES.find(([re]) => re.test(u))?.[1] ?? null
  const sistema = SISTEMAS.find(([re]) => re.test(u))?.[1] ?? null
  return { navegador, sistema, movil: /iPhone|Android.*Mobile|Mobile Safari/u.test(u) }
}

/** «Chrome en Windows», «Safari en iPhone», «Firefox», «Otro navegador». */
export const nombreDispositivo = (ua: string | null | undefined) => {
  const { navegador, sistema } = leerDispositivo(ua)
  if (navegador && sistema) return `${navegador} en ${sistema}`
  return navegador ?? (sistema ? `Navegador en ${sistema}` : "Otro navegador")
}
