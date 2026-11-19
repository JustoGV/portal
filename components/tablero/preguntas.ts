// Las preguntas del alta de una tarjeta del tablero, una lista por cada lista del tablero (D-038). Aprobadas por
// Mateo el 2026-11-18 («queda así», las cuatro listas). Se cambian acá, sin tocar el diseño.
//
// Tipos: «opciones» (las escritas acá), «cliente» (los clientes del portal), «sistema» (los servicios del
// tablero), «persona» (los socios) y «texto». `rol` dice qué parte de la tarjeta sale de esa respuesta, y una
// opción `urgente` la crea con prioridad alta.

import type { ListaId } from "./listas"

export type Opcion = { valor: string; titulo: string; detalle?: string; urgente?: boolean }
type Base = { id: string; paso: string; titulo: string; ayuda: string; rol?: "servicio" | "responsable" | "texto" }
export type Pregunta =
  | (Base & { tipo: "opciones"; opciones: Opcion[] })
  | (Base & { tipo: "cliente" | "sistema" | "persona" })
  | (Base & { tipo: "texto"; max: number; ejemplo: string })

const SISTEMA = (titulo: string): Pregunta => ({ id: "sistema", paso: "Sistema", titulo, ayuda: "El sistema o la parte del portal. Si no es de ninguno, elegí «Otro».", tipo: "sistema", rol: "servicio" })
const QUIEN_LA_TIENE: Pregunta = { id: "persona", paso: "La tiene", titulo: "¿Quién la tiene?", ayuda: "La persona que se ocupa.", tipo: "persona", rol: "responsable" }

