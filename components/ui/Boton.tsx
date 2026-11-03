"use client"
import { useEffect, useRef, type ReactNode } from "react"
import { Button, type ButtonProps } from "react-aria-components"
import { Icono } from "@/components/iconos/Icono"
import type { NombreIcono } from "@/components/iconos/trazos"
import { conHover, escribirIconos, gsap, quieto } from "@/lib/gsap"

type Props = Omit<ButtonProps, "children" | "className"> & {
  variante?: "primaria" | "secundaria" | "peligro" | "sutil"
  icono?: NombreIcono
  cargando?: boolean
  textoCargando?: string
  children: ReactNode
  className?: string
}

/**
 * Una sola familia de botones (docs/reglas/05 §1). Al pasar el mouse: una línea de 3 px entra por
 * abajo, el color sube y llena el botón, escala 1,05; al apretar, 0,95. Con movimiento reducido el
 * cambio de color es directo. En el teléfono, el relleno aparece al tocar.
 */
export function Boton({ variante = "secundaria", icono, cargando, textoCargando, children, className, isDisabled, ...resto }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const liquido = variante !== "sutil"

  // Al desmontar no queda ningún tween colgado del botón.
  useEffect(() => {
    const b = ref.current
    return () => {
      if (b) gsap.killTweensOf([b, ...b.querySelectorAll(".ui-boton__relleno, .ui-boton__linea")])
    }
  }, [])

  function llenar(lleno: boolean) {
    const b = ref.current
    if (!b || !liquido) return
    const relleno = b.querySelector(".ui-boton__relleno")
    const linea = b.querySelector(".ui-boton__linea")
    if (lleno) b.setAttribute("data-lleno", "")
    else b.removeAttribute("data-lleno")
    if (quieto()) {
      gsap.set(relleno, { scaleY: lleno ? 1 : 0 })
      return
    }
    if (lleno) {
      gsap.timeline({ overwrite: "auto" })
        .to(linea, { scaleX: 1, duration: 0.3, ease: "power2.out", overwrite: "auto" })
        .to(relleno, { scaleY: 1, duration: 0.3, ease: "power2.out", overwrite: "auto" }, 0.12)
      gsap.to(b, { scale: 1.05, duration: 0.3, ease: "power2.out", overwrite: "auto" })
    } else {
      gsap.to(relleno, { scaleY: 0, duration: 0.25, ease: "power2.inOut", overwrite: "auto" })
      gsap.to(linea, { scaleX: 0, duration: 0.25, ease: "power2.inOut", delay: 0.08, overwrite: "auto" })
      gsap.to(b, { scale: 1, duration: 0.25, ease: "power2.out", overwrite: "auto" })
    }
  }

  function apretar(abajo: boolean) {
    if (quieto() || !ref.current) return
    gsap.to(ref.current, { scale: abajo ? 0.95 : conHover() ? 1.05 : 1, duration: 0.12, ease: "power2.out", overwrite: "auto" })
  }

  const deshabilitado = isDisabled || cargando

  return (
    <Button
      {...resto}
      ref={ref}
      isDisabled={deshabilitado}
      data-cargando={cargando || undefined}
      className={`ui-boton ui-boton--${variante}${className ? ` ${className}` : ""}`}
      onHoverStart={(e) => {
        if (deshabilitado) return
        llenar(true)
        escribirIconos(ref.current)
        resto.onHoverStart?.(e)
      }}
      onHoverEnd={(e) => {
        llenar(false)
        resto.onHoverEnd?.(e)
      }}
      onPressStart={(e) => {
        apretar(true)
        if (e.pointerType === "touch") llenar(true)
        resto.onPressStart?.(e)
      }}
      onPressEnd={(e) => {
        apretar(false)
        if (e.pointerType === "touch") llenar(false)
        resto.onPressEnd?.(e)
      }}
    >
      {liquido && <span className="ui-boton__relleno" aria-hidden="true" />}
      {liquido && <span className="ui-boton__linea" aria-hidden="true" />}
      <span className="ui-boton__contenido">
        {icono && <Icono nombre={icono} />}
        {cargando ? (textoCargando ?? children) : children}
      </span>
    </Button>
  )
}
