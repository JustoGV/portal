import { z } from "zod"
import { CONTRASENA_MAX, CONTRASENA_MIN } from "./contrasena"
import { MAIL_MAX, mailValido, normalizarMail } from "./mail"
import { NOMBRE_PERSONA_MAX } from "./nombre"
import { esUuid } from "./parametros"
import { limpiarTexto } from "./texto"

export const MENSAJES_CUENTA = {
  nombreFalta: "Escribí el nombre de la persona",
  nombreLargo: `El nombre tiene hasta ${NOMBRE_PERSONA_MAX} letras`,
  emailMal: "Revisá el email: tiene que ser como nombre@dominio.com",
  emailSinCorreo: (dominio: string) => `«${dominio}» no recibe mails. Revisá cómo está escrito.`,
  emailRepetido: "Ya existe una cuenta con ese email",
  claveCorta: `La contraseña tiene al menos ${CONTRASENA_MIN} caracteres`,
  claveLarga: `La contraseña tiene hasta ${CONTRASENA_MAX} caracteres`,
  claveDistinta: "Las dos contraseñas no coinciden",
  claveIgual: "Elegí una contraseña distinta de la inicial",
  claveActualMal: "La contraseña inicial no es correcta",
} as const

/** El mail con el que se entra: las mismas reglas que el del responsable de un cliente (lib/mail.ts, D-034). */
export const normalizarEmail = normalizarMail
export const EMAIL_MAX = MAIL_MAX

export const validarNombreCuenta = (v: string): string | null => {
  const n = limpiarTexto(v)
  if (!n) return MENSAJES_CUENTA.nombreFalta
  return n.length > NOMBRE_PERSONA_MAX ? MENSAJES_CUENTA.nombreLargo : null
}
export const validarEmail = (v: string): string | null => (mailValido(normalizarMail(v)) ? null : MENSAJES_CUENTA.emailMal)

export const esquemaCuenta = z.object({
  nombre: z.string().transform(limpiarTexto).pipe(z.string().min(1, MENSAJES_CUENTA.nombreFalta).max(NOMBRE_PERSONA_MAX, MENSAJES_CUENTA.nombreLargo)),
  email: z
    .string()
    .transform(normalizarEmail)
    .refine((m) => mailValido(m), MENSAJES_CUENTA.emailMal),
})

/** Editar una cuenta: solo el nombre. El mail no se cambia: es con lo que la persona entra. */
export const esquemaEditarCuenta = z.object({
  id: z.string().refine(esUuid, "Cuenta inválida"),
  nombre: esquemaCuenta.shape.nombre,
})

/** Mi cuenta (D-035): la persona cambia solo su nombre; la cuenta es la de su sesión, no viaja en el pedido. */
export const esquemaMiNombre = z.object({ nombre: esquemaCuenta.shape.nombre })

export const esquemaClaveNueva = z
  .object({
    actual: z.string().min(1, MENSAJES_CUENTA.claveActualMal).max(CONTRASENA_MAX),
    nueva: z.string().min(CONTRASENA_MIN, MENSAJES_CUENTA.claveCorta).max(CONTRASENA_MAX, MENSAJES_CUENTA.claveLarga),
    repetida: z.string(),
  })
  .refine((d) => d.nueva === d.repetida, { message: MENSAJES_CUENTA.claveDistinta, path: ["repetida"] })
  .refine((d) => d.nueva !== d.actual, { message: MENSAJES_CUENTA.claveIgual, path: ["nueva"] })

/** La primera cuenta, creada desde la web mientras la base no tiene ninguna (D-015). */
export const esquemaPrimeraCuenta = esquemaCuenta
  .extend({
    clave: z.string().min(CONTRASENA_MIN, MENSAJES_CUENTA.claveCorta).max(CONTRASENA_MAX, MENSAJES_CUENTA.claveLarga),
    repetida: z.string(),
  })
  .refine((d) => d.clave === d.repetida, { message: MENSAJES_CUENTA.claveDistinta, path: ["repetida"] })

export const OPCIONES_INACTIVIDAD = [
  { id: "nunca", texto: "Nunca", minutos: null },
  { id: "30", texto: "30 minutos", minutos: 30 },
  { id: "60", texto: "1 hora", minutos: 60 },
  { id: "120", texto: "2 horas", minutos: 120 },
  { id: "240", texto: "4 horas", minutos: 240 },
  { id: "480", texto: "8 horas", minutos: 480 },
] as const

export const esquemaInactividad = z.object({
  inactividad: z.enum(["nunca", "30", "60", "120", "240", "480"], "Elegí una de las opciones"),
})

export type FilaUsuario = {
  id: string
  nombre: string
  email: string
  activo: boolean
  segundoFactor: boolean
  debeCambiarClave: boolean
  creadoEn: string
  /** Cuándo abrió su última sesión; null si nunca entró. */
  ultimoIngreso: string | null
  /** Cuántas sesiones tiene abiertas ahora. */
  sesiones: number
  esYo: boolean
}

/** Una sesión abierta, para la ficha: de dónde y desde cuándo. Sin la dirección IP (D-034). */
export type SesionAbierta = { id: string; dispositivo: string; movil: boolean; abierta: string; usada: string; esEsta: boolean }
/** Un movimiento de la auditoría sobre la cuenta: qué pasó, cuándo y quién lo hizo. */
export type MovimientoCuenta = { id: string; accion: string; cuando: string; quien: string | null }
export type DetalleUsuario = { sesiones: SesionAbierta[]; movimientos: MovimientoCuenta[] }
/** Lo que muestra Mi cuenta (D-035): la persona, su acceso, sus sesiones y sus movimientos. */
export type MiCuenta = { id: string; nombre: string; email: string; segundoFactor: boolean; creadoEn: string } & DetalleUsuario

// ---------- El segundo factor desde Mi cuenta (D-044) ----------

/** 5 equivocaciones (contraseña o código) cada 15 minutos por cuenta: el mismo tope que el ingreso. */
export const FACTOR_INTENTOS = 5
/** La clave con la que se cuentan en `intentos_ingreso`: no choca con un mail porque no tiene «@». */
export const claveIntentosFactor = (usuarioId: string) => `factor:${usuarioId}`

export const codigoFactorValido = (v: string) => /^\d{6}$/.test(v)

export const esquemaClaveFactor = z.object({ clave: z.string().min(1, "Escribí tu contraseña").max(CONTRASENA_MAX) })
export const esquemaCodigoFactor = z.object({ codigo: z.string().trim().refine(codigoFactorValido, "Son los 6 números que muestra la app") })

/** La clave de la app, sacada de la dirección otpauth://, en grupos de 4 para copiarla a mano. */
export const secretoDeUri = (uri: string): string | null => {
  try {
    const s = new URL(uri).searchParams.get("secret")
    return s && /^[A-Z2-7]+=*$/i.test(s) ? s.toUpperCase().replace(/=+$/, "") : null
  } catch {
    return null
  }
}
export const agruparSecreto = (s: string) => s.match(/.{1,4}/g)?.join(" ") ?? s

/** El archivo que se descarga con los códigos de respaldo. */
export const textoCodigos = (codigos: readonly string[], email: string, fecha: string) =>
  [`Códigos de respaldo del portal CESS - GVG`, `Cuenta: ${email}`, `Generados el ${fecha}`, "", "Cada código sirve una sola vez.", "", ...codigos, ""].join("\n")
