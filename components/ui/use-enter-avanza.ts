"use client"
import type { KeyboardEvent } from "react"

/**
 * Enter pasa al campo siguiente y el último Enter guarda (docs/reglas/06 §11). En un textarea, Enter es
 * salto de línea (el Campo multilínea corta la propagación). Se pone en el onKeyDown del <form>.
 */
export const enterAvanza = (e: KeyboardEvent<HTMLFormElement>) => {
  if (e.key !== "Enter" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return
  const objetivo = e.target as HTMLElement
  if (!(objetivo instanceof HTMLInputElement)) return
  // Un combobox abierto usa Enter para elegir.
  if (objetivo.getAttribute("aria-expanded") === "true") return
  const campos = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([disabled]), textarea:not([disabled]), button[data-campo]"),
  ).filter((c) => c.getClientRects().length > 0)
  const i = campos.indexOf(objetivo)
  if (i === -1) return
  e.preventDefault()
  const siguiente = campos[i + 1]
  if (siguiente) siguiente.focus()
  else e.currentTarget.requestSubmit()
}
