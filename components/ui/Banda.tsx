"use client"
import { useLayoutEffect, useRef, type ReactNode } from "react"
import { gsap, quieto } from "@/lib/gsap"
import "@/styles/banda.css"

type Props = {
  /** Arriba del título, en chico: la sección de la barra («Portal», «Administración») o «Mi cuenta». */
  sobre: string
  titulo: ReactNode
  bajada?: ReactNode
  /** Lo que va antes del título, como las iniciales en Mi cuenta. */
  delante?: ReactNode
  /** El botón principal de la pantalla: sobre el azul va blanco. */
  accion?: ReactNode
  /** La fila de abajo: las cifras que filtran o los datos de la cuenta. */
  children?: ReactNode
  idTitulo?: string
}

/**
 * La cabecera de cada pantalla (D-036): una banda azul noche, del color de la barra, con la sección, el
 * título y para qué sirve; a la derecha el botón principal; abajo, separada por una línea, la fila de cifras
 * o de datos. Salió de la versión «Banda» de Mi cuenta, que Mateo eligió para «esa zona» el 2026-11-18.
 * Movimiento, una vez al entrar: el fondo se abre como cortina de izquierda a derecha (0,9 s, expo.out) y lo
 * de adentro sube de a uno (0,5 s, cada 0,07 s). Con movimiento reducido, quieta.
 */
export function Banda({ sobre, titulo, bajada, delante, accion, children, idTitulo }: Props) {
  const raiz = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const r = raiz.current
    if (!r || quieto()) return
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".ui-banda__fondo", { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "expo.out" })
        .fromTo(".ui-banda__cabeza > *, .ui-banda__pie", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, clearProps: "opacity,transform" }, 0.25)
    }, r)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={raiz} className="ui-banda" aria-labelledby={idTitulo}>
      <span className="ui-banda__fondo" aria-hidden="true" />
      <div className="ui-banda__cabeza">
        {delante}
        <div className="ui-banda__textos">
          <p className="ui-banda__sobre">{sobre}</p>
          <h1 id={idTitulo} className="ui-banda__titulo">
            {titulo}
          </h1>
          {bajada && <p className="ui-banda__bajada">{bajada}</p>}
        </div>
        {accion && <div className="ui-banda__accion">{accion}</div>}
      </div>
      {children && <div className="ui-banda__pie">{children}</div>}
    </section>
  )
}
