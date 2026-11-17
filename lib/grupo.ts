import { parsePhoneNumberFromString } from "libphonenumber-js/min"
import { z } from "zod"
import { NOMBRE_GRUPO_MAX, NOMBRE_PERSONA_MAX } from "./nombre"
import { esUuid } from "./parametros"
import { MAIL_MAX, mailValido, normalizarMail } from "./mail"
import { limpiarTexto } from "./texto"

// Las reglas del mail viven en lib/mail.ts (las comparte Usuarios, D-034); se reexportan para no cambiar a quien las usa.
export { normalizarMail, sugerirMail } from "./mail"

// En la pantalla se dice «cliente» (D-032); por dentro sigue siendo un grupo.
export const MENSAJES_GRUPO = {
  falta: "Escribí el nombre del cliente",
  largo: `El nombre tiene hasta ${NOMBRE_GRUPO_MAX} letras`,
  repetido: "Ya existe un cliente con ese nombre",
  serviciosMal: "La lista de servicios no es válida. Cerrá el formulario y abrilo de nuevo.",
} as const

// El responsable del cliente (D-032, D-033): cinco datos optativos. Los topes y el formato son los mismos que
// los checks de las migraciones 0003 y 0004: la base los frena igual; acá están para los mensajes
// (docs/reglas/06 §regla 7). Esto corre en el navegador y en el servidor.
export const RESPONSABLE_NOMBRE_MAX = NOMBRE_PERSONA_MAX
export const RESPONSABLE_CARGO_MAX = 60
export const RESPONSABLE_MAIL_MAX = MAIL_MAX
/** Lo que se deja escribir en el campo del teléfono: con espacios, guiones y paréntesis. */
export const RESPONSABLE_TELEFONO_MAX = 30
/** Lo que se deja escribir en el campo del DNI: con puntos. */
export const RESPONSABLE_DNI_MAX = 10

const RE_DNI = /^[1-9][0-9]{6,7}$/u

export const MENSAJES_RESPONSABLE = {
  nombreLargo: `El nombre tiene hasta ${RESPONSABLE_NOMBRE_MAX} letras`,
  cargoLargo: `El cargo tiene hasta ${RESPONSABLE_CARGO_MAX} letras`,
  mailMal: "Revisá el mail: tiene que ser como nombre@sanatorio.com.ar",
  mailSinCorreo: (dominio: string) => `«${dominio}» no recibe mails. Revisá cómo está escrito.`,
  mailSugerencia: (mail: string) => `¿Quisiste decir ${mail}?`,
  telefonoMal: "Revisá el teléfono: va con la característica, por ejemplo 0342 455-1234 o 0342 15 455-1234",
  dniMal: "Revisá el DNI: son 7 u 8 números, por ejemplo 30.123.456",
} as const

/** El teléfono se guarda en formato internacional («+5493424551234»); si no es un número válido, queda como se escribió. */
export const normalizarTelefono = (v: string) => {
  const t = limpiarTexto(v)
  if (!t) return ""
  const n = parsePhoneNumberFromString(t, "AR")
  return n?.isValid() ? n.number : t
}
/** Para mostrar: los de Argentina como se marcan acá («0342 15-455-1234»), los de afuera con su código. */
export const formatearTelefono = (e164: string) => {
  const n = parsePhoneNumberFromString(e164, "AR")
  if (!n) return e164
  return n.country === "AR" ? n.formatNational() : n.formatInternational()
}

/** El DNI se guarda solo con números; se escribe con o sin puntos. */
export const normalizarDni = (v: string) => limpiarTexto(v).replace(/[.\s-]/gu, "")
export const formatearDni = (dni: string) => dni.replace(/\B(?=(\d{3})+(?!\d))/gu, ".")

export const validarResponsableNombre = (v: string): string | null => (limpiarTexto(v).length > RESPONSABLE_NOMBRE_MAX ? MENSAJES_RESPONSABLE.nombreLargo : null)
export const validarCargo = (v: string): string | null => (limpiarTexto(v).length > RESPONSABLE_CARGO_MAX ? MENSAJES_RESPONSABLE.cargoLargo : null)
export const validarMail = (v: string): string | null => {
  const m = normalizarMail(v)
  return !m || mailValido(m) ? null : MENSAJES_RESPONSABLE.mailMal
}
export const validarTelefono = (v: string): string | null => {
  const t = limpiarTexto(v)
  return !t || parsePhoneNumberFromString(t, "AR")?.isValid() ? null : MENSAJES_RESPONSABLE.telefonoMal
}
export const validarDni = (v: string): string | null => {
  const d = normalizarDni(v)
  return !d || RE_DNI.test(d) ? null : MENSAJES_RESPONSABLE.dniMal
}

