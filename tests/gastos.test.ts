import { Client } from "pg"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { esquemaGasto, formatMonto, montoParaCampo, pareceNumeroDeTarjeta, parsearMonto, proximoPago } from "@/lib/gasto"

const ID = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b"
const base = { nombre: "Claude Max", descripcion: "", monto: "100", moneda: "USD", frecuencia: "mensual", diaPago: "21", mesPago: "", medioPago: "Visa de Mateo", pagaId: ID }

describe("el monto, como lo escribe una persona", () => {
  it.each([
    ["20", "20.00"],
    ["20,5", "20.50"],
    ["1.250,50", "1250.50"],
    ["1250,5", "1250.50"],
    ["$ 15.000", "15000.00"],
    ["007", "7.00"],
  ])("«%s» se guarda como %s", (escrito, guardado) => {
    expect(parsearMonto(escrito)).toEqual({ ok: true, valor: guardado })
  })
  it.each(["", "abc", "1,2,3", "1.25,5", "0", "0,00", "12345678901"])("«%s» no pasa", (escrito) => {
    expect(parsearMonto(escrito).ok).toBe(false)
  })
  it("se muestra con puntos de miles y coma, sin pasar por number", () => {
    expect(montoParaCampo("1250000.5")).toBe("1.250.000,50")
    expect(formatMonto("20.00", "USD")).toBe("USD 20,00")
  })
})

describe("con qué se paga: nunca un número de tarjeta", () => {
  it.each(["4509953566233704", "Visa 4509 9535 6623 3704", "CBU 0170-0991-4000"])("«%s» se rechaza", (t) => expect(pareceNumeroDeTarjeta(t)).toBe(true))
  it.each(["Visa de Mateo", "Mercado Pago de la consultora", "Visa terminada en 3704"])("«%s» pasa", (t) => expect(pareceNumeroDeTarjeta(t)).toBe(false))
})

describe("el próximo pago", () => {
  const hoy = { anio: 2026, mes: 11, dia: 20 }
  it("mensual: este mes si no pasó, si no el que viene", () => {
    expect(proximoPago(20, null, hoy)).toEqual({ fecha: "2026-11-20", faltan: 0 })
    expect(proximoPago(5, null, hoy)).toEqual({ fecha: "2026-12-05", faltan: 15 })
  })
  it("un 31 en un mes corto cae el último día", () => {
    expect(proximoPago(31, null, { anio: 2026, mes: 2, dia: 10 }).fecha).toBe("2026-02-28")
  })
  it("anual: este año o el que viene, y diciembre pasa a enero", () => {
    expect(proximoPago(15, 3, hoy).fecha).toBe("2027-03-15")
    expect(proximoPago(10, null, { anio: 2026, mes: 12, dia: 20 }).fecha).toBe("2027-01-10")
  })
})

describe("el esquema del formulario", () => {
  it("un gasto mensual completo pasa, sin mes", () => {
    const r = esquemaGasto.safeParse(base)
    expect(r.success && r.data).toMatchObject({ monto: "100.00", mesPago: null, descripcion: null })
  })
  it("anual sin mes no pasa", () => {
    const r = esquemaGasto.safeParse({ ...base, frecuencia: "anual" })
    expect(r.success).toBe(false)
  })
  it("una tarjeta en «con qué se paga» no pasa", () => {
    expect(esquemaGasto.safeParse({ ...base, medioPago: "Visa 4509 9535 6623 3704" }).success).toBe(false)
  })
  it("una moneda que no existe no pasa", () => {
    expect(esquemaGasto.safeParse({ ...base, moneda: "EUR" }).success).toBe(false)
  })
})

// Las mismas reglas, en la base (docs/reglas/11 §4): corre contra la base de prueba con el rol de la app.
const url = process.env.DATABASE_URL_DIRECT
describe.skipIf(!url)("los gastos en la base", () => {
  const c = new Client({ connectionString: url })
  let usuarioId = ""
  beforeAll(() => c.connect())
  afterAll(() => c.end())
  beforeEach(async () => {
    await c.query("begin")
    await c.query("set local role portal_app")
    const authId = `prueba-gastos-${Date.now()}`
    await c.query("insert into auth_user (id, name, email, updated_at) values ($1, 'Prueba', $2, now())", [authId, `${authId}@example.com`])
    usuarioId = (await c.query("insert into usuarios (auth_user_id, nombre, email) values ($1, 'Prueba', $2) returning id", [authId, `${authId}@example.com`])).rows[0].id
  })
  afterEach(() => c.query("rollback"))

  const insertar = async (cambios: Record<string, unknown> = {}) => {
    const g = { nombre: "Claude Max", monto: "100.00", moneda: "USD", frecuencia: "mensual", dia_pago: 21, mes_pago: null, medio_pago: "Visa de Mateo", ...cambios }
    await c.query("savepoint s")
    try {
      await c.query("insert into gastos (nombre, monto, moneda, frecuencia, dia_pago, mes_pago, medio_pago, paga_id, creado_por) values ($1, $2, $3, $4, $5, $6, $7, $8, $8)", [g.nombre, g.monto, g.moneda, g.frecuencia, g.dia_pago, g.mes_pago, g.medio_pago, usuarioId])
      return "ok"
    } catch (e) {
      return (e as { code: string }).code
    } finally {
      await c.query("rollback to savepoint s")
    }
  }

  it("un gasto bien cargado entra", async () => expect(await insertar()).toBe("ok"))
  it("frena un número de tarjeta, aunque tenga espacios", async () => expect(await insertar({ medio_pago: "Visa 4509 9535 6623 3704" })).toBe("23514"))
  it("frena un monto cero, otra moneda o anual sin mes", async () => {
    expect(await insertar({ monto: "0" })).toBe("23514")
    expect(await insertar({ moneda: "EUR" })).toBe("23514")
    expect(await insertar({ frecuencia: "anual" })).toBe("23514")
  })
  it("la app no puede borrar un gasto: se archiva", async () => {
    await c.query("savepoint s")
    const codigo = await c.query("delete from gastos").then(() => "ok", (e) => e.code)
    await c.query("rollback to savepoint s")
    expect(codigo).toBe("42501")
  })
  it("proximo_pago() da lo mismo que la vista previa", async () => {
    const r = await c.query("select proximo_pago(31, null, '2026-02-10')::text a, proximo_pago(15, 3, '2026-11-20')::text b, proximo_pago(10, null, '2026-12-20')::text c")
    expect(r.rows[0]).toEqual({ a: "2026-02-28", b: "2027-03-15", c: "2027-01-10" })
  })
})
