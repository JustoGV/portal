// Inicio (D-045). Le habla al equipo de la consultora, de vos.
import type { ListaId } from "@/lib/tablero"

export const inicio = {
  titulo: "Inicio",
  sobre: "Portal",
  bajada: "Lo que está pendiente en la consultora y quién lo tiene.",
  hallazgo: (dudas: number, vencen: number | null) => {
    const a = dudas === 0 ? "Claudio no tiene dudas pendientes" : dudas === 1 ? "1 duda espera a Claudio" : `${dudas} dudas esperan a Claudio`
    if (vencen === null) return `${a}.`
    const b = vencen === 0 ? "no vence ningún pago esta semana" : vencen === 1 ? "vence 1 pago esta semana" : `vencen ${vencen} pagos esta semana`
    return `${a} y ${b}.`
  },
  verTablero: "Ver el tablero",
  nuevaTarjeta: "Nueva tarjeta",
  verGastos: "Ver gastos",
  verServicios: "Ver servicios",
  verClientes: "Ver clientes",

  listas: { dudas: "Dudas", servicios: "Servicios", tareas: "Tareas", correcciones: "Correcciones" } satisfies Record<ListaId, string>,

  tablero: "El tablero",
  tableroBajada: "Tarjetas abiertas al cierre de cada semana",
  abiertas: (n: number) => (n === 1 ? "abierta" : "abiertas"),
  semanaDe: (d: string) => `Semana del ${d}`,
  ultimas8: "Últimas 8 semanas",

  gastosMes: "Pagos del mes",
  gastosMesTexto: (pasados: number, total: number) => (total === 0 ? "No hay pagos este mes" : `${pasados} de ${total} ya pasaron`),
  porMesPesos: "Por mes en pesos",
  porMesDolares: "Por mes en dólares",
  proximos: "Próximos pagos",
  sinPagos: "No hay gastos cargados.",
  hoy: "Hoy",
  manana: "Mañana",
  enDias: (n: number) => `En ${n} días`,
  pagosMeses: "Lo que se paga los próximos 6 meses",
  pesos: "Pesos",
  dolares: "Dólares",

  dudas: "Dudas para Claudio",
  dudasTexto: (n: number) => (n === 1 ? "sin contestar" : "sin contestar"),
  sinDudas: "Ninguna duda pendiente.",
  mensajes: (n: number) => (n === 1 ? "1 mensaje" : `${n} mensajes`),

  servicios: "Servicios",
  serviciosActivos: (n: number) => (n === 1 ? "activo" : "activos"),
  serviciosPorCliente: "Servicios por cliente",
  sinCliente: "Sin cliente",
  restantes: (n: number) => `y ${n} más`,
  archivados: "Archivados",
  clientes: "Clientes",

  quien: "Quién tiene qué",
  quienBajada: "Tarjetas abiertas de cada uno",
  sinTarjetas: "Sin tarjetas",

  sinDueno: "Necesitan responsable",
  sinDuenoTexto: (n: number) => (n === 0 ? "Todas tienen a alguien" : n === 1 ? "1 tarjeta sin responsable" : `${n} tarjetas sin responsable`),
  prioridad: "Con prioridad alta",

  actividad: "Actividad",
  actividadSemana: "Movimientos de la semana",
  actividad30: "Movimientos de los últimos 30 días",
  movimientos: (n: number) => (n === 1 ? "movimiento" : "movimientos"),

  ultimos: "Lo último que pasó",
  sinMovimientos: "Todavía no hay movimientos anotados.",
  columnas: { que: "Qué pasó", sobre: "Sobre", quien: "Quién", cuando: "Cuándo" },
  accion: {
    "proyecto.crear": "Servicio nuevo",
    "proyecto.editar": "Servicio editado",
    "proyecto.archivar": "Servicio archivado",
    "grupo.crear": "Cliente nuevo",
    "grupo.editar": "Cliente editado",
    "grupo.responsable": "Responsable del cliente",
    "grupo.servicios": "Servicios del cliente",
    "tarjeta.crear": "Tarjeta nueva",
    "tarjeta.mover": "Tarjeta movida",
    "tarjeta.resolver": "Duda resuelta",
    "gasto.crear": "Gasto nuevo",
    "gasto.editar": "Gasto editado",
    "gasto.archivar": "Gasto archivado",
    "configuracion.editar": "Configuración",
    "usuario.crear": "Cuenta nueva",
    "usuario.editar": "Cuenta editada",
    "usuario.cambiar-clave": "Contraseña cambiada",
    "usuario.cambiar-clave-inicial": "Primer ingreso",
    "usuario.activar-factor": "Segundo factor activado",
    "usuario.desactivar-factor": "Segundo factor desactivado",
  } as Record<string, string>,
  accionOtra: "Movimiento",

  // Cada parte dice qué pregunta contesta y cómo se lee (corrección de Mateo, 2026-11-22: «que Claudio entienda cada gráfico»).
  urgente: "Urgente",
  urgenteBajada: "Lo rojo, hoy. Lo naranja, en estos días.",
  pilaVer: (n: number) => (n === 1 ? "Ver la urgencia" : `Ver las ${n}`),
  cerrar: "Cerrar",
  pilaParaMirar: "Para mirar",
  pilaResumen: (graves: number, mirar: number) =>
    [graves > 0 ? `${graves} ${graves === 1 ? "urgente" : "urgentes"}` : "", mirar > 0 ? `${mirar} para mirar` : ""].filter(Boolean).join(" · "),
  pilaVence: "vence",
  pilaParaVencer: (n: number) => (n === 1 ? "día para vencer" : "días para vencer"),
  pilaQuieta: (n: number) => (n === 1 ? "día quieta" : "días quieta"),
  pilaAlta: "prioridad alta",
  pilaSinDueno: "sin responsable",
  pilaTipoPago: "Pago que vence",
  pilaTipoDuda: "Duda para Claudio",
  pilaTipoPrioridad: (lista: string) => `Prioridad alta en ${lista}`,
  pilaTipoSinDueno: "Tarjetas sin responsable",
  pilaAsignar: "Nadie las tiene a su nombre todavía.",
  nadaUrgenteCorto: "Ningún pago vence en 7 días y nada está quieto.",
  nadaUrgente: "Nada urgente hoy",
  nadaUrgenteTexto: "No vence ningún pago en 7 días, ninguna duda está quieta y todas las tarjetas tienen responsable.",
  grave: "Urgente",
  atencion: "Atención",
  irGastos: "Ver gastos",
  irTablero: "Ver en el tablero",
  asignar: "Asignar",

  usoTitulo: "¿Cuánto se usó el portal?",
  usoBajada: "Cada punto es un día: lo que se cargó, se movió o se contestó en el portal.",
  usoTotal: (n: number) => `${n} ${n === 1 ? "movimiento" : "movimientos"} en 30 días`,
  usoPico: (dia: string, n: number) => `El día con más movimiento fue el ${dia}, con ${n}.`,
  usoNada: "No hubo movimientos en los últimos 30 días.",

  pagosTitulo: "¿Cuánto se paga cada mes?",
  pagosBajada: "Cada barra es un mes: la suma de lo que vence ese mes. Lo anual cae en su mes.",
  pagosPico: (mes: string, monto: string) => `El mes más caro es ${mes}: ${monto}.`,
  pagosIgual: "Todos los meses se paga lo mismo.",
  pagosPorMes: (pesos: string, dolares: string) => `Por mes, en promedio: ${pesos} y ${dolares}`,

  clientesTitulo: "¿Para qué clientes trabajamos más?",
  clientesBajada: "Cada cuadro es un cliente: cuanto más grande, más servicios activos tiene. Tocalo para ver el cliente.",
  serviciosN: (n: number) => (n === 1 ? "1 servicio" : `${n} servicios`),

  tableroTitulo: "¿Qué hay pendiente en el tablero?",
  tableroBajadaLado: "Tarjetas abiertas en cada lista del tablero.",
  quienBajadaLado: "Tarjetas abiertas a nombre de cada uno.",
  tarjetasN: (n: number) => (n === 0 ? "ninguna" : n === 1 ? "1 tarjeta" : `${n} tarjetas`),

} as const