export const PREGUNTAS: Record<ListaId, Pregunta[]> = {
  dudas: [
    SISTEMA("¿De qué sistema es?"),
    {
      id: "frena",
      paso: "Te frena",
      titulo: "¿Te frena?",
      ayuda: "Así Claudio sabe qué contestar primero.",
      tipo: "opciones",
      opciones: [
        { valor: "frena", titulo: "No puedo seguir hasta que conteste", detalle: "La tarjeta sale con prioridad alta", urgente: true },
        { valor: "otra", titulo: "Puedo seguir con otra parte", detalle: "Hace falta, pero no frena el trabajo" },
        { valor: "despues", titulo: "Es para más adelante", detalle: "Se puede contestar con tiempo" },
      ],
    },
    {
      id: "como",
      paso: "Cómo",
      titulo: "¿Cómo te sirve la respuesta?",
      ayuda: "Lo que necesitás para poder programarlo.",
      tipo: "opciones",
      opciones: [
        { valor: "ejemplos", titulo: "Con ejemplos", detalle: "Casos concretos, como se dan en la práctica" },
        { valor: "regla", titulo: "Con la regla de cómo se decide", detalle: "El criterio que usa él para decidir" },
        { valor: "si-no", titulo: "Con un sí o un no", detalle: "Alcanza con que confirme" },
        { valor: "charla", titulo: "Mejor lo charlamos", detalle: "Es largo para escribirlo" },
      ],
    },
    {
      id: "sabemos",
      paso: "Lo que sabemos",
      titulo: "¿Qué sabemos hasta ahora?",
      ayuda: "Lo que ya dijo o lo que encontraste, así no lo repite.",
      tipo: "texto",
      rol: "texto",
      max: 280,
      ejemplo: "Dijo que las alarmas salen de combinar colores, pero no tenemos las combinaciones.",
    },
  ],
  servicios: [
    { id: "cliente", paso: "Cliente", titulo: "¿Para qué cliente es?", ayuda: "Si todavía no está en el portal, cargalo antes en Clientes.", tipo: "cliente", rol: "servicio" },
    {
      id: "que",
      paso: "Qué",
      titulo: "¿Qué hay que armar?",
      ayuda: "Lo más parecido. Si no entra en ninguna, elegí «Otra cosa» y contalo al final.",
      tipo: "opciones",
      opciones: [
        { valor: "formulario", titulo: "Un formulario para relevar", detalle: "Preguntas que contesta el cliente o su gente, con alertas según las respuestas" },
        { valor: "sistema", titulo: "Un sistema de gestión", detalle: "Pantallas para cargar y seguir el trabajo del cliente día a día" },
        { valor: "web", titulo: "Una web", detalle: "Una página pública del cliente" },
        { valor: "otra", titulo: "Otra cosa", detalle: "Lo contás en la última pregunta" },
      ],
    },
    {
      id: "quien",
      paso: "Quién",
      titulo: "¿Quién lo va a usar?",
      ayuda: "Quién entra y carga o mira datos.",
      tipo: "opciones",
      opciones: [
        { valor: "nosotros", titulo: "Solo nosotros", detalle: "Los socios de la consultora" },
        { valor: "cliente", titulo: "El cliente", detalle: "El equipo de la institución" },
        { valor: "gente", titulo: "La gente del cliente", detalle: "Pacientes, afiliados o prestadores" },
      ],
    },
    {
      id: "datos",
      paso: "Datos",
      titulo: "¿Va a guardar datos de salud o personales?",
      ayuda: "Esta respuesta decide qué seguridad lleva desde el arranque.",
      tipo: "opciones",
      opciones: [
        { valor: "si", titulo: "Sí", detalle: "DNI, diagnósticos, certificados o historias clínicas" },
        { valor: "no", titulo: "No", detalle: "Solo datos de la institución, sin personas" },
        { valor: "nose", titulo: "No sé", detalle: "Lo vemos con Claudio antes de empezar" },
      ],
    },
    {
      id: "cuando",
      paso: "Cuándo",
      titulo: "¿Para cuándo lo necesita?",
      ayuda: "La fecha que dio el cliente, si la dio.",
      tipo: "opciones",
      opciones: [
        { valor: "mes", titulo: "Este mes", detalle: "Hay una fecha cerca" },
        { valor: "trimestre", titulo: "En uno a tres meses", detalle: "Hay tiempo para hacerlo bien" },
        { valor: "sin", titulo: "Sin fecha", detalle: "Todavía no lo dijo" },
      ],
    },
    {
      id: "linea",
      paso: "En una línea",
      titulo: "Contalo en una línea",
      ayuda: "Qué le pasa hoy al cliente y qué tendría que poder hacer.",
      tipo: "texto",
      rol: "texto",
      max: 280,
      ejemplo: "Hoy relevan en papel y pierden las respuestas; quieren mandar un link y ver las alertas.",
    },
  ],
  tareas: [
    SISTEMA("¿De qué sistema es?"),
    QUIEN_LA_TIENE,
    {
      id: "cuando",
      paso: "Cuándo",
      titulo: "¿Para cuándo?",
      ayuda: "Si no hay fecha, se hace cuando haya lugar.",
      tipo: "opciones",
      opciones: [
        { valor: "semana", titulo: "Esta semana", detalle: "Hay que hacerla ya" },
        { valor: "mes", titulo: "Este mes", detalle: "Antes de fin de mes" },
        { valor: "sin", titulo: "Sin fecha", detalle: "Cuando haya lugar" },
      ],
    },
    {
      id: "depende",
      paso: "Depende",
      titulo: "¿Depende de algo?",
      ayuda: "Lo que tiene que pasar antes de poder empezarla.",
      tipo: "opciones",
      opciones: [
        { valor: "no", titulo: "No, se puede empezar", detalle: "Está todo lo que hace falta" },
        { valor: "claudio", titulo: "De una respuesta de Claudio", detalle: "Conviene cargar la duda en su lista" },
        { valor: "cliente", titulo: "De algo del cliente", detalle: "Un dato, un archivo o su OK" },
        { valor: "tarea", titulo: "De otra tarea", detalle: "Hay que terminar otra antes" },
      ],
    },
    {
      id: "terminada",
      paso: "Cuándo termina",
      titulo: "¿Cuándo está terminada?",
      ayuda: "Lo que tiene que pasar para darla por hecha.",
      tipo: "texto",
      rol: "texto",
      max: 280,
      ejemplo: "El tablero guarda las tarjetas y lo usamos los tres.",
    },
  ],
  correcciones: [
    SISTEMA("¿En qué sistema?"),
    {
      id: "grave",
      paso: "Gravedad",
      titulo: "¿Qué tan grave es?",
      ayuda: "Así se sabe qué se arregla primero.",
      tipo: "opciones",
      opciones: [
        { valor: "frena", titulo: "Frena a alguien", detalle: "Alguien no puede trabajar. La tarjeta sale con prioridad alta", urgente: true },
        { valor: "molesta", titulo: "Molesta, pero se puede seguir", detalle: "Hay una vuelta mientras tanto" },
        { valor: "detalle", titulo: "Es un detalle", detalle: "Un texto, un color, algo que se ve mal" },
      ],
    },
    {
      id: "vio",
      paso: "Quién lo vio",
      titulo: "¿Quién lo vio?",
      ayuda: "Si lo vio el cliente, conviene avisarle cuando esté arreglado.",
      tipo: "opciones",
      opciones: [
        { valor: "nosotros", titulo: "Nosotros", detalle: "Lo encontramos probando" },
        { valor: "cliente", titulo: "El cliente", detalle: "Nos lo avisó la institución" },
        { valor: "gente", titulo: "La gente del cliente", detalle: "Un paciente, afiliado o prestador" },
      ],
    },
    QUIEN_LA_TIENE,
    {
      id: "pasa",
      paso: "Qué pasa",
      titulo: "¿Qué pasa y qué tendría que pasar?",
      ayuda: "Lo que se ve hoy y cómo tendría que estar.",
      tipo: "texto",
      rol: "texto",
      max: 280,
      ejemplo: "Dice SSN donde va SSS, en seis archivos.",
    },
  ],
}
