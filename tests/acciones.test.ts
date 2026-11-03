import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// Toda función async exportada desde un archivo "use server" es una acción pública: tiene que empezar
// por el guard (docs/reglas/10 §3). Este test lee los archivos y lo comprueba.
const GUARDAS = /await (exigir|exigirEscritura)\(|await sesion\(\)/
const archivos = readdirSync("acciones").filter((f) => f.endsWith(".ts"))

describe("acciones del servidor", () => {
  it("hay acciones para revisar", () => expect(archivos.length).toBeGreaterThan(0))

  for (const f of archivos) {
    const fuente = readFileSync(`acciones/${f}`, "utf8")
    it(`${f} es "use server" y no exporta constantes`, () => {
      expect(fuente.startsWith('"use server"')).toBe(true)
      expect(fuente).not.toMatch(/^export (const|let|var) /m)
    })
    const exportadas = [...fuente.matchAll(/^export async function (\w+)\([^]*?\n\}/gm)]
    for (const [cuerpo, nombre] of exportadas) {
      it(`${f} → ${nombre} pasa por el guard`, () => {
        // Directamente, o llamando a una función interna del mismo archivo que lo hace.
        const internas = [...cuerpo!.matchAll(/return (\w+)\(/g)].map((m) => m[1]!)
        const directa = GUARDAS.test(cuerpo!)
        const indirecta = internas.some((n) => {
          const m = fuente.match(new RegExp(`async function ${n}\\([^]*?\\n\\}`))
          return m ? GUARDAS.test(m[0]) : false
        })
        expect(directa || indirecta).toBe(true)
      })
    }
  }
})
