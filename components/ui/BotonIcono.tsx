"use client"
import { useRef } from "react"
import { Button, type ButtonProps } from "react-aria-components"
import { Icono } from "@/components/iconos/Icono"
import type { NombreIcono } from "@/components/iconos/trazos"
import { escribirIconos } from "@/lib/gsap"
import { Pista } from "./Pista"

type Props = Omit<ButtonProps, "children" | "className" | "aria-label"> & {
  icono: NombreIcono
  /** El nombre accesible y el texto del tooltip: obligatorio (docs/reglas/04 §2.5). */
  etiqueta: string
  pista?: string
  peligro?: boolean
  tamano?: 20 | 24
}

export function BotonIcono({ icono, etiqueta, pista, peligro, tamano = 20, ...resto }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <Pista texto={pista ?? etiqueta}>
      <Button
        {...resto}
        ref={ref}
        aria-label={etiqueta}
        className={`ui-boton-icono${peligro ? " ui-boton-icono--peligro" : ""}`}
        onHoverStart={(e) => {
          escribirIconos(ref.current)
          resto.onHoverStart?.(e)
        }}
      >
        <Icono nombre={icono} tamano={tamano} />
      </Button>
    </Pista>
  )
}
