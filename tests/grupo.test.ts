import { describe, expect, it } from "vitest"
import {
  camposCambiados,
  esquemaGrupo,
  formatearDni,
  formatearTelefono,
  MENSAJES_RESPONSABLE,
  SERVICIOS_POR_GRUPO_MAX,
  sugerirMail,
  validarCargo,
  validarDni,
  validarMail,
  validarNombreGrupo,
  validarResponsableNombre,
  validarTelefono,
} from "@/lib/grupo"

const a = "0b9c2f7e-1a2b-4c3d-8e9f-0123456789ab"
const b = "1c8d3e6f-2b3c-4d5e-9f0a-123456789abc"

describe("esquemaGrupo", () => {
  it("limpia el nombre; sin el paso de servicios no los toca", () => {
    expect(esquemaGrupo.parse({ nombre: "  Clientes   del interior " })).toEqual({
      id: null,
      nombre: "Clientes del interior",
      conResponsable: false,
      responsableNombre: null,
      responsableCargo: null,
      responsableMail: null,
      responsableTelefono: null,
      responsableDni: null,
      conServicios: false,
      servicios: [],
    })
  })
  it("lee los servicios marcados, sin repetidos y en minúscula", () => {
    const r = esquemaGrupo.parse({ id: a, nombre: "Internos", conServicios: "1", servicios: `${a},${b.toUpperCase()},${a}` })
    expect(r).toMatchObject({ id: a, nombre: "Internos", conServicios: true, servicios: [a, b] })
  })
  it("con el paso mandado y nada marcado, el grupo queda vacío", () => {
    expect(esquemaGrupo.parse({ nombre: "Vacío", conServicios: "1", servicios: "" })).toMatchObject({ conServicios: true, servicios: [] })
  })
  it("rechaza (no arregla) un servicio que no es un id", () => {
    expect(esquemaGrupo.safeParse({ nombre: "X", conServicios: "1", servicios: `${a},1 or 1=1` }).success).toBe(false)
  })
  it("rechaza más servicios que el tope", () => {
    const muchos = Array.from({ length: SERVICIOS_POR_GRUPO_MAX + 1 }, (_, i) => `${String(i).padStart(8, "0")}-1a2b-4c3d-8e9f-0123456789ab`).join(",")
    expect(esquemaGrupo.safeParse({ nombre: "X", conServicios: "1", servicios: muchos }).success).toBe(false)
  })
  it("rechaza un nombre vacío, uno largo y un id que no es un id", () => {
    expect(esquemaGrupo.safeParse({ nombre: "   " }).success).toBe(false)
    expect(esquemaGrupo.safeParse({ nombre: "a".repeat(41) }).success).toBe(false)
    expect(esquemaGrupo.safeParse({ id: "7", nombre: "X" }).success).toBe(false)
  })
})

describe("validarNombreGrupo", () => {
  it("dice qué hacer", () => {
    expect(validarNombreGrupo("  ")).toBe("Escribí el nombre del cliente")
    expect(validarNombreGrupo("a".repeat(41))).toBe("El nombre tiene hasta 40 letras")
    expect(validarNombreGrupo("Clientes")).toBeNull()
  })
})

