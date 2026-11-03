import { describe, expect, it } from "vitest"

// Sin verdes silenciosos (docs/reglas/11 §6): en CI, la base de prueba tiene que estar.
describe("entorno de CI", () => {
  it.runIf(process.env.CI === "true")("tiene la base temporal", () => {
    expect(process.env.DATABASE_URL_DIRECT, "falta DATABASE_URL_DIRECT en CI").toBeTruthy()
  })
  it("corre", () => expect(true).toBe(true))
})
