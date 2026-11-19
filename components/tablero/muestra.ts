// Datos de MUESTRA del prototipo del tablero (WU‑07). Sin base: los títulos son reales, sacados de los
// servicios cargados en la base local y de la cola y las dudas del cerebro (`brain/_proceso/plan-de-trabajo.md`,
// `brain/08-preguntas-abiertas-e-investigacion.md`, 2026-11-18). Los comentarios y las prioridades son ilustrativos.

export type ListaId = "dudas" | "servicios" | "tareas" | "correcciones"
export type Tono = "marca" | "info" | "ok" | "warn" | "danger" | "violeta"

export type Persona = { nombre: string; iniciales: string; tono: Tono }
export type Tarjeta = {
  id: string
  titulo: string
  servicio: string
  responsable: Persona
  fecha: string
  prioridad?: "alta"
  comentarios: number
  clave?: string
}

export const LISTAS: { id: ListaId; titulo: string; tono: Tono; pista: string; corta: string }[] = [
  { id: "dudas", titulo: "Dudas para Claudio", tono: "info", pista: "Lo que solo Claudio puede contestar", corta: "Sin contestar" },
  { id: "servicios", titulo: "Servicios", tono: "marca", pista: "Lo que se está armando para un cliente", corta: "En armado" },
  { id: "tareas", titulo: "Tareas", tono: "ok", pista: "Lo que hay que hacer y quién lo tiene", corta: "Por hacer" },
  { id: "correcciones", titulo: "Correcciones", tono: "warn", pista: "Lo que hay que arreglar en lo que ya anda", corta: "Por arreglar" },
]

/** Color de la etiqueta de cada servicio. */
export const SERVICIOS: Record<string, Tono> = {
  Portal: "marca",
  Formularios: "info",
  Discapacidad: "violeta",
  "Web pública": "warn",
  Relevamiento: "ok",
  Agenda: "danger",
}

const MATEO: Persona = { nombre: "Mateo", iniciales: "M", tono: "marca" }
const CLAUDIO: Persona = { nombre: "Claudio", iniciales: "C", tono: "ok" }
const JUSTO: Persona = { nombre: "Justo", iniciales: "J", tono: "violeta" }
export const SOCIOS = [MATEO, CLAUDIO, JUSTO]

export const TARJETAS: Record<string, Tarjeta> = {
  d1: { id: "d1", titulo: "Leer y corregir los seis formularios de diagnóstico", servicio: "Formularios", responsable: CLAUDIO, fecha: "9 nov", prioridad: "alta", comentarios: 2, clave: "#17" },
  d2: { id: "d2", titulo: "Las alertas del portal: ¿juntan las de cada sistema o son propias?", servicio: "Portal", responsable: CLAUDIO, fecha: "14 nov", prioridad: "alta", comentarios: 1, clave: "#13" },
  d3: { id: "d3", titulo: "Cerrar el formulario de derivación de casos", servicio: "Formularios", responsable: CLAUDIO, fecha: "14 nov", prioridad: "alta", comentarios: 0, clave: "FSR‑01" },
  d4: { id: "d4", titulo: "¿Qué combinaciones de colores producen qué alarma?", servicio: "Formularios", responsable: CLAUDIO, fecha: "28 sep", comentarios: 3, clave: "#2" },
  s1: { id: "s1", titulo: "Administración del relevamiento institucional de entidades de medicina privada", servicio: "Relevamiento", responsable: MATEO, fecha: "17 nov", comentarios: 4 },
  s2: { id: "s2", titulo: "Agenda", servicio: "Agenda", responsable: MATEO, fecha: "17 nov", comentarios: 0 },
  s3: { id: "s3", titulo: "Sistema de discapacidad: en pausa, sin cliente", servicio: "Discapacidad", responsable: JUSTO, fecha: "13 nov", comentarios: 1 },
  t1: { id: "t1", titulo: "Tablero de trabajo en el portal", servicio: "Portal", responsable: MATEO, fecha: "18 nov", prioridad: "alta", comentarios: 5, clave: "T‑04" },
  t2: { id: "t2", titulo: "Cargar el IR‑03 en producción", servicio: "Formularios", responsable: MATEO, fecha: "9 nov", comentarios: 0, clave: "T‑13" },
  t3: { id: "t3", titulo: "Acordar con Justo el reparto y el nombre visible", servicio: "Portal", responsable: MATEO, fecha: "12 nov", comentarios: 2, clave: "T‑09" },
  t4: { id: "t4", titulo: "Santa Fe: ver si respondieron IR‑01 e IR‑02 o vencieron", servicio: "Formularios", responsable: JUSTO, fecha: "4 sep", comentarios: 0, clave: "T‑18" },
  c1: { id: "c1", titulo: "Motor de alertas: una alerta por conteo y el eje toma el peor nivel", servicio: "Formularios", responsable: MATEO, fecha: "14 nov", prioridad: "alta", comentarios: 3, clave: "T‑10" },
  c2: { id: "c2", titulo: "Cambiar «SSN» por «SSS» en seis archivos", servicio: "Web pública", responsable: JUSTO, fecha: "14 nov", comentarios: 0, clave: "M‑01" },
  c3: { id: "c3", titulo: "Sacar --fix del script lint", servicio: "Discapacidad", responsable: JUSTO, fecha: "14 nov", comentarios: 0, clave: "M‑03" },
}

