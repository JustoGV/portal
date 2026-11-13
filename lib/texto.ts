/** Recorta y colapsa los espacios repetidos (docs/reglas/06 §7). */
export const limpiarTexto = (texto: string) => texto.replace(/\s+/gu, " ").trim()

/** Escapa los comodines de LIKE que escribió la persona (docs/reglas/07 §5). */
export const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`)

// Saltos de línea (regla de Mateo, 2026-10-26): un renglón nunca termina en una palabra corta de enlace
// («de», «la», «y», «con», «para», «más»…) ni deja una sola palabra abajo. `pegar` une cada palabra de
// enlace con la que sigue, y las dos últimas entre sí, con un espacio duro (U+00A0): el navegador las pasa
// juntas al renglón siguiente. Solo para mostrar: lo guardado no cambia.
const DURO = "\u00a0"
const RE_ENLACE =
  /(?<=^|[\s\u00a0(«"“¿¡])(lo|la|el|los|las|le|les|de|del|y|e|o|u|ni|con|para|más|por|en|a|al|un|una|unos|unas|que|tu|tus|su|sus|sin|se|es|mi|te)[ \t]+(?=\S)/giu
const RE_ULTIMAS = /[ \t]+(\S+)[ \t]*$/gmu

export const pegar = (texto: string) => texto.replace(RE_ENLACE, `$1${DURO}`).replace(RE_ULTIMAS, `${DURO}$1`)
