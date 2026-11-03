import { describe, expect, it } from "vitest"
import { destinoSeguro } from "@/lib/destino"

describe("destinoSeguro (docs/reglas/10 §2.8)", () => {
  it.each([
    ["/\\evil.com", "/"],
    ["/%09/evil.com", "/"],
    ["//evil.com", "/"],
    ["/\t/evil.com", "/"],
    ["https://evil.com", "/"],
    ["javascript:alert(1)", "/"],
    ["", "/"],
    [null, "/"],
  ])("rechaza %j", (entrada, salida) => {
    expect(destinoSeguro(entrada as string | null)).toBe(salida)
  })

  it.each([
    ["/", "/"],
    ["/grupos", "/grupos"],
    ["/?q=panel&estado=archivados", "/?q=panel&estado=archivados"],
  ])("acepta %j", (entrada, salida) => {
    expect(destinoSeguro(entrada)).toBe(salida)
  })
})
