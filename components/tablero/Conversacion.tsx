"use client"
import { Fragment, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { AtSign, CheckCircle2, Reply, RotateCcw, SendHorizontal, X } from "lucide-react"
import { comun } from "@/i18n/es/comun"
import { gsap, quieto } from "@/lib/gsap"
import { pegar } from "@/lib/texto"
import type { Comentario, Persona } from "./listas"

type Props = {
  /** undefined mientras se trae del servidor. */
  comentarios: Comentario[] | undefined
  error: string | null
  alReintentar: () => void
  /** Las cuentas activas: a quién se puede mencionar con «@». */
  personas: Persona[]
  yo: Persona
  /** `respuestaA`: el mensaje que se cita. Devuelve si se guardó. */
  alComentar: (texto: string, respuestaA?: string) => Promise<boolean>
  /** Solo en las dudas: Claudio la da por contestada. */
  resuelta?: boolean
  alResolver?: () => void
}

/** Cuántos mensajes hay. */
export const contar = (cs: Comentario[] = []): number => cs.length

/** El texto con las menciones (@Nombre) resaltadas. */
const conMenciones = (texto: string): ReactNode[] =>
  texto.split(/(@[A-ZÁÉÍÓÚ][a-záéíóúñ]+)/).map((parte, i) =>
    parte.startsWith("@") ? (
      <mark key={i} className="tb-mencion">
        {parte}
      </mark>
    ) : (
      // Un guion entre letras o números no corta el renglón: «IR‑01» queda junto.
      <Fragment key={i}>{pegar(parte).replace(/([\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu, "$1\u2011")}</Fragment>
    ),
  )

const ZONA = "America/Argentina/Buenos_Aires"
const hora = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false })
const diaClave = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA })
const diaLargo = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "numeric", month: "long" })
/** El separador de día, como en WhatsApp: «Hoy», «Ayer» o «17 de noviembre». */
const nombreDia = (iso: string, ahora = new Date()) => {
  const d = diaClave.format(new Date(iso))
  if (d === diaClave.format(ahora)) return "Hoy"
  if (d === diaClave.format(new Date(ahora.getTime() - 86_400_000))) return "Ayer"
  return diaLargo.format(new Date(iso))
}
/** Dos mensajes seguidos de la misma persona, a menos de 5 minutos, van juntos: sin repetir el nombre. */
const SEGUIDO_MS = 5 * 60_000

/** Un renglón de lo que dice un mensaje citado. */
const resumen = (t: string) => (t.length > 140 ? `${t.slice(0, 140).trimEnd()}…` : t)

/**
 * La conversación de una tarjeta como chat (D-041, pedido de Mateo: «que sean tipo mensajes, como WhatsApp»).
 * Referencia: WhatsApp (grupos) y la burbuja de shadcn-chat. Lo propio a la derecha en el color de la marca; lo de los
 * demás a la izquierda con su cara y su nombre en su color. La hora va adentro de la burbuja, los días se separan
 * con «Hoy», «Ayer» o la fecha, y los mensajes seguidos de la misma persona se juntan. Responder cita el mensaje
 * adentro de la burbuja nueva; tocar la cita lleva al original. Lo nuevo entra deslizándose (0,3 s).
 */
