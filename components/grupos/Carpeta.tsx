"use client"
import { gsap, quieto } from "@/lib/gsap"

/**
 * La carpeta de un grupo (WU-06 pantalla 4; referencia: React Bits · Folder, rehecha en GSAP y con los
 * colores de la marca). Un fondo con su pestaña, hasta tres hojas y un frente. Cerrada, las hojas apenas
 * asoman; al pasar el mouse o tomar el foco, el frente se vuelca hacia adelante y las hojas suben. Un grupo
 * sin servicios no tiene hojas. Es un dibujo: el nombre y la cantidad los dice la tarjeta.
 */
export function Carpeta({ hojas, className }: { hojas: number; className?: string }) {
  const n = Math.max(0, Math.min(3, hojas))
  return (
    <span className={className ? `gr-carpeta ${className}` : "gr-carpeta"} data-vacia={n === 0 || undefined} aria-hidden="true">
      <span className="gr-carpeta__fondo" />
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="gr-carpeta__hoja" data-hoja={i} />
      ))}
      <span className="gr-carpeta__frente" />
    </span>
  )
}

/** Cuánto sube y gira cada hoja al abrirse la carpeta (px a 16 px de letra; la del medio es la que más sube). */
const HOJAS = [
  { y: -0.375, rotate: -7 },
  { y: -0.875, rotate: 0 },
  { y: -0.625, rotate: 7 },
]

/**
 * Abre o cierra la carpeta que hay adentro de `raiz`. Abrir: el frente se vuelca en 0,3 s y las hojas suben
 * 6, 14 y 10 px, una cada 0,04 s (`power2.out`). Cerrar: todo vuelve en 0,22 s. Interrumpible.
 */
export const moverCarpeta = (raiz: Element | null, abierta: boolean) => {
  const c = raiz?.querySelector<HTMLElement>(".gr-carpeta")
  if (!c || quieto()) return
  const frente = c.querySelector(".gr-carpeta__frente")
  const hojas = Array.from(c.querySelectorAll<HTMLElement>(".gr-carpeta__hoja"))
  if (abierta) {
    gsap.to(frente, { rotateX: -32, scaleY: 0.94, duration: 0.3, ease: "power2.out", overwrite: "auto" })
    hojas.forEach((h, i) => {
      const d = HOJAS[Number(h.dataset.hoja) % 3]!
      gsap.to(h, { y: `${d.y}em`, rotate: d.rotate, duration: 0.3, delay: i * 0.04, ease: "power2.out", overwrite: "auto" })
    })
  } else {
    gsap.to(frente, { rotateX: 0, scaleY: 1, duration: 0.22, ease: "power2.inOut", overwrite: "auto" })
    gsap.to(hojas, { y: 0, rotate: 0, duration: 0.22, ease: "power2.inOut", overwrite: "auto" })
  }
}
