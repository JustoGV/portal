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
  children: ReactNode
}

/**
 * La tarjeta centrada y bloqueante (docs/reglas/05 §4): entra creciendo desde la mitad de su tamaño y
 * 40 px más abajo, se vuelve opaca rápido, y sale achicándose al 80 %. GSAP, sin transition de CSS.
 * Se queda montada mientras corre la salida y recién después se desmonta.
 */
export function TarjetaModal({ abierto, alPedirCierre, etiqueta, idTitulo, ancho, rol = "dialog", children }: Props) {
  const [montada, setMontada] = useState(abierto)
  const velo = useRef<HTMLDivElement>(null)
  const tarjeta = useRef<HTMLElement>(null)
  if (abierto && !montada) setMontada(true)

  useLayoutEffect(() => {
    const v = velo.current
    const t = tarjeta.current
    if (!montada || !v || !t) return
    if (abierto) {
      gsap.killTweensOf([v, t])
      // El punto de partida se fija ya; la animación arranca después del primer pintado, cuando el
      // montaje del contenido terminó. Si arrancara en el mismo cuadro, ese trabajo se come los
      // primeros cuadros y la tarjeta salta (docs/reglas/05 §4, 08 §4.10).
      gsap.set(v, { opacity: 0 })
      gsap.set(t, quieto() ? { opacity: 0 } : { opacity: 0, scale: 0.5, y: 40 })
      let cuadro = requestAnimationFrame(() => {
        cuadro = requestAnimationFrame(() => {
          if (quieto()) {
            gsap.to([v, t], { opacity: 1, duration: 0.15 })
            return
          }
          gsap.to(v, { opacity: 1, duration: 0.22, ease: "power2.out" })
          gsap.to(t, { scale: 1, y: 0, duration: 0.42, ease: "expo.out", clearProps: "transform" })
          gsap.to(t, { opacity: 1, duration: 0.15, ease: "none" })
        })
      })
      return () => cancelAnimationFrame(cuadro)
    } else {
      gsap.killTweensOf([v, t])
      const fin = () => setMontada(false)
      if (quieto()) {
        gsap.to([v, t], { opacity: 0, duration: 0.15, onComplete: fin })
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
