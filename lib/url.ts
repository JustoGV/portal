// La regla del link de un proyecto (D-003). La usan el campo mientras se escribe y la acción al
// guardar; la base la repite con un check (proyectos_url_https).
export const URL_MAX = 2048

export type ResultadoUrl = { ok: true; url: string } | { ok: false; error: "vacio" | "formato" | "https" | "largo" }

/**
 * Valida y devuelve la forma canónica (la que se guarda y se compara para el duplicado).
 * Si falta el esquema, se asume https:// ("misitio.com" → "https://misitio.com/").
 */
export const normalizarUrl = (entrada: string): ResultadoUrl => {
  const texto = entrada.trim()
  if (texto === "") return { ok: false, error: "vacio" }
  if (/\s/u.test(texto)) return { ok: false, error: "formato" }
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`
  let u: URL
  try {
    u = new URL(conEsquema)
  } catch {
    return { ok: false, error: "formato" }
  }
  // Solo https: un javascript:, data: o http: no se guarda nunca (docs/ARQUITECTURA.md §5).
  if (u.protocol !== "https:") return { ok: false, error: "https" }
  if (!u.hostname || (!u.hostname.includes(".") && u.hostname !== "localhost")) return { ok: false, error: "formato" }
  if (u.username || u.password) return { ok: false, error: "formato" }
  const url = u.href
  if (url.length > URL_MAX) return { ok: false, error: "largo" }
  return { ok: true, url }
}

export const MENSAJE_URL: Record<Exclude<ResultadoUrl, { ok: true }>["error"], string> = {
  vacio: "Pegá el link del proyecto",
  formato: "Revisá el link: tiene que ser una dirección web, por ejemplo https://misitio.com",
  https: "El link tiene que empezar con https://",
  largo: "El link es demasiado largo",
}

/** Lo que se muestra en la tabla: el sitio sin el esquema. */
export const sitioDe = (url: string) => {
  try {
    const u = new URL(url)
    return `${u.host}${u.pathname === "/" ? "" : u.pathname}`
  } catch {
    return url
  }
}