describe("el responsable del cliente (D-032)", () => {
  it("limpia los datos, pasa el mail a minúsculas y deja en null lo vacío", () => {
    const r = esquemaGrupo.parse({
      nombre: "Sanatorio del Centro",
      conResponsable: "1",
      responsableNombre: "  Ana   Pérez ",
      responsableCargo: "",
      responsableMail: " Ana.Perez@Sanatorio.com.AR ",
      responsableTelefono: "(0342) 15 455-1234",
      responsableDni: "30.123.456",
    })
    expect(r).toMatchObject({
      conResponsable: true,
      responsableNombre: "Ana Pérez",
      responsableCargo: null,
      responsableMail: "ana.perez@sanatorio.com.ar",
      responsableTelefono: "+5493424551234",
      responsableDni: "30123456",
    })
  })
  it("rechaza (no arregla) un mail o un teléfono mal escritos, y textos largos", () => {
    expect(esquemaGrupo.safeParse({ nombre: "X", responsableMail: "ana@" }).success).toBe(false)
    expect(esquemaGrupo.safeParse({ nombre: "X", responsableTelefono: "llamar a la tarde" }).success).toBe(false)
    expect(esquemaGrupo.safeParse({ nombre: "X", responsableNombre: "a".repeat(81) }).success).toBe(false)
    expect(esquemaGrupo.safeParse({ nombre: "X", responsableCargo: "a".repeat(61) }).success).toBe(false)
    expect(esquemaGrupo.safeParse({ nombre: "X", responsableDni: "123" }).success).toBe(false)
    expect(esquemaGrupo.safeParse({ nombre: "X", responsableTelefono: "0342 999" }).success).toBe(false)
  })
  it("cada campo dice qué revisar, con la misma regla que la acción", () => {
    expect(validarMail("")).toBeNull()
    expect(validarMail("ana@sanatorio.com.ar")).toBeNull()
    expect(validarMail("ana sanatorio.com")).toBe(MENSAJES_RESPONSABLE.mailMal)
    expect(validarMail("ana..perez@sanatorio.com")).toBe(MENSAJES_RESPONSABLE.mailMal)
    expect(validarMail("ana@sanatorio")).toBe(MENSAJES_RESPONSABLE.mailMal)
    expect(validarMail("ana@-sanatorio.com")).toBe(MENSAJES_RESPONSABLE.mailMal)
    expect(validarTelefono("")).toBeNull()
    expect(validarTelefono("+54 9 342 455-1234")).toBeNull()
    expect(validarTelefono("(0342) 455-1234")).toBeNull()
    expect(validarTelefono("0342 15 455-1234")).toBeNull()
    expect(validarTelefono("011 5555-0100")).toBeNull()
    expect(validarTelefono("0342 999")).toBe(MENSAJES_RESPONSABLE.telefonoMal)
    expect(validarTelefono("12345")).toBe(MENSAJES_RESPONSABLE.telefonoMal)
    expect(validarTelefono("342-abc")).toBe(MENSAJES_RESPONSABLE.telefonoMal)
    expect(validarResponsableNombre("a".repeat(80))).toBeNull()
    expect(validarResponsableNombre("a".repeat(81))).toBe(MENSAJES_RESPONSABLE.nombreLargo)
    expect(validarCargo("a".repeat(61))).toBe(MENSAJES_RESPONSABLE.cargoLargo)
    expect(validarDni("30.123.456")).toBeNull()
    expect(validarDni("5123456")).toBeNull()
    expect(validarDni("123456")).toBe(MENSAJES_RESPONSABLE.dniMal)
    expect(validarDni("301234567")).toBe(MENSAJES_RESPONSABLE.dniMal)
    expect(validarDni("30.12a.456")).toBe(MENSAJES_RESPONSABLE.dniMal)
    expect(validarDni("01234567")).toBe(MENSAJES_RESPONSABLE.dniMal)
  })
  it("muestra el DNI con puntos y el teléfono como se marca acá", () => {
    expect(formatearDni("30123456")).toBe("30.123.456")
    expect(formatearDni("5123456")).toBe("5.123.456")
    expect(formatearTelefono("+5493424551234")).toBe("0342 15-455-1234")
    expect(formatearTelefono("+541155550100")).toBe("011 5555-0100")
  })
  it("pregunta por un dominio mal escrito, sin cambiarlo solo", () => {
    expect(sugerirMail("ana@gmial.com")).toBe("ana@gmail.com")
    expect(sugerirMail("ana@hotmial.com")).toBe("ana@hotmail.com")
    expect(sugerirMail("ana@gmail.com.ar")).toBe("ana@gmail.com")
    expect(sugerirMail("ana@gmail.com")).toBeNull()
    expect(sugerirMail("ana@sanatoriodelcentro.com.ar")).toBeNull()
  })
  it("la auditoría anota qué dato cambió, nunca el valor", () => {
    const antes = { responsableNombre: "Ana", responsableCargo: null, responsableDni: "30123456", responsableMail: "a@b.co", responsableTelefono: null }
    const despues = { responsableNombre: "Ana", responsableCargo: "Directora", responsableDni: null, responsableMail: null, responsableTelefono: null }
    expect(camposCambiados(antes, despues)).toEqual(["responsableCargo", "responsableDni", "responsableMail"])
    expect(camposCambiados(antes, antes)).toEqual([])
  })
})
