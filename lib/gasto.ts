// Las reglas de un gasto (D-043), escritas una vez: las usan el formulario y la acción. La base las repite
// como CHECK (db/schema/gastos.ts): esto es para los mensajes, aquello para la seguridad.
import { z } from "zod"
import { DESCRIPCION_MAX } from "./nombre"
import { esUuid } from "./parametros"
import { limpiarTexto } from "./texto"

export const NOMBRE_GASTO_MAX = 80
export const MEDIO_PAGO_MAX = 60
/** Hasta 9.999.999.999,99: lo que entra en numeric(12,2). */
export const MONTO_MAX = 9_999_999_999.99

export const MONEDAS = ["ARS", "USD"] as const
export type Moneda = (typeof MONEDAS)[number]
export const FRECUENCIAS = ["mensual", "anual"] as const
export type Frecuencia = (typeof FRECUENCIAS)[number]

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] as const

export const MENSAJES_GASTO = {
  nombreFalta: "Escribí qué se paga",
  nombreLargo: `El nombre tiene hasta ${NOMBRE_GASTO_MAX} letras`,
  descripcionLarga: `La descripción tiene hasta ${DESCRIPCION_MAX} letras`,
  montoFalta: "Escribí cuánto se paga",
  montoMal: "Escribí el monto con números, por ejemplo 20 o 1.250,50",
  montoCero: "El monto tiene que ser mayor a cero",
  montoGrande: "Ese monto es demasiado grande",
  monedaMal: "Elegí pesos o dólares",
  frecuenciaMal: "Elegí si se paga por mes o por año",
  diaMal: "Elegí un día del 1 al 31",
  mesMal: "Elegí el mes en que se paga",
  medioFalta: "Escribí con qué se paga, por ejemplo «Visa de Mateo»",
  medioLargo: `Hasta ${MEDIO_PAGO_MAX} letras`,
  medioNumero: "No escribas el número de la tarjeta ni de la cuenta: alcanza con «Visa de Mateo»",
  pagaMal: "Elegí quién lo paga",
} as const

/**
 * El monto como lo escribe una persona en Argentina («1.250,50», «20», «20,5») a texto con dos decimales
 * («1250.50»). Nunca pasa por un number de JS (docs/reglas/11): se arma con las cifras.
 */
export const parsearMonto = (texto: string): { ok: true; valor: string } | { ok: false; error: string } => {
  const t = texto.replace(/\s/g, "").replace(/^\$|^US\$|^USD/i, "")
  if (!t) return { ok: false, error: MENSAJES_GASTO.montoFalta }
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(t)) return { ok: false, error: MENSAJES_GASTO.montoMal }
  const [entera = "", dec = ""] = t.replace(/\./g, "").split(",")
  const enteraLimpia = entera.replace(/^0+(?=\d)/, "")
  const valor = `${enteraLimpia}.${dec.padEnd(2, "0")}`
  if (/^0\.00$/.test(valor)) return { ok: false, error: MENSAJES_GASTO.montoCero }
  if (enteraLimpia.length > 10) return { ok: false, error: MENSAJES_GASTO.montoGrande }
  return { ok: true, valor }
}

/** Lo que se acepta mientras se escribe el monto: cifras, puntos de miles y una coma. */
export const filtrarMonto = (nuevo: string) => (/^[\d.,]*$/.test(nuevo) && (nuevo.match(/,/g)?.length ?? 0) <= 1 && nuevo.length <= 17 ? nuevo : null)

/** «12500.5» o «12500.50» → «12.500,50»: para volver a mostrar en el campo lo que está guardado. */
export const montoParaCampo = (valor: string) => {
  const [e = "0", d = "00"] = valor.split(".")
  return `${e.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${d.padEnd(2, "0").slice(0, 2)}`
}

/** «USD 20,00» o «$ 12.500,00». Formatea el texto, sin pasar por number. */
export const formatMonto = (valor: string, moneda: Moneda) => `${moneda === "USD" ? "USD" : "$"} ${montoParaCampo(valor)}`

/** Un texto con cinco cifras seguidas o más parece un número de tarjeta o de cuenta: no se guarda. */
export const pareceNumeroDeTarjeta = (texto: string) => /\d{5,}/.test(texto.replace(/[\s-]/g, ""))

const textoOpcional = (max: number, mensaje: string) =>
  z
    .string()
    .optional()
    .transform((v) => limpiarTexto(v ?? ""))
    .pipe(z.string().max(max, mensaje))
    .transform((v) => v || null)

