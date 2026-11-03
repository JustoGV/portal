import { z } from "zod"
import { CONTRASENA_MAX, CONTRASENA_MIN } from "./contrasena"
import { NOMBRE_PERSONA_MAX } from "./nombre"
import { limpiarTexto } from "./texto"

export const MENSAJES_CUENTA = {
  nombreFalta: "Escribí el nombre de la persona",
  nombreLargo: `El nombre tiene hasta ${NOMBRE_PERSONA_MAX} letras`,
  emailMal: "Revisá el email: tiene que ser como nombre@dominio.com",
  emailRepetido: "Ya existe una cuenta con ese email",
  claveCorta: `La contraseña tiene al menos ${CONTRASENA_MIN} caracteres`,
  claveLarga: `La contraseña tiene hasta ${CONTRASENA_MAX} caracteres`,
  claveDistinta: "Las dos contraseñas no coinciden",
  claveIgual: "Elegí una contraseña distinta de la inicial",
  claveActualMal: "La contraseña inicial no es correcta",
} as const

export const normalizarEmail = (e: string) => e.trim().toLowerCase()

export const esquemaCuenta = z.object({
  nombre: z.string().transform(limpiarTexto).pipe(z.string().min(1, MENSAJES_CUENTA.nombreFalta).max(NOMBRE_PERSONA_MAX, MENSAJES_CUENTA.nombreLargo)),
  email: z.string().transform(normalizarEmail).pipe(z.email(MENSAJES_CUENTA.emailMal).max(254, MENSAJES_CUENTA.emailMal)),
})

export const esquemaClaveNueva = z
  .object({
    actual: z.string().min(1, MENSAJES_CUENTA.claveActualMal).max(CONTRASENA_MAX),
    nueva: z.string().min(CONTRASENA_MIN, MENSAJES_CUENTA.claveCorta).max(CONTRASENA_MAX, MENSAJES_CUENTA.claveLarga),
    repetida: z.string(),
  })
  .refine((d) => d.nueva === d.repetida, { message: MENSAJES_CUENTA.claveDistinta, path: ["repetida"] })
  .refine((d) => d.nueva !== d.actual, { message: MENSAJES_CUENTA.claveIgual, path: ["nueva"] })

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
  esYo: boolean
}