export function Conversacion({ comentarios: traidos, error, alReintentar, personas, yo, alComentar, resuelta, alResolver }: Props) {
  const comentarios = useMemo(() => traidos ?? [], [traidos])
  const raiz = useRef<HTMLElement>(null)
  const [citando, setCitando] = useState<Comentario | null>(null)
  const antes = useRef(new Set<string>())
  const porId = useMemo(() => new Map(comentarios.map((c) => [c.id, c])), [comentarios])

  // Lo que no estaba antes entra y queda a la vista; al abrir, el hilo arranca abajo (lo último).
  useLayoutEffect(() => {
    const r = raiz.current
    const hilo = r?.querySelector<HTMLElement>(".tb-conv__hilo")
    if (!r || !hilo) return
    const ids = comentarios.map((c) => c.id)
    const primera = antes.current.size === 0
    const nuevos = primera ? [] : ids.filter((id) => !antes.current.has(id))
    antes.current = new Set(ids)
    if (primera) {
      hilo.scrollTop = hilo.scrollHeight
      return
    }
    if (nuevos.length) hilo.scrollTo({ top: hilo.scrollHeight, behavior: quieto() ? "auto" : "smooth" })
    for (const id of nuevos) {
      const el = r.querySelector<HTMLElement>(`[data-comentario="${id}"] .tb-msj__burbuja`)
      if (el && !quieto()) gsap.fromTo(el, { opacity: 0, y: 10, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power3.out", clearProps: "opacity,transform" })
    }
  }, [comentarios])

  /** Tocar una cita lleva al mensaje original y lo marca un instante. */
  const irA = (id: string) => {
    const el = raiz.current?.querySelector<HTMLElement>(`[data-comentario="${id}"]`)
    if (!el) return
    el.scrollIntoView({ block: "center", behavior: quieto() ? "auto" : "smooth" })
    const b = el.querySelector<HTMLElement>(".tb-msj__burbuja")
    if (b && !quieto()) gsap.fromTo(b, { boxShadow: "0 0 0 3px var(--sys-marca)" }, { boxShadow: "0 0 0 0px var(--sys-marca)", duration: 1.1, delay: 0.3, ease: "power2.out", clearProps: "boxShadow" })
  }

  const filas: ReactNode[] = []
  let diaAnterior = ""
  comentarios.forEach((c, i) => {
    const dia = nombreDia(c.creado)
    if (dia !== diaAnterior) {
      filas.push(
        <li key={`dia-${c.id}`} className="tb-msj-dia" role="separator">
          <span>{dia}</span>
        </li>,
      )
      diaAnterior = dia
    }
    const previo = comentarios[i - 1]
    const seguido = !!previo && previo.autor.id === c.autor.id && nombreDia(previo.creado) === dia && new Date(c.creado).getTime() - new Date(previo.creado).getTime() < SEGUIDO_MS
    const mio = c.autor.id === yo.id
    const cita = c.respuestaA ? porId.get(c.respuestaA) : undefined
    filas.push(
      <li key={c.id} className="tb-msj" data-comentario={c.id} data-mio={mio || undefined} data-seguido={seguido || undefined}>
        {!mio && (
          <span className="tb-msj__cara" aria-hidden="true">
            {!seguido && (
              <span className="tb-av" data-tono={c.autor.tono}>
                {c.autor.iniciales}
              </span>
            )}
          </span>
        )}
        <div className="tb-msj__burbuja" data-tono={c.autor.tono}>
          {!mio && !seguido && <p className="tb-msj__quien">{c.autor.nombre}</p>}
          {c.respuestaA && (
            <button type="button" className="tb-cita" data-tono={cita?.autor.tono} onClick={() => cita && irA(cita.id)} aria-label={cita ? `Ir al mensaje de ${cita.autor.nombre}` : "Mensaje citado"}>
              <span className="tb-cita__quien">{cita ? (cita.autor.id === yo.id ? "Vos" : cita.autor.nombre) : "Mensaje anterior"}</span>
              <span className="tb-cita__texto">{cita ? resumen(cita.texto) : "Ya no está en esta conversación."}</span>
            </button>
          )}
          <p className="tb-msj__texto">
            {conMenciones(c.texto)}
            {/* Reserva el lugar de la hora al final del último renglón, como en WhatsApp. */}
            <span className="tb-msj__lugar" aria-hidden="true" />
          </p>
          <span className="tb-msj__meta">
            <button type="button" className="tb-msj__responder" onClick={() => setCitando(c)} aria-label={`Responder a ${mio ? "tu mensaje" : c.autor.nombre}`}>
              <Reply size={14} strokeWidth={2} aria-hidden="true" />
            </button>
            <time className="tb-msj__hora" dateTime={c.creado}>
              {hora.format(new Date(c.creado))}
            </time>
          </span>
        </div>
      </li>,
    )
  })

  const n = contar(comentarios)
  return (
    <section ref={raiz} className="tb-conv" aria-label="Conversación" data-resuelta={resuelta || undefined}>
      <header className="tb-conv__cabeza">
        <h3 className="tb-conv__titulo">
          Conversación
          <span className="tb-lista__contador">{n}</span>
        </h3>
        {alResolver && (
          <button type="button" className="tb-resolver" data-resuelta={resuelta || undefined} onClick={alResolver}>
            {resuelta ? <RotateCcw size={14} strokeWidth={2} aria-hidden="true" /> : <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />}
            {resuelta ? "Reabrir" : "Marcar resuelta"}
          </button>
        )}
      </header>
      <div className="tb-conv__hilo">
        {resuelta && (
          <p className="tb-conv__aviso" role="status">
            <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
            Resuelta. Si hace falta, se puede reabrir.
          </p>
        )}
        {error ? (
          <div className="tb-conv__vacia" role="alert">
            <span>{pegar(error)}</span>{" "}
            <button type="button" className="tb-conv__reintentar" onClick={alReintentar}>
              {comun.reintentar}
            </button>
          </div>
        ) : traidos === undefined ? (
          <p className="tb-conv__vacia" role="status">
            Trayendo la conversación…
          </p>
        ) : n === 0 ? (
          <p className="tb-conv__vacia">
            {/* Una oración por renglón si no entran las dos (regla de saltos de línea). */}
            <span>Todavía nadie escribió.</span> <span>{pegar("Lo que pongas acá lo ven los tres.")}</span>
          </p>
        ) : (
          <ul className="tb-conv__lista">{filas}</ul>
        )}
      </div>
      <div className="tb-conv__pie">
        <Escribir
          yo={yo}
          personas={personas}
          etiqueta={citando ? `Responder a ${citando.autor.id === yo.id ? "tu mensaje" : citando.autor.nombre}` : "Escribir un mensaje"}
          cita={citando}
          alSacarCita={() => setCitando(null)}
          alMandar={async (texto) => {
            const ok = await alComentar(texto, citando?.id)
            if (ok) setCitando(null)
            return ok
          }}
          deshabilitado={traidos === undefined || !!error}
        />
      </div>
    </section>
  )
}

const LETRAS = "A-Za-zÁÉÍÓÚáéíóúÑñ"
const ARROBA = new RegExp(`(?:^|\\s)@([${LETRAS}]*)$`)

/**
 * El campo para escribir: un renglón que crece hasta seis; Enter manda, Shift+Enter baja de línea. Escribir «@»
 * (o tocar el botón @) abre la lista de socios: flechas para moverse, Enter o Tab para elegir, Escape cierra. Si se
 * está respondiendo, la cita se ve arriba del campo con una cruz para sacarla (o Escape).
 */
function Escribir({
  yo,
  personas,
  etiqueta,
  cita,
  alSacarCita,
  alMandar,
  deshabilitado,
}: {
  yo: Persona
  personas: Persona[]
  etiqueta: string
  cita: Comentario | null
  alSacarCita: () => void
  alMandar: (texto: string) => Promise<boolean>
  deshabilitado?: boolean
}) {
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [indice, setIndice] = useState(0)
  const [cerrada, setCerrada] = useState(false)
  const campo = useRef<HTMLTextAreaElement>(null)
  // Dónde dejar el cursor después de elegir a alguien: se pone en el mismo render, no después (G-017).
  const pendiente = useRef<number | null>(null)
  const idLista = useId()
  const idAyuda = useId()

  const busca = ARROBA.exec(texto.slice(0, cursor))
  const otros = personas.filter((p) => p.id !== yo.id)
  const candidatos = busca ? otros.filter((p) => p.nombre.toLowerCase().startsWith(busca[1]!.toLowerCase())) : []
  const lista = !cerrada && candidatos.length > 0
  const elegido = Math.min(indice, candidatos.length - 1)

  // Crece con el texto, hasta seis renglones; después scrollea adentro suyo.
  useLayoutEffect(() => {
    const el = campo.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
    if (pendiente.current !== null) {
      el.focus()
      el.setSelectionRange(pendiente.current, pendiente.current)
      pendiente.current = null
    }
  }, [texto])

  // Al elegir un mensaje para responder, el foco va al campo.
  useLayoutEffect(() => {
    if (cita) campo.current?.focus()
  }, [cita])

  const escribir = (valor: string, pos: number) => {
    setTexto(valor)
    setCursor(pos)
    setIndice(0)
    setCerrada(false)
  }
  const mencionar = (p: Persona) => {
    const antesDe = texto.slice(0, cursor).replace(new RegExp(`@[${LETRAS}]*$`), `@${p.nombre} `)
    escribir(antesDe + texto.slice(cursor).replace(/^\s+/, ""), antesDe.length)
    pendiente.current = antesDe.length
  }
  const abrirArroba = () => {
    const antesDe = texto.slice(0, cursor)
    const nuevo = `${antesDe}${antesDe && !/\s$/.test(antesDe) ? " " : ""}@`
    escribir(nuevo + texto.slice(cursor), nuevo.length)
    pendiente.current = nuevo.length
  }
  // Lo escrito se borra recién cuando el servidor lo guardó: si falla, queda para volver a mandarlo.
  const mandar = async () => {
    const limpio = texto.trim()
    if (!limpio || enviando || deshabilitado) return
    setEnviando(true)
    const ok = await alMandar(limpio)
    setEnviando(false)
    if (ok) escribir("", 0)
  }
  const tecla = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (lista) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        setIndice((elegido + (e.key === "ArrowDown" ? 1 : candidatos.length - 1)) % candidatos.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        mencionar(candidatos[elegido]!)
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        setCerrada(true)
        return
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void mandar()
    } else if (e.key === "Escape" && cita) {
      e.stopPropagation()
      alSacarCita()
    }
  }

  return (
    <div className="tb-escribir">
      <div className="tb-escribir__caja">
        {cita && (
          <div className="tb-escribir__cita">
            <div className="tb-cita" data-tono={cita.autor.tono}>
              <span className="tb-cita__quien">{cita.autor.id === yo.id ? "Vos" : cita.autor.nombre}</span>
              <span className="tb-cita__texto">{resumen(cita.texto)}</span>
            </div>
            <button type="button" className="tb-escribir__boton" onClick={alSacarCita} aria-label="No responder a ese mensaje">
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
        {lista && (
          <ul id={idLista} className="tb-escribir__lista" role="listbox" aria-label="Avisarle a">
            {candidatos.map((p, i) => (
              <li
                key={p.id}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={i === elegido}
                className="tb-escribir__opcion"
                onPointerDown={(e) => {
                  e.preventDefault()
                  mencionar(p)
                }}
                onPointerEnter={() => setIndice(i)}
              >
                <span className="tb-av" data-tono={p.tono} aria-hidden="true">
                  {p.iniciales}
                </span>
                {p.nombre}
              </li>
            ))}
          </ul>
        )}
        <div className="tb-escribir__fila">
          <textarea
            ref={campo}
            className="tb-escribir__campo"
            aria-label={etiqueta}
            aria-describedby={idAyuda}
            aria-controls={lista ? idLista : undefined}
            aria-activedescendant={lista ? `${idLista}-${elegido}` : undefined}
            placeholder={etiqueta}
            rows={1}
            maxLength={2000}
            value={texto}
            readOnly={enviando}
            aria-busy={enviando || undefined}
            onChange={(e) => escribir(e.target.value, e.target.selectionStart)}
            onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
            onBlur={() => setCerrada(true)}
            onFocus={() => setCerrada(false)}
            onKeyDown={tecla}
          />
          <div className="tb-escribir__botones">
            <button type="button" className="tb-escribir__boton" onPointerDown={(e) => e.preventDefault()} onClick={abrirArroba} aria-label="Avisarle a alguien">
              <AtSign size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <button type="button" className="tb-escribir__boton tb-escribir__mandar" onClick={() => void mandar()} disabled={!texto.trim() || enviando || deshabilitado} aria-label={enviando ? comun.guardando : "Mandar mensaje"}>
              <SendHorizontal size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <p id={idAyuda} className="tb-escribir__ayuda">
        <span>
          <kbd>Enter</kbd> manda · <kbd>@</kbd> avisa
        </span>
      </p>
    </div>
  )
}
