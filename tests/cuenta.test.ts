import { describe, expect, it } from "vitest"
import { esquemaClaveNueva, esquemaCuenta, esquemaEditarCuenta, esquemaMiNombre, MENSAJES_CUENTA, validarEmail, validarNombreCuenta } from "@/lib/cuenta"
import { nombreDispositivo } from "@/lib/dispositivo"
import { haceCuanto } from "@/lib/fecha"
import { dominioDe, mailValido, normalizarMail, sugerirMail } from "@/lib/mail"
import { iniciales } from "@/lib/nombre"

describe("cuentas (D-034)", () => {
  it("el mail de una cuenta sigue las mismas reglas que el del responsable de un cliente", () => {
    expect(validarEmail("Claudio.Perez@Gmail.com ")).toBeNull()
    expect(validarEmail("claudio@gmail")).toBe(MENSAJES_CUENTA.emailMal)
    expect(validarEmail("claudio..perez@gmail.com")).toBe(MENSAJES_CUENTA.emailMal)
    expect(validarEmail("")).toBe(MENSAJES_CUENTA.emailMal)
    expect(esquemaCuenta.parse({ nombre: " Claudio  Pérez ", email: " Claudio@Gmail.com" })).toEqual({ nombre: "Claudio Pérez", email: "claudio@gmail.com" })
    expect(esquemaCuenta.safeParse({ nombre: "Claudio", email: "claudio@gmail" }).success).toBe(false)
  })
  it("el nombre es obligatorio y tiene tope", () => {
    expect(validarNombreCuenta("   ")).toBe(MENSAJES_CUENTA.nombreFalta)
    expect(validarNombreCuenta("a".repeat(81))).toBe(MENSAJES_CUENTA.nombreLargo)
    expect(validarNombreCuenta("Claudio Pérez")).toBeNull()
  })
  it("editar cambia solo el nombre y pide un id válido", () => {
    expect(esquemaEditarCuenta.safeParse({ id: "x", nombre: "Ana" }).success).toBe(false)
    const r = esquemaEditarCuenta.parse({ id: "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b", nombre: " Ana ", email: "otro@gmail.com" })
    expect(r).toEqual({ id: "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b", nombre: "Ana" })
  })
  it("en Mi cuenta solo se cambia el nombre, y la cuenta no viaja en el pedido (D-035)", () => {
    expect(esquemaMiNombre.parse({ nombre: "  Mateo  Gaviraghi ", id: "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b", email: "otro@gmail.com" })).toEqual({ nombre: "Mateo Gaviraghi" })
    expect(esquemaMiNombre.safeParse({ nombre: "   " }).success).toBe(false)
    expect(esquemaMiNombre.safeParse({ nombre: "a".repeat(81) }).success).toBe(false)
  })
  it("la contraseña nueva pide la actual, 8 caracteres, repetirla igual y que no sea la misma", () => {
    const ok = { actual: "vieja-123", nueva: "nueva-1234", repetida: "nueva-1234" }
    expect(esquemaClaveNueva.safeParse(ok).success).toBe(true)
    expect(esquemaClaveNueva.safeParse({ ...ok, actual: "" }).success).toBe(false)
    expect(esquemaClaveNueva.safeParse({ ...ok, nueva: "corta", repetida: "corta" }).success).toBe(false)
    expect(esquemaClaveNueva.safeParse({ ...ok, repetida: "otra-1234" }).success).toBe(false)
    expect(esquemaClaveNueva.safeParse({ ...ok, nueva: "vieja-123", repetida: "vieja-123" }).success).toBe(false)
    // Se puede pegar una larga de un gestor (ASVS 6.2.9: al menos 64).
    const larga = "x".repeat(64)
    expect(esquemaClaveNueva.safeParse({ ...ok, nueva: larga, repetida: larga }).success).toBe(true)
  })
  it("reglas del mail comunes", () => {
    expect(normalizarMail(" Ana @Gmail.com")).toBe("ana@gmail.com")
    expect(mailValido("ana@sanatorio.com.ar")).toBe(true)
    expect(dominioDe("ana@sanatorio.com.ar")).toBe("sanatorio.com.ar")
    expect(sugerirMail("ana@gmial.com")).toBe("ana@gmail.com")
  })
  it("las iniciales salen del primer y el último nombre", () => {
    expect(iniciales("María de los Ángeles Fernández")).toBe("MF")
    expect(iniciales("Claudio")).toBe("C")
  })
})

describe("de dónde está abierta una sesión", () => {
  it("nombra navegador y sistema como lo diría una persona", () => {
    expect(nombreDispositivo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")).toBe("Chrome en Windows")
    expect(nombreDispositivo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0")).toBe("Edge en Windows")
    expect(nombreDispositivo("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari en iPhone")
    expect(nombreDispositivo("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5; rv:132.0) Gecko/20100101 Firefox/132.0")).toBe("Firefox en Mac")
    expect(nombreDispositivo(null)).toBe("Otro navegador")
  })
})

describe("cuánto pasó", () => {
  const ahora = new Date("2026-11-17T15:00:00Z")
  it("dice el tiempo como se dice", () => {
    expect(haceCuanto("2026-11-17T14:59:30Z", ahora)).toBe("recién")
    expect(haceCuanto("2026-11-17T14:55:00Z", ahora)).toBe("hace 5 min")
    expect(haceCuanto("2026-11-17T12:00:00Z", ahora)).toBe("hace 3 h")
    expect(haceCuanto("2026-11-16T12:00:00Z", ahora)).toBe("ayer")
    expect(haceCuanto("2026-11-13T12:00:00Z", ahora)).toBe("hace 4 días")
    expect(haceCuanto("2026-09-01T12:00:00Z", ahora)).toBe("01/09/2026")
  })
})
