// Adónde volver después del login (docs/reglas/10 §2.8). `?volver=` no es confiable: el parser de URLs
// ignora tabulaciones y saltos de línea y trata `\` como `/`, así que se compara el origen y, además,
// se rechaza cualquier valor que decodificado traiga caracteres de control o barras invertidas.
const BASE = "https://portal.invalid"

const decodificar = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return null
  }
}

export const destinoSeguro = (volver?: string | null) => {
  if (!volver || !volver.startsWith("/")) return "/"
  const d = decodificar(volver)
  if (d === null || /[\u0000-\u001f\u007f\\]/.test(d) || d.startsWith("//")) return "/"
  try {
    const u = new URL(volver, BASE)
    return u.origin === BASE ? `${u.pathname}${u.search}${u.hash}` : "/"
  } catch {
    return "/"
  }
}
