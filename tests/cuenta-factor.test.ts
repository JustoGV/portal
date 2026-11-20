import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { agruparSecreto, claveIntentosFactor, codigoFactorValido, esquemaClaveFactor, esquemaCodigoFactor, FACTOR_INTENTOS, secretoDeUri, textoCodigos } from "@/lib/cuenta"

describe("segundo factor desde Mi cuenta (D-044)", () => {
  it("el código son exactamente 6 números", () => {
    expect(codigoFactorValido("123456")).toBe(true)
    expect(codigoFactorValido("12345")).toBe(false)
    expect(codigoFactorValido("1234567")).toBe(false)
    expect(codigoFactorValido("12a456")).toBe(false)
    expect(esquemaCodigoFactor.parse({ codigo: " 123456 " })).toEqual({ codigo: "123456" })
  })
  it("la contraseña es obligatoria y tiene tope", () => {
    expect(esquemaClaveFactor.safeParse({ clave: "" }).success).toBe(false)
    expect(esquemaClaveFactor.safeParse({ clave: "x".repeat(200) }).success).toBe(false)
    expect(esquemaClaveFactor.safeParse({ clave: "una-clave" }).success).toBe(true)
  })
  it("la clave de la app sale de la dirección otpauth y se muestra en grupos de 4", () => {
    const uri = "otpauth://totp/portal-cess-gvg:mateo%40ejemplo.com?secret=JBSWY3DPEHPK3PXP&issuer=portal-cess-gvg&digits=6&period=30"
    expect(secretoDeUri(uri)).toBe("JBSWY3DPEHPK3PXP")
    expect(agruparSecreto("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP")
    expect(secretoDeUri("otpauth://totp/x?secret=no-es-base32")).toBeNull()
    expect(secretoDeUri("cualquier cosa")).toBeNull()
  })
  it("los intentos se cuentan por cuenta, con una clave que no es un mail", () => {
    expect(FACTOR_INTENTOS).toBe(5)
    expect(claveIntentosFactor("abc")).toBe("factor:abc")
    expect(claveIntentosFactor("abc")).not.toContain("@")
  })
  it("el archivo de códigos trae la cuenta y un código por línea", () => {
    const txt = textoCodigos(["aaaa-bbbb", "cccc-dddd"], "mateo@ejemplo.com", "20/11/2026")
    expect(txt).toContain("mateo@ejemplo.com")
    expect(txt.split("\n")).toEqual(expect.arrayContaining(["aaaa-bbbb", "cccc-dddd"]))
  })
  it("las acciones tocan siempre la cuenta de la sesión: ninguna recibe un id", () => {
    const fuente = readFileSync("acciones/cuenta.ts", "utf8")
    for (const n of ["empezarFactor", "confirmarFactor", "codigosNuevos", "quitarFactor"]) {
      const firma = fuente.match(new RegExp(`export async function ${n}\(([^)]*)\)`))?.[1] ?? ""
      expect(firma).not.toMatch(/id/i)
    }
  })
})
