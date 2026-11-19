"use client"
import { Fragment, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { AtSign, CheckCircle2, RotateCcw, SendHorizontal } from "lucide-react"
import { gsap, quieto } from "@/lib/gsap"
import { pegar } from "@/lib/texto"
import { SOCIOS, type Comentario, type Persona } from "./muestra"

type Props = {
  comentarios: Comentario[]
  yo: Persona
  /** `respuestaA`: el comentario al que se contesta (las respuestas cuelgan debajo). */
  alComentar: (texto: string, respuestaA?: string) => void
  /** Solo en las dudas: Claudio la da por contestada. */
  resuelta?: boolean
  alResolver?: () => void
}

/** Cuántos comentarios hay, contando las respuestas. */
export const contar = (cs: Comentario[] = []): number => cs.reduce((n, c) => n + 1 + contar(c.respuestas), 0)

/** El texto con las menciones (@Nombre) resaltadas. */
const conMenciones = (texto: string): ReactNode[] =>
  texto.split(/(@[A-ZÁÉÍÓÚ][a-záéíóúñ]+)/).map((parte, i) =>
    parte.startsWith("@") ? (
      <mark key={i} className="tb-mencion">
        {parte}
      </mark>
    ) : (
      <Fragment key={i}>{pegar(parte)}</Fragment>
    ),
  )

/**
 * La conversación de una tarjeta (D-038; referencia F4, Mehi · Comment Thread, llevada al hilo de Linear y GitHub):
 * comentarios sin caja, la cara, el nombre y hace cuánto en una línea y el texto debajo; las respuestas cuelgan
 * de una línea fina que sale de la cara. El campo para escribir queda al pie, crece al escribir y con «@» abre
 * la lista de socios. Lo nuevo entra deslizándose (0,4 s) y el hilo lo trae a la vista.
 */
export function Conversacion({ comentarios, yo, alComentar, resuelta, alResolver }: Props) {
  const raiz = useRef<HTMLElement>(null)
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const antes = useRef(new Set<string>())

  // Lo que no estaba antes, entra y queda a la vista.
  useLayoutEffect(() => {
    const r = raiz.current
    if (!r) return
    const ids = Array.from(r.querySelectorAll<HTMLElement>("[data-comentario]")).map((e) => e.dataset.comentario!)
    const nuevos = antes.current.size ? ids.filter((id) => !antes.current.has(id)) : []
    antes.current = new Set(ids)
    for (const id of nuevos) {
      const el = r.querySelector<HTMLElement>(`[data-comentario="${id}"]`)
      if (!el) continue
      const hilo = r.querySelector<HTMLElement>(".tb-conv__hilo")
      if (hilo && hilo.scrollHeight > hilo.clientHeight) {
        const abajo = el.offsetTop + el.offsetHeight - hilo.clientHeight + 16
        if (abajo > hilo.scrollTop) hilo.scrollTo({ top: abajo, behavior: quieto() ? "auto" : "smooth" })
      }
      if (!quieto()) gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out", clearProps: "opacity,transform" })
    }
  }, [comentarios])

  const fila = (c: Comentario, respuesta: boolean) => {
    const colgando = !respuesta && (c.respuestas.length > 0 || respondiendo === c.id)
    return (
      <li key={c.id} className="tb-coment" data-comentario={c.id} data-respuesta={respuesta || undefined} data-hilo={colgando || undefined}>
        <span className="tb-av" data-tono={c.autor.tono} aria-hidden="true">
          {c.autor.iniciales}
        </span>
        <div className="tb-coment__cuerpo">
          <p className="tb-coment__quien">
            <strong>{c.autor.nombre}</strong>
            <span className="tb-coment__hace">{c.hace}</span>
            {!respuesta && (
              <button type="button" className="tb-coment__accion" onClick={() => setRespondiendo(respondiendo === c.id ? null : c.id)} aria-expanded={respondiendo === c.id} aria-label={`Responder a ${c.autor.nombre}`}>
                Responder
              </button>
            )}
          </p>
          <p className="tb-coment__texto">{conMenciones(c.texto)}</p>
          {colgando && (
            <ul className="tb-coment__respuestas">
              {c.respuestas.map((r) => fila(r, true))}
              {respondiendo === c.id && (
                <li className="tb-coment__nuevo">
                  <Escribir
                    yo={yo}
                    etiqueta={`Responder a ${c.autor.nombre}`}
                    enfocar
                    alMandar={(texto) => {
                      alComentar(texto, c.id)
                      setRespondiendo(null)
                    }}
                    alCancelar={() => setRespondiendo(null)}
                  />
                </li>
              )}
            </ul>
          )}
        </div>
      </li>
    )
  }

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
        {n === 0 ? (
          <p className="tb-conv__vacia">
            {/* Una oración por renglón si no entran las dos (regla de saltos de línea). */}
            <span>Todavía nadie escribió.</span> <span>{pegar("Lo que pongas acá lo ven los tres.")}</span>
          </p>
        ) : <ul className="tb-conv__lista">{comentarios.map((c) => fila(c, false))}</ul>}
      </div>
      <div className="tb-conv__pie">
        <Escribir yo={yo} etiqueta="Escribir un comentario" alMandar={(texto) => alComentar(texto)} />
      </div>
    </section>
  )
}

