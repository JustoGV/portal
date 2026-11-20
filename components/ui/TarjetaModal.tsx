"use client"
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Dialog, Modal, ModalOverlay } from "react-aria-components"
import { gsap, quieto } from "@/lib/gsap"

type Props = {
  abierto: boolean
  /** Lo pide Escape o un click en el fondo: el que usa la tarjeta decide si cierra. */
  alPedirCierre: () => void
  etiqueta?: string
  idTitulo?: string
  ancho?: string
  rol?: "dialog" | "alertdialog"
  /**
   * De dónde sale la tarjeta: el rectángulo de la fila o del botón que la abrió (D-030, como la ficha de
   * Sanalys y el card de EDV). Si está a la vista, la tarjeta crece desde ahí y al cerrar vuelve ahí.
   */
  origen?: () => DOMRect | null
  children: ReactNode
}

/** Lo que entra por partes después de la tarjeta: cabecera, pasos, campos del paso que se ve, bloques marcados y botones. */
const PARTES = ".ui-dialogo__cabecera, .ui-pasos, .ui-pasos__panel[data-activo] .ui-campo, .ui-dialogo__campos:not(.ui-pasos__panel *) > *, [data-cascada], .ui-dialogo__acciones"

const aLaVista = (r: DOMRect | null | undefined): r is DOMRect => !!r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight
/** La tarjeta puesta encima de su origen: corrida y achicada hasta calzar con ese rectángulo. */
const sobre = (caja: DOMRect, o: DOMRect) => ({ x: o.left - caja.left, y: o.top - caja.top, scaleX: o.width / caja.width, scaleY: o.height / caja.height })

/**
 * La tarjeta centrada y bloqueante (docs/reglas/05 §4). Con `origen` crece desde la fila o el botón que la
 * abrió (0,55 s, expo.out), su contenido aparece cuando ya casi está abierta y sus partes entran una
 * detrás de otra; al cerrar vuelve a su origen (0,38 s). Sin origen: entra creciendo desde la mitad de su
 * tamaño y 40 px más abajo, y sale achicándose al 80 %. GSAP, sin transition de CSS. Se queda montada
 * mientras corre la salida y recién después se desmonta.
 */
export function TarjetaModal({ abierto, alPedirCierre, etiqueta, idTitulo, ancho, rol = "dialog", origen, children }: Props) {
  const [montada, setMontada] = useState(abierto)
  const velo = useRef<HTMLDivElement>(null)
  const tarjeta = useRef<HTMLElement>(null)
  const alOrigen = useRef(origen)
  if (abierto && !montada) setMontada(true)

  // El origen más nuevo, para la salida: la ficha puede haber pasado a otra fila.
  useLayoutEffect(() => {
    alOrigen.current = origen
  })

  useLayoutEffect(() => {
    const v = velo.current
    const t = tarjeta.current
    if (!montada || !v || !t) return
    const interior = t.querySelector<HTMLElement>(".ui-dialogo__interior")
    gsap.killTweensOf([v, t, interior])
    if (abierto) {
      gsap.set(t, { clearProps: "transform,transformOrigin,opacity" })
      if (interior) gsap.set(interior, { clearProps: "opacity" })
      const o = quieto() ? null : alOrigen.current?.()
      const partes = () => Array.from(t.querySelectorAll<HTMLElement>(PARTES))
      // El punto de partida se fija ya; la animación arranca después del primer pintado, cuando el
      // montaje del contenido terminó. Si arrancara en el mismo cuadro, ese trabajo se come los
      // primeros cuadros y la tarjeta salta (docs/reglas/05 §4, 08 §4.10).
      gsap.set(v, { opacity: 0 })
      if (aLaVista(o)) {
        gsap.set(t, { ...sobre(t.getBoundingClientRect(), o), transformOrigin: "0 0", opacity: 1 })
        if (interior) gsap.set(interior, { opacity: 0 })
      } else gsap.set(t, quieto() ? { opacity: 0 } : { opacity: 0, scale: 0.5, y: 40 })
      let cuadro = requestAnimationFrame(() => {
        cuadro = requestAnimationFrame(() => {
          if (quieto()) {
            gsap.to([v, t], { opacity: 1, duration: 0.15 })
            return
          }
          gsap.to(v, { opacity: 1, duration: 0.3, ease: "power2.out" })
          if (aLaVista(o)) {
            gsap.to(t, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.55, ease: "expo.out", clearProps: "transform,transformOrigin" })
            if (interior) gsap.to(interior, { opacity: 1, duration: 0.22, delay: 0.16, ease: "power1.out", clearProps: "opacity" })
            gsap.fromTo(partes(), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, delay: 0.26, ease: "power3.out", clearProps: "opacity,transform" })
          } else {
            gsap.to(t, { scale: 1, y: 0, duration: 0.42, ease: "expo.out", clearProps: "transform" })
            gsap.to(t, { opacity: 1, duration: 0.15, ease: "none" })
            gsap.fromTo(partes(), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.32, stagger: 0.045, delay: 0.14, ease: "power3.out", clearProps: "opacity,transform" })
          }
        })
      })
      return () => cancelAnimationFrame(cuadro)
    } else {
      const fin = () => setMontada(false)
      if (quieto()) {
        gsap.to([v, t], { opacity: 0, duration: 0.15, onComplete: fin })
        return
      }
      const o = alOrigen.current?.()
      if (aLaVista(o)) {
        // De vuelta a su fila: lo que tiene adentro se apaga y la tarjeta se achica sobre el rectángulo de origen.
        gsap.set(t, { transformOrigin: "0 0" })
        if (interior) gsap.to(interior, { opacity: 0, duration: 0.12, ease: "power1.in" })
        gsap.to(t, { ...sobre(t.getBoundingClientRect(), o), duration: 0.38, delay: 0.05, ease: "power3.inOut" })
        gsap.to(t, { opacity: 0, duration: 0.12, delay: 0.33, ease: "none" })
        gsap.to(v, { opacity: 0, duration: 0.3, delay: 0.1, ease: "power2.in", onComplete: fin })
        return
      }
      gsap.to(t, { scale: 0.8, opacity: 0, duration: 0.18, ease: "power2.in" })
      gsap.to(v, { opacity: 0, duration: 0.2, ease: "power2.in", onComplete: fin })
    }
  }, [abierto, montada])

  return (
    <ModalOverlay
      ref={velo}
      isOpen={montada}
      isDismissable
      onOpenChange={(abrir) => {
        if (!abrir) alPedirCierre()
      }}
      className="ui-velo"
    >
      <Modal ref={tarjeta as React.RefObject<HTMLDivElement>} className="ui-dialogo" style={{ "--ancho": ancho } as CSSProperties}>
        <Dialog role={rol} aria-label={etiqueta} aria-labelledby={idTitulo} className="ui-dialogo__interior">
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