export const esquemaGasto = z
  .object({
    id: z
      .string()
      .optional()
      .refine((v) => !v || esUuid(v), "Gasto inválido")
      .transform((v) => v || null),
    nombre: z.string().transform(limpiarTexto).pipe(z.string().min(1, MENSAJES_GASTO.nombreFalta).max(NOMBRE_GASTO_MAX, MENSAJES_GASTO.nombreLargo)),
    descripcion: textoOpcional(DESCRIPCION_MAX, MENSAJES_GASTO.descripcionLarga),
    monto: z.string().transform((v, ctx) => {
      const r = parsearMonto(v)
      if (!r.ok) {
        ctx.addIssue({ code: "custom", message: r.error })
        return z.NEVER
      }
      return r.valor
    }),
    moneda: z.enum(MONEDAS, { message: MENSAJES_GASTO.monedaMal }),
    frecuencia: z.enum(FRECUENCIAS, { message: MENSAJES_GASTO.frecuenciaMal }),
    diaPago: z.coerce.number({ message: MENSAJES_GASTO.diaMal }).int(MENSAJES_GASTO.diaMal).min(1, MENSAJES_GASTO.diaMal).max(31, MENSAJES_GASTO.diaMal),
    mesPago: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 12), MENSAJES_GASTO.mesMal),
    medioPago: z
      .string()
      .transform(limpiarTexto)
      .pipe(z.string().min(1, MENSAJES_GASTO.medioFalta).max(MEDIO_PAGO_MAX, MENSAJES_GASTO.medioLargo))
      .refine((v) => !pareceNumeroDeTarjeta(v), MENSAJES_GASTO.medioNumero),
    pagaId: z.string().refine(esUuid, MENSAJES_GASTO.pagaMal),
  })
  .transform((d, ctx) => {
    if (d.frecuencia === "anual" && d.mesPago === null) {
      ctx.addIssue({ code: "custom", path: ["mesPago"], message: MENSAJES_GASTO.mesMal })
      return z.NEVER
    }
    return { ...d, mesPago: d.frecuencia === "anual" ? d.mesPago : null }
  })

export type DatosGasto = z.output<typeof esquemaGasto>

export type FilaGasto = {
  id: string
  nombre: string
  descripcion: string | null
  /** numeric como texto: «20.00». */
  monto: string
  moneda: Moneda
  frecuencia: Frecuencia
  diaPago: number
  mesPago: number | null
  medioPago: string
  pagaId: string
  pagaNombre: string
  /** «2026-12-05»: lo calcula la base (proximo_pago). */
  proximoPago: string
  /** Días que faltan desde hoy en Buenos Aires (0 = hoy). */
  faltan: number
  actualizadoEn: string
  archivadoEn: string | null
}

/** Cada cuánto, dicho como se dice: «todos los meses, el 5» o «todos los años, el 15 de marzo». */
export const cadaCuanto = (frecuencia: Frecuencia, dia: number, mes: number | null) =>
  frecuencia === "anual" && mes ? `Todos los años, el ${dia} de ${MESES[mes - 1]}` : `Todos los meses, el ${dia}`

/** Cuándo vence, en palabras: «hoy», «mañana», «en 5 días» o la fecha. */
export const cuandoVence = (faltan: number, fecha: string) => {
  if (faltan <= 0) return "Hoy"
  if (faltan === 1) return "Mañana"
  if (faltan <= 30) return `En ${faltan} días`
  const [a, m, d] = fecha.split("-")
  return `${d}/${m}/${a}`
}

/** El tono del aviso: hoy o mañana, rojo suave; en la semana, naranja; el resto, neutro. */
export const tonoVence = (faltan: number) => (faltan <= 1 ? "danger" : faltan <= 7 ? "warn" : "neutro")

type Dia = { anio: number; mes: number; dia: number }

/** Hoy en Buenos Aires, como año, mes y día. */
export const hoyEnBuenosAires = (ahora: Date = new Date()): Dia => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(ahora).map((x) => [x.type, x.value]))
  return { anio: Number(p.year), mes: Number(p.month), dia: Number(p.day) }
}

const diasDelMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate()
const diaDePago = (anio: number, mes: number, dia: number): Dia => ({ anio, mes, dia: Math.min(dia, diasDelMes(anio, mes)) })
const antes = (a: Dia, b: Dia) => a.anio * 10000 + a.mes * 100 + a.dia < b.anio * 10000 + b.mes * 100 + b.dia
const texto = (d: Dia) => `${d.anio}-${String(d.mes).padStart(2, "0")}-${String(d.dia).padStart(2, "0")}`

/**
 * El próximo pago desde `hoy` (incluido), la misma cuenta que `proximo_pago()` en la base (migración 0009):
 * acá sirve para la vista previa del formulario; la lista usa la de la base.
 */
export const proximoPago = (dia: number, mes: number | null, hoy: Dia = hoyEnBuenosAires()): { fecha: string; faltan: number } => {
  let d: Dia
  if (mes === null) {
    d = diaDePago(hoy.anio, hoy.mes, dia)
    if (antes(d, hoy)) d = hoy.mes === 12 ? diaDePago(hoy.anio + 1, 1, dia) : diaDePago(hoy.anio, hoy.mes + 1, dia)
  } else {
    d = diaDePago(hoy.anio, mes, dia)
    if (antes(d, hoy)) d = diaDePago(hoy.anio + 1, mes, dia)
  }
  const faltan = Math.round((Date.UTC(d.anio, d.mes - 1, d.dia) - Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia)) / 86_400_000)
  return { fecha: texto(d), faltan }
}
