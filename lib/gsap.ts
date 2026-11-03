"use client"
import { gsap } from "gsap"
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(DrawSVGPlugin, useGSAP)

/** Verdadero con movimiento reducido (docs/reglas/08 §1). */
export const quieto = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches

/** Hay hover de verdad (mouse o trackpad), no un dedo. */
export const conHover = () => typeof window !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches

export const EASE = "power3.out"

/**
 * Escribe los trazos de los íconos que hay adentro de `raiz` (docs/reglas/04 §5): DrawSVG, 0,45 s,
 * interrumpible. Solo anima lo que se ve (un ícono oculto no se anima, 04 §4).
 */
export const escribirIconos = (raiz: Element | null, opciones: { retraso?: number; paso?: number } = {}) => {
  if (!raiz || quieto()) return
  const trazos = Array.from(raiz.querySelectorAll<SVGElement>("svg[data-icono] [data-trazo]")).filter(
    (t) => (t.closest("svg") as SVGSVGElement | null)?.getClientRects().length,
  )
  if (!trazos.length) return
  gsap.fromTo(
    trazos,
    { drawSVG: "0% 0%" },
    { drawSVG: "0% 100%", duration: 0.45, ease: EASE, stagger: opciones.paso ?? 0.06, delay: opciones.retraso ?? 0, overwrite: "auto", clearProps: "strokeDasharray,strokeDashoffset" },
  )
}

export { gsap, useGSAP }
