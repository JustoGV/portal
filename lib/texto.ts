/** Recorta y colapsa los espacios repetidos (docs/reglas/06 §7). */
export const limpiarTexto = (texto: string) => texto.replace(/\s+/gu, " ").trim()

/** Escapa los comodines de LIKE que escribió la persona (docs/reglas/07 §5). */
export const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`)
