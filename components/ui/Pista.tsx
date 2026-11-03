"use client"
import type { ReactElement, ReactNode } from "react"
import { OverlayArrow, Tooltip, TooltipTrigger } from "react-aria-components"

/**
 * Tooltip diseñado (docs/reglas/05 §6): abre a los 350 ms de reposo; si otro se cerró hace poco,
 * abre sin esperar (lo maneja React Aria); nunca dos a la vez.
 */
export function Pista({ texto, children, lado = "top" }: { texto: ReactNode; children: ReactElement; lado?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TooltipTrigger delay={350} closeDelay={0}>
      {children}
      <Tooltip className="ui-pista" placement={lado} offset={8}>
        <OverlayArrow className="ui-pista__flecha">
          <svg width={12} height={6} viewBox="0 0 12 6" aria-hidden="true">
            <path d="M0 0 L6 6 L12 0" />
          </svg>
        </OverlayArrow>
        {texto}
      </Tooltip>
    </TooltipTrigger>
  )
}
