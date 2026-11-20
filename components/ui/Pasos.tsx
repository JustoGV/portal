"use client"
import { Children, useLayoutEffect, useRef, type ReactNode } from "react"
import { Icono } from "@/components/iconos/Icono"
import { comun } from "@/i18n/es/comun"
import { escribirIconos, gsap, quieto } from "@/lib/gsap"

type PropsIndicador = {
  /** El nombre de cada paso, en orden. */
  pasos: readonly string[]
  /** El paso que se ve (desde 0). */
  actual: number
  /** Hasta qué paso se llegó: los anteriores quedan con tilde y se puede volver a ellos tocándolos. */
  alcanzado: number
  alIr: (paso: number) => void
  etiqueta: string
}

/**
 * El indicador de un formulario en pasos (WU-06 pantalla 3, D-026; referencia: React Bits · Stepper).
 * Una pastilla se desliza al paso actual, medida antes de moverse (docs/reglas/08 §4.9); al completar
 * un paso, su número se cambia por un tilde que se dibuja. Sin rebote (08 §3).
 */
export function IndicadorPasos({ pasos, actual, alcanzado, alIr, etiqueta }: PropsIndicador) {
  const pista = useRef<HTMLOListElement>(null)
  const pastilla = useRef<HTMLSpanElement>(null)
  const primera = useRef(true)
  const hechoAntes = useRef(alcanzado)

  useLayoutEffect(() => {
    const p = pista.current
    const r = pastilla.current
    if (!p || !r) return
    const ubicar = (animar: boolean) => {
      const el = p.querySelector<HTMLElement>('[aria-current="step"]')
      if (!el) return
      const destino = { x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight, opacity: 1 }
      if (animar && !quieto()) gsap.to(r, { ...destino, duration: 0.32, ease: "power3.out", overwrite: "auto" })
      else gsap.set(r, destino)
    }
    ubicar(!primera.current)
    primera.current = false
    const ro = new ResizeObserver(() => ubicar(false))
    ro.observe(p)
    return () => ro.disconnect()
  }, [actual])

  // El tilde se dibuja solo cuando la persona completa un paso, no al abrir un formulario ya completo.
  useLayoutEffect(() => {
    if (alcanzado > hechoAntes.current) {
      const nuevo = pista.current?.querySelectorAll<HTMLElement>(".ui-pasos__paso")[alcanzado - 1]
      escribirIconos(nuevo ?? null)
    }
    hechoAntes.current = alcanzado
  }, [alcanzado])

  return (
    <ol ref={pista} className="ui-pasos" aria-label={etiqueta}>
      <span ref={pastilla} className="ui-pasos__pastilla" aria-hidden="true" />
      {pasos.map((nombre, i) => {
        const esActual = i === actual
        const hecho = !esActual && i < alcanzado
        const estado = esActual ? comun.pasoActual : hecho ? comun.pasoHecho : comun.pasoPendiente
        return (
          <li key={nombre} className="ui-pasos__item" data-actual={esActual || undefined}>
            <button
              type="button"
              className="ui-pasos__paso"
              data-estado={esActual ? "actual" : hecho ? "hecho" : "pendiente"}
              aria-current={esActual ? "step" : undefined}
              aria-label={`${comun.pasoDe(i + 1, pasos.length)}: ${nombre}, ${estado}`}
              disabled={i > alcanzado}
              onClick={() => !esActual && alIr(i)}
            >
              <span className="ui-pasos__num" aria-hidden="true">
                {hecho ? <Icono nombre="tilde" tamano={16} /> : i + 1}
              </span>
              <span className="ui-pasos__nombre" aria-hidden="true">
                {nombre}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Los paneles de un formulario en pasos. Todos quedan montados y apilados en la misma celda: la tarjeta
 * tiene siempre el alto del paso de campos más largo (no se anima el alto, 08 §4.2; un panel marcado con
 * `ui-pasos__revision` no suma alto: ocupa el de los demás y, si no entra, se desplaza adentro) y los campos de los pasos que
 * no se ven siguen viajando al guardar. El que no se ve queda `inert`: ni el foco ni el teclado entran.
 * Al cambiar de paso, el que se va sale 16 px hacia un lado y el nuevo entra 24 px desde el otro.
 */
export function PanelesPasos({ actual, nombres, children }: { actual: number; nombres: readonly string[]; children: ReactNode }) {
  const caja = useRef<HTMLDivElement>(null)
  const antes = useRef(actual)

  useLayoutEffect(() => {
    const paneles = Array.from(caja.current?.children ?? []) as HTMLElement[]
    const previo = antes.current
    antes.current = actual
    // React Aria saca `inert` de lo que estaba afuera de un desplegable al cerrarlo: se repone en cada cambio.
    paneles.forEach((el, i) => (el.inert = i !== actual))
    if (previo === actual) return
    const sale = paneles[previo]
    const entra = paneles[actual]
    if (!sale || !entra) return
    const lado = actual > previo ? 1 : -1
    gsap.killTweensOf([sale, entra])
    if (quieto()) {
      gsap.set(sale, { autoAlpha: 0, x: 0 })
      gsap.set(entra, { opacity: 1, x: 0, visibility: "visible" })
      return
    }
    gsap.fromTo(sale, { autoAlpha: 1, x: 0 }, { autoAlpha: 0, x: -16 * lado, duration: 0.15, ease: "power2.in" })
    // El que entra queda visible desde ya (solo transparente): un panel con visibility: hidden no puede recibir el foco.
    gsap.fromTo(entra, { opacity: 0, x: 24 * lado, visibility: "visible" }, { opacity: 1, x: 0, duration: 0.32, ease: "power3.out", delay: 0.12, clearProps: "transform" })
  }, [actual])

  return (
    <div ref={caja} className="ui-pasos__paneles">
      {Children.map(children, (panel, i) => (
        <div className="ui-pasos__panel" role="group" aria-label={nombres[i]} data-activo={i === actual || undefined} inert={i !== actual}>
          {panel}
        </div>
      ))}
    </div>
  )
}
