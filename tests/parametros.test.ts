import { describe, expect, it } from "vitest"
import { leerCliente, leerGrupo, leerOrden, leerOrdenGrupos, leerVistaGrupos, SIN_GRUPO } from "@/lib/parametros"

// Los filtros y el orden viven en la URL: lo que no está en la lista cerrada vuelve al valor por defecto,
// nunca llega a la consulta (docs/reglas/07 §3).
describe("orden y filtros de Servicios", () => {
  it("sin nada, ordena por nombre de la A a la Z", () => {
    expect(leerOrden({})).toEqual({ orden: "nombre", dir: "asc" })
  })
  it("acepta solo las columnas de la lista", () => {
    expect(leerOrden({ orden: "actualizado", dir: "desc" })).toEqual({ orden: "actualizado", dir: "desc" })
    expect(leerOrden({ orden: "grupo" })).toEqual({ orden: "grupo", dir: "asc" })
    expect(leerOrden({ orden: "url; drop table proyectos", dir: "desc" })).toEqual({ orden: "nombre", dir: "desc" })
    expect(leerOrden({ orden: "nombre", dir: "cualquiera" })).toEqual({ orden: "nombre", dir: "asc" })
  })
  it("si el parámetro viene repetido toma el primero", () => {
    expect(leerOrden({ orden: ["grupo", "actualizado"] }).orden).toBe("grupo")
  })
  it("el grupo es un id, «ninguno» o nada", () => {
    const id = "0b9c2f7e-1a2b-4c3d-8e9f-0123456789ab"
    expect(leerGrupo(id.toUpperCase())).toBe(id)
    expect(leerGrupo(SIN_GRUPO)).toBe(SIN_GRUPO)
    expect(leerGrupo("1 or 1=1")).toBeNull()
    expect(leerGrupo(undefined)).toBeNull()
  })
})

describe("filtro de cliente en Servicios (D-032)", () => {
  const id = "0b9c2f7e-1a2b-4c3d-8e9f-0123456789ab"
  it("se lee de ?cliente= y, si no está, del ?grupo= de los links viejos", () => {
    expect(leerCliente({ cliente: id })).toBe(id)
    expect(leerCliente({ grupo: id })).toBe(id)
    expect(leerCliente({ cliente: SIN_GRUPO, grupo: id })).toBe(SIN_GRUPO)
    expect(leerCliente({ cliente: "x" })).toBeNull()
    expect(leerCliente({})).toBeNull()
  })
})

describe("vista y orden de Grupos", () => {
  it("por defecto, los activos por nombre", () => {
    expect(leerVistaGrupos({})).toBe("activos")
    expect(leerOrdenGrupos({})).toBe("nombre")
  })
  it("acepta solo lo que está en la lista", () => {
    expect(leerVistaGrupos({ ver: "vacios" })).toBe("vacios")
    expect(leerVistaGrupos({ ver: "archivados" })).toBe("archivados")
    expect(leerVistaGrupos({ ver: "todos" })).toBe("activos")
    expect(leerOrdenGrupos({ orden: "servicios" })).toBe("servicios")
    expect(leerOrdenGrupos({ orden: "nuevos" })).toBe("nuevos")
    expect(leerOrdenGrupos({ orden: "creado_en desc" })).toBe("nombre")
  })
})
