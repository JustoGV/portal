import { describe, expect, it } from "vitest"
import { fechaCorta } from "@/components/tablero/listas"
import { esquemaComentario, esquemaMover, esquemaNuevaTarjeta, reordenar, tonoDe, TONOS } from "@/lib/tablero"

const ID = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b"
const base = { lista: "tareas", titulo: "Cargar el IR-03", descripcion: "", proyectoId: null, grupoId: null, responsableId: ID, prioridad: false, respuestas: [] }

describe("alta de una tarjeta", () => {
  it("limpia el título y deja el texto vacío como nulo", () => {
    const r = esquemaNuevaTarjeta.parse({ ...base, titulo: "  Cargar   el IR-03 " })
    expect(r.titulo).toBe("Cargar el IR-03")
    expect(r.descripcion).toBeNull()
  })
  it("rechaza una lista que no existe, un campo de más y un título vacío o largo", () => {
    expect(esquemaNuevaTarjeta.safeParse({ ...base, lista: "otra" }).success).toBe(false)
    expect(esquemaNuevaTarjeta.safeParse({ ...base, rol: "admin" }).success).toBe(false)
    expect(esquemaNuevaTarjeta.safeParse({ ...base, titulo: "   " }).success).toBe(false)
    expect(esquemaNuevaTarjeta.safeParse({ ...base, titulo: "x".repeat(121) }).success).toBe(false)
  })
  it("una duda no tiene persona, y una tarjeta no lleva servicio y cliente a la vez", () => {
    expect(esquemaNuevaTarjeta.safeParse({ ...base, lista: "dudas" }).success).toBe(false)
    expect(esquemaNuevaTarjeta.safeParse({ ...base, lista: "dudas", responsableId: null }).success).toBe(true)
    expect(esquemaNuevaTarjeta.safeParse({ ...base, proyectoId: ID, grupoId: ID }).success).toBe(false)
  })
  it("rechaza un id que no es uuid", () => {
    expect(esquemaNuevaTarjeta.safeParse({ ...base, responsableId: "1 or 1=1" }).success).toBe(false)
  })
})

describe("mover y comentar", () => {
  it("el lugar es un entero entre 0 y 200", () => {
    expect(esquemaMover.safeParse({ id: ID, lista: "dudas", indice: 0 }).success).toBe(true)
    expect(esquemaMover.safeParse({ id: ID, lista: "dudas", indice: -1 }).success).toBe(false)
    expect(esquemaMover.safeParse({ id: ID, lista: "dudas", indice: 1.5 }).success).toBe(false)
  })
  it("un comentario vacío o de más de 2.000 letras no entra", () => {
    expect(esquemaComentario.safeParse({ tarjetaId: ID, respuestaA: null, texto: "  " }).success).toBe(false)
    expect(esquemaComentario.safeParse({ tarjetaId: ID, respuestaA: null, texto: "x".repeat(2001) }).success).toBe(false)
    expect(esquemaComentario.parse({ tarjetaId: ID, respuestaA: null, texto: " hola " }).texto).toBe("hola")
  })
})

describe("reordenar", () => {
  it("dentro de la misma lista", () => {
    expect(reordenar(["a", "b", "c"], [], "a", 2, true)).toEqual({ origen: ["b", "c", "a"], destino: ["b", "c", "a"] })
  })
  it("de una lista a otra, con el lugar acotado al largo", () => {
    expect(reordenar(["a", "b"], ["x", "y"], "a", 1, false)).toEqual({ origen: ["b"], destino: ["x", "a", "y"] })
    expect(reordenar(["a"], ["x"], "a", 99, false)).toEqual({ origen: [], destino: ["x", "a"] })
  })
})

describe("cómo se ve", () => {
  it("el color sale siempre igual del id", () => {
    expect(tonoDe(ID)).toBe(tonoDe(ID))
    expect(TONOS).toContain(tonoDe(ID))
  })
  it("la fecha corta dice hoy, ayer o el día", () => {
    const ahora = new Date("2026-11-19T15:00:00Z")
    expect(fechaCorta("2026-11-19T12:00:00Z", ahora)).toBe("hoy")
    expect(fechaCorta("2026-11-18T12:00:00Z", ahora)).toBe("ayer")
    expect(fechaCorta("2026-11-09T12:00:00Z", ahora)).toBe("9 nov")
  })
})