export const ORDEN_INICIAL: Record<ListaId, string[]> = {
  dudas: ["d1", "d2", "d3", "d4"],
  servicios: ["s1", "s2", "s3"],
  tareas: ["t1", "t2", "t3", "t4"],
  correcciones: ["c1", "c2", "c3"],
}

// ---- Lo que se ve al abrir una tarjeta (D-038, ficha con conversación) ----

export type Comentario = { id: string; autor: Persona; texto: string; hace: string; respuestas: Comentario[] }

/** El texto de cada tarjeta. Los de las dudas resumen lo que dice el `08` del cerebro. */
export const DESCRIPCIONES: Record<string, string> = {
  d1: "Tiene los seis formularios de diagnóstico desde el 9 de noviembre. No hay preguntas: que los lea y corrija lo que le parezca. Mientras tanto, IR‑04 a IR‑06 no van a ningún cliente.",
  d2: "¿Las alertas del portal juntan las de cada sistema o son alertas propias? Mientras no conteste, la idea es hacer las dos cosas: una vista que junta y los avisos del tablero.",
  d3: "Cerrar el formulario de derivación de casos, con los dos huecos que quedaron. Es su instrumento: queda como está hasta que lo cierre.",
  d4: "Dijo que las alarmas salen de combinar colores. Sin las combinaciones concretas no hay nada que programar.",
  s1: "El relevamiento institucional de las entidades de medicina privada: el servicio más grande cargado hoy en el portal.",
  s2: "La agenda de turnos del cliente.",
  s3: "Está armado y en Railway desde el 13 de noviembre, pero no tiene cliente: queda en pausa.",
  t1: "Las cuatro listas, las tarjetas, la ficha con comentarios y el alta de servicio. Después, guardarlo en la base.",
  t2: "El script ya se probó en local. IR‑04 a IR‑06, recién cuando Claudio los lea.",
  t3: "El reparto de la cola y el nombre que se ve en el portal (OQ‑009).",
  t4: "Los links de IR‑01 e IR‑02 salieron el 4 de septiembre con 30 días. Mirar en producción si respondieron y, si vencieron, volver a mandarlos.",
  c1: "La matriz dispara una alerta por conteo, el eje toma el peor nivel y C‑20 marca en vez de bloquear.",
  c2: "17 apariciones de «SSN» en 6 archivos de la web, más «Cumplimiento SSN».",
  c3: "El script lint del back de discapacidad corrige solo; tiene que solo avisar.",
}

const M = SOCIOS[0]!
const C = SOCIOS[1]!
const J = SOCIOS[2]!
const com = (id: string, autor: Persona, texto: string, hace: string, respuestas: Comentario[] = []): Comentario => ({ id, autor, texto, hace, respuestas })

/** Conversaciones de MUESTRA. La de d3 cita a Claudio (`08`, #1); el resto es ilustrativo. */
export const COMENTARIOS: Record<string, Comentario[]> = {
  d1: [com("d1a", M, "Claudio, te los dejé en el portal. Cuando puedas, marcá lo que no te cierre.", "hace 9 días", [com("d1b", C, "Los empiezo esta semana.", "hace 8 días")])],
  d2: [com("d2a", M, "Mientras tanto vamos con las dos: una vista que junta y los avisos del tablero.", "hace 4 días")],
  d4: [com("d4a", C, "Cuando combinás los colores se producen las alarmas.", "28 sep"), com("d4b", M, "¿Nos pasás dos o tres combinaciones de ejemplo?", "29 sep", [com("d4c", J, "Si hace falta, lo charlamos.", "29 sep")])],
  d3: [com("d3a", C, "Necesito después cerrar el tema de formulario para la derivación del caso.", "14 nov")],
  s1: [com("s1a", M, "Es el nombre más largo del portal: sirve para probar que todo entra.", "hace 1 día"), com("s1b", J, "Ok, lo veo.", "hace 1 día"), com("s1c", M, "El cliente es el de prueba.", "hace 20 h"), com("s1d", J, "Perfecto.", "hace 18 h")],
  s3: [com("s3a", J, "Lo dejo en pausa hasta que aparezca un cliente.", "13 nov")],
  t1: [com("t1a", M, "Las tarjetas quedaron con la franja.", "hace 2 h", [com("t1b", J, "Me gusta, se ve el servicio de un vistazo.", "hace 1 h")]), com("t1c", M, "Ahora la ficha y el alta.", "hace 30 min"), com("t1d", C, "¿Yo voy a poder contestar desde acá?", "hace 20 min"), com("t1e", M, "Sí, en cada duda.", "hace 10 min")],
  t3: [com("t3a", M, "Lo hablamos cuando nos veamos.", "12 nov"), com("t3b", J, "Dale.", "12 nov")],
  c1: [com("c1a", M, "Son dos cambios en el motor.", "14 nov"), com("c1b", J, "Lo agarro yo.", "14 nov"), com("c1c", M, "Gracias.", "14 nov")],
}

/** Las dudas que ya están resueltas (ninguna, en la muestra). */
export const RESUELTAS: string[] = []