const LETRAS = "A-Za-zÁÉÍÓÚáéíóúÑñ"
const ARROBA = new RegExp(`(?:^|\\s)@([${LETRAS}]*)$`)

/**
 * El campo para escribir: un renglón que crece hasta seis; Enter manda, Shift+Enter baja de línea. Escribir «@»
 * (o tocar el botón @) abre la lista de socios: flechas para moverse, Enter o Tab para elegir, Escape cierra.
 */
function Escribir({ yo, etiqueta, alMandar, alCancelar, enfocar }: { yo: Persona; etiqueta: string; alMandar: (texto: string) => void; alCancelar?: () => void; enfocar?: boolean }) {
  const [texto, setTexto] = useState("")
  const [cursor, setCursor] = useState(0)
  const [indice, setIndice] = useState(0)
  const [cerrada, setCerrada] = useState(false)
  const campo = useRef<HTMLTextAreaElement>(null)
  // Dónde dejar el cursor después de elegir a alguien: se pone en el mismo render, no después (si no, lo que se
  // escribe rápido justo después queda en otro lugar).
  const pendiente = useRef<number | null>(null)
  const idLista = useId()
  const idAyuda = useId()

  const busca = ARROBA.exec(texto.slice(0, cursor))
  const otros = SOCIOS.filter((p) => p.nombre !== yo.nombre)
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

  const escribir = (valor: string, pos: number) => {
    setTexto(valor)
    setCursor(pos)
    setIndice(0)
    setCerrada(false)
  }
  const ubicar = (pos: number) => {
    pendiente.current = pos
  }
  const mencionar = (p: Persona) => {
    const antesDe = texto.slice(0, cursor).replace(new RegExp(`@[${LETRAS}]*$`), `@${p.nombre} `)
    escribir(antesDe + texto.slice(cursor).replace(/^\s+/, ""), antesDe.length)
    ubicar(antesDe.length)
  }
  const abrirArroba = () => {
    const antesDe = texto.slice(0, cursor)
    const nuevo = `${antesDe}${antesDe && !/\s$/.test(antesDe) ? " " : ""}@`
    escribir(nuevo + texto.slice(cursor), nuevo.length)
    ubicar(nuevo.length)
  }
  const mandar = () => {
    const limpio = texto.trim()
    if (!limpio) return
    alMandar(limpio)
    escribir("", 0)
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
      mandar()
    } else if (e.key === "Escape" && alCancelar) {
      e.stopPropagation()
      alCancelar()
    }
  }

  return (
    <div className="tb-escribir">
      <div className="tb-escribir__caja">
        {lista && (
          <ul id={idLista} className="tb-escribir__lista" role="listbox" aria-label="Avisarle a">
            {candidatos.map((p, i) => (
              <li
                key={p.nombre}
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
          autoFocus={enfocar}
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
          <button type="button" className="tb-escribir__boton tb-escribir__mandar" onClick={mandar} disabled={!texto.trim()} aria-label="Mandar comentario">
            <SendHorizontal size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p id={idAyuda} className="tb-escribir__ayuda">
        <span>
          <kbd>Enter</kbd> manda · <kbd>@</kbd> avisa
        </span>
        {alCancelar && (
          <button type="button" className="tb-escribir__cancelar" onClick={alCancelar}>
            Cancelar
          </button>
        )}
      </p>
    </div>
  )
}
