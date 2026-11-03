import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { MATRIZ, PERMISOS, ROLES, tienePermiso } from "@/lib/permisos"

// La matriz del código tiene que ser la de docs/ARQUITECTURA.md §4 (docs/reglas/10 §3).
const leerMatrizDocumentada = () => {
  const doc = readFileSync("docs/ARQUITECTURA.md", "utf8")
  const seccion = doc.split("## 4. Roles y permisos")[1]!.split("\n## ")[0]!
  const filas = seccion.split("\n").filter((l) => /^\| `[a-z]+\.[a-z]+`/.test(l))
  const encabezado = seccion.split("\n").find((l) => l.startsWith("| Acción"))!
  const roles = encabezado.split("|").slice(2, -1).map((c) => c.trim().replaceAll("`", ""))
  const matriz: Record<string, string[]> = Object.fromEntries(roles.map((r) => [r, []]))
  for (const f of filas) {
    const celdas = f.split("|").slice(1, -1).map((c) => c.trim())
    const permiso = celdas[0]!.match(/`([a-z]+\.[a-z]+)`/)![1]!
    roles.forEach((r, i) => celdas[i + 1] === "✓" && matriz[r]!.push(permiso))
  }
  return matriz
}

describe("matriz rol × acción", () => {
  it("coincide con docs/ARQUITECTURA.md", () => {
    const doc = leerMatrizDocumentada()
    expect(Object.keys(doc).sort()).toEqual([...ROLES].sort())
    for (const r of ROLES) expect([...doc[r]!].sort()).toEqual([...MATRIZ[r]].sort())
  })

  it("una cuenta desactivada no tiene ningún permiso", () => {
    for (const p of PERMISOS) expect(tienePermiso({ rol: "admin", activo: false }, p)).toBe(false)
  })

  it("un rol desconocido no tiene ningún permiso", () => {
    for (const p of PERMISOS) expect(tienePermiso({ rol: "superadmin", activo: true }, p)).toBe(false)
  })
})
