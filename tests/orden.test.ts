import { sql } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"
import { ordenDeGrupos } from "@/dal/grupos"
import { ordenDe } from "@/dal/proyectos"

// El orden de una lista se arma en el servidor desde una lista cerrada, y siempre termina en un desempate
// único (el id): sin él, el orden entre páginas cambia (docs/reglas/07 §3). No toca la base.
const texto = (partes: unknown[]) => new PgDialect().sqlToQuery(sql.join(partes as never[], sql`, `))

describe("ordenDe (Servicios)", () => {
  it("por nombre, con el id de desempate y sin parámetros", () => {
    const q = texto(ordenDe())
    expect(q.sql).toMatch(/"nombre_clave" collate "es-x-icu" asc, .*"id"$/)
    expect(q.params).toEqual([])
  })
  it("invierte el sentido solo con «desc»", () => {
    expect(texto(ordenDe("nombre", "desc")).sql).toContain('collate "es-x-icu" desc')
    expect(texto(ordenDe("actualizado", "desc")).sql).toMatch(/"actualizado_en" desc, .*"nombre_clave".*"id"$/)
    expect(texto(ordenDe("actualizado", "asc")).sql).toMatch(/"actualizado_en" asc/)
  })
  it("por grupo deja al final los que no tienen grupo y desempata por nombre e id", () => {
    const q = texto(ordenDe("grupo", "asc"))
    expect(q.sql).toContain("nulls last")
    expect(q.sql).toMatch(/"nombre_clave".*"id"$/)
    expect(q.params).toEqual([])
  })
})

describe("ordenDeGrupos", () => {
  it("cada orden termina en el id del grupo", () => {
    for (const o of ["nombre", "servicios", "nuevos"] as const) expect(texto(ordenDeGrupos(o)).sql, o).toMatch(/"id" asc$/)
  })
  it("«servicios» pone primero los que tienen más y «nuevos» los creados último", () => {
    expect(texto(ordenDeGrupos("servicios")).sql).toMatch(/^count\(.*\) filter \(where .*"archivado_en" is null\) desc/)
    expect(texto(ordenDeGrupos("nuevos")).sql).toMatch(/^.*"creado_en" desc/)
  })
})