/** Un dato optativo: limpio, validado con la misma regla del campo, y vacío pasa a null. */
const dato = (normalizar: (v: string) => string, validar: (v: string) => string | null) =>
  z
    .string()
    .optional()
    .transform((v) => normalizar(v ?? ""))
    .superRefine((v, ctx) => {
      const err = validar(v)
      if (err) ctx.addIssue({ code: "custom", message: err })
    })
    .transform((v) => v || null)

export const CAMPOS_RESPONSABLE = ["responsableNombre", "responsableCargo", "responsableDni", "responsableMail", "responsableTelefono"] as const
export type CampoResponsable = (typeof CAMPOS_RESPONSABLE)[number]
export type Responsable = Record<CampoResponsable, string | null>

/** Qué datos del responsable cambian (para la auditoría: el nombre del dato, nunca su valor). */
export const camposCambiados = (antes: Responsable, despues: Responsable): CampoResponsable[] => CAMPOS_RESPONSABLE.filter((c) => (antes[c] ?? null) !== (despues[c] ?? null))

/** Tope de servicios que se pueden marcar en un grupo de una vez: el mismo que trae la lista para elegir. */
export const SERVICIOS_POR_GRUPO_MAX = 300

export const validarNombreGrupo = (nombre: string): string | null => {
  const n = limpiarTexto(nombre)
  if (!n) return MENSAJES_GRUPO.falta
  if (n.length > NOMBRE_GRUPO_MAX) return MENSAJES_GRUPO.largo
  return null
}

export const esquemaGrupo = z.object({
  id: z
    .string()
    .optional()
    .refine((v) => !v || esUuid(v), "Cliente inválido")
    .transform((v) => v || null),
  nombre: z.string().transform(limpiarTexto).pipe(z.string().min(1, MENSAJES_GRUPO.falta).max(NOMBRE_GRUPO_MAX, MENSAJES_GRUPO.largo)),
  /** "1" cuando el formulario mandó el paso «Responsable»: sin eso, sus datos no se tocan. */
  conResponsable: z
    .string()
    .optional()
    .transform((v) => v === "1"),
  responsableNombre: dato(limpiarTexto, validarResponsableNombre),
  responsableCargo: dato(limpiarTexto, validarCargo),
  responsableMail: dato(normalizarMail, validarMail),
  responsableTelefono: dato(normalizarTelefono, validarTelefono),
  responsableDni: dato(normalizarDni, validarDni),
  /** "1" cuando el formulario mandó el paso «Servicios»: sin eso, los servicios del grupo no se tocan. */
  conServicios: z
    .string()
    .optional()
    .transform((v) => v === "1"),
  /** Los servicios que quedan en el grupo: ids separados por coma. Cada uno tiene que ser un id; no se arregla, se rechaza. */
  servicios: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : []))
    .pipe(z.array(z.string().refine(esUuid, MENSAJES_GRUPO.serviciosMal)).max(SERVICIOS_POR_GRUPO_MAX, MENSAJES_GRUPO.serviciosMal))
    .transform((v) => [...new Set(v.map((s) => s.toLowerCase()))]),
})

export type ServicioDeGrupo = { id: string; nombre: string; url: string }

export type FilaGrupo = Responsable & {
  id: string
  nombre: string
  /** Cuántos servicios activos tiene. */
  proyectos: number
  archivadoEn: string | null
  creadoEn: string
  actualizadoEn: string
  /** Sus servicios activos, por nombre (hasta 60: la tarjeta muestra tres y la ficha, todos estos). */
  servicios: ServicioDeGrupo[]
}

/** Un servicio activo que se puede marcar en el paso «Servicios», con el grupo que tiene hoy. */
export type ServicioElegible = { id: string; nombre: string; grupoId: string | null; grupoNombre: string | null }
