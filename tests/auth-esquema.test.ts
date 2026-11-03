import { getTableColumns } from "drizzle-orm"
import { getSchema } from "better-auth/db"
import { twoFactor } from "better-auth/plugins/two-factor"
import { describe, expect, it } from "vitest"
import * as s from "@/db/schema"

// Si se actualiza better-auth y cambian sus tablas, esto avisa antes de que falle en producción.
const tablas = { user: s.authUser, session: s.authSession, account: s.authAccount, verification: s.authVerification, twoFactor: s.authTwoFactor, rateLimit: s.authRateLimit }

describe("tablas de better-auth", () => {
  const esperado = getSchema({ plugins: [twoFactor()], rateLimit: { storage: "database", enabled: true } } as Parameters<typeof getSchema>[0])
  for (const [modelo, tabla] of Object.entries(tablas)) {
    it(`${modelo} tiene todos los campos`, () => {
      const campos = Object.keys(esperado[modelo]!.fields)
      const columnas = Object.keys(getTableColumns(tabla))
      for (const c of campos) expect(columnas, `falta ${modelo}.${c}`).toContain(c)
    })
  }
})
