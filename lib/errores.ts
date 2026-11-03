/** El código de Postgres de un error, venga directo o envuelto por Drizzle. */
export const codigoPg = (e: unknown): string | undefined => {
  let actual: unknown = e
  for (let i = 0; i < 4 && actual && typeof actual === "object"; i++) {
    const o = actual as { code?: unknown; cause?: unknown }
    if (typeof o.code === "string" && /^[0-9A-Z]{5}$/.test(o.code)) return o.code
    actual = o.cause
  }
  return undefined
}

export const restriccionPg = (e: unknown): string | undefined => {
  let actual: unknown = e
  for (let i = 0; i < 4 && actual && typeof actual === "object"; i++) {
    const o = actual as { constraint?: unknown; cause?: unknown }
    if (typeof o.constraint === "string") return o.constraint
    actual = o.cause
  }
  return undefined
}
