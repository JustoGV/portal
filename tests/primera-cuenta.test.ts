import { describe, expect, it } from "vitest"
import { esquemaPrimeraCuenta, MENSAJES_CUENTA } from "@/lib/cuenta"

const base = { nombre: "  Ana  Pérez ", email: " Ana@Example.com ", clave: "una frase larga", repetida: "una frase larga" }
const errorDe = (datos: Record<string, string>, campo: string) => {
  const r = esquemaPrimeraCuenta.safeParse(datos)
  return r.success ? undefined : r.error.issues.find((i) => i.path[0] === campo)?.message
}

describe("la primera cuenta (D-015)", () => {
  it("limpia el nombre y normaliza el email", () => {
    const r = esquemaPrimeraCuenta.parse(base)
    expect(r.nombre).toBe("Ana Pérez")
    expect(r.email).toBe("ana@example.com")
  })

  it("pide una contraseña de al menos 8 caracteres", () => {
    expect(errorDe({ ...base, clave: "corta", repetida: "corta" }, "clave")).toBe(MENSAJES_CUENTA.claveCorta)
  })

  it("las dos contraseñas tienen que coincidir", () => {
    expect(errorDe({ ...base, repetida: "otra frase larga" }, "repetida")).toBe(MENSAJES_CUENTA.claveDistinta)
  })

  it("rechaza un email mal escrito y un nombre vacío", () => {
    expect(errorDe({ ...base, email: "ana@" }, "email")).toBe(MENSAJES_CUENTA.emailMal)
    expect(errorDe({ ...base, nombre: "   " }, "nombre")).toBe(MENSAJES_CUENTA.nombreFalta)
  })
})
