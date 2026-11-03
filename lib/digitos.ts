// docs/reglas/06 §2: la base de los campos de números.
/** Los dígitos de lo que se tipeó, con puntos, espacios o guiones incluidos. */
export const soloDigitos = (texto: string) => texto.replace(/\D/g, "")

/**
 * Lo que un campo de hasta `maximo` dígitos acepta de un cambio: solo dígitos; un dígito de más se
 * rechaza (null: el campo queda como estaba), un pegado largo deja sus primeros `maximo`, y borrar
 * siempre se permite.
 */
export const aceptarDigitos = (nuevo: string, actual: string, maximo: number): string | null => {
  const d = soloDigitos(nuevo)
  if (d.length <= maximo) return d
  if (soloDigitos(actual).length >= maximo) return null
  return d.slice(0, maximo)
}
