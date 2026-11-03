import { describe, expect, it } from "vitest"
import { esquemaProyecto } from "@/lib/proyecto"

const base = { nombre: "  Panel   de ventas ", url: "ventas.misitio.com", descripcion: "", grupoId: "", grupoNuevo: "" }

describe("esquemaProyecto", () => {
  it("limpia el nombre y canoniza el link", () => {
    const r = esquemaProyecto.parse(base)
    expect(r).toMatchObject({ id: null, nombre: "Panel de ventas", url: "https://ventas.misitio.com/", descripcion: null, grupoId: null, grupoNuevo: null })
  })
  it("rechaza (no arregla) un grupo que no es un id", () => {
    expect(esquemaProyecto.safeParse({ ...base, grupoId: "1 or 1=1" }).success).toBe(false)
  })
  it("rechaza un link javascript:", () => {
    expect(esquemaProyecto.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(false)
  })
  it("rechaza un nombre vacío y uno largo", () => {
    expect(esquemaProyecto.safeParse({ ...base, nombre: "   " }).success).toBe(false)
    expect(esquemaProyecto.safeParse({ ...base, nombre: "a".repeat(81) }).success).toBe(false)
  })
  it("rechaza una descripción de más de 200", () => {
    expect(esquemaProyecto.safeParse({ ...base, descripcion: "a".repeat(201) }).success).toBe(false)
  })
})
