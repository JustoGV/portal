"use client"
import { useLayoutEffect, useRef, useState } from "react"
import { gsap, quieto } from "@/lib/gsap"
import { useNavegacionLista } from "./NavegacionLista"

export type OpcionSegmento = { valor: string; texto: string; cuenta?: number; href: string }

/**
 * Filtro segmentado (docs/reglas/07 §4): un relleno de color que se desliza al elegir. El relleno se
 * mueve desde donde estaba, medido antes del cambio de estado (docs/reglas/08 §4.9).
 */
export function Segmentos({ etiqueta, opciones, actual }: { etiqueta: string; opciones: OpcionSegmento[]; actual: string }) {
  const { navegar } = useNavegacionLista()
  const [elegido, setElegido] = useState(actual)
  const [visto, setVisto] = useState(actual)
  const pista = useRef<HTMLDivElement>(null)
  const relleno = useRef<HTMLSpanElement>(null)
  const primera = useRef(true)

  // Si la URL cambió por otro lado (atrás/adelante), el elegido la sigue.
  if (actual !== visto) {
    setVisto(actual)
    setElegido(actual)
  }

  useLayoutEffect(() => {
    const p = pista.current
    const r = relleno.current
    if (!p || !r) return
    const ubicar = (animar: boolean) => {
      const el = p.querySelector<HTMLElement>(`[data-valor="${CSS.escape(elegido)}"]`)
      if (!el) return gsap.set(r, { opacity: 0 })
      const destino = { x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight, opacity: 1 }
      if (animar && !quieto()) gsap.to(r, { ...destino, duration: 0.32, ease: "power3.out", overwrite: "auto" })
      else gsap.set(r, destino)
    }
    ubicar(!primera.current)
    primera.current = false
    const ro = new ResizeObserver(() => ubicar(false))
    ro.observe(p)
    return () => ro.disconnect()
  }, [elegido])

  return (
    <div ref={pista} className="ui-segmentos" role="group" aria-label={etiqueta}>
      <span ref={relleno} className="ui-segmentos__relleno" aria-hidden="true" />
      {opciones.map((o) => (
        <a
          key={o.valor}
          href={o.href}
          data-valor={o.valor}
          className="ui-segmentos__opcion"
          aria-current={o.valor === elegido ? "true" : undefined}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
            e.preventDefault()
            if (o.valor === elegido) return
            setElegido(o.valor)
            navegar(o.href)
          }}
        >
          {o.texto}
          {o.cuenta !== undefined && <span className="ui-segmentos__cuenta">{o.cuenta}</span>}
        </a>
      ))}
    </div>
  )
}
