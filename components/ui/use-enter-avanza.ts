"use client"
import type { KeyboardEvent } from "react"

/**
 * Enter pasa al campo siguiente y el último Enter guarda (docs/reglas/06 §11). En un textarea, Enter es
 * salto de línea (el Campo multilínea corta la propagación). Se pone en el onKeyDown del <form>.
 * En un formulario en pasos (D-026) solo cuentan los campos del paso que se ve, y el último Enter del
 * paso aprieta el botón marcado con `data-enter-sigue` ("Siguiente") en vez de guardar.
 */
export const enterAvanza = (e: KeyboardEvent<HTMLFormElement>) => {
  if (e.key !== "Enter" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return
  const objetivo = e.target as HTMLElement
  if (!(objetivo instanceof HTMLInputElement)) return
  // Un combobox abierto usa Enter para elegir.
  if (objetivo.getAttribute("aria-expanded") === "true") return
  const campos = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([disabled]), textarea:not([disabled]), button[data-campo]"),
  ).filter((c) => c.getClientRects().length > 0 && !c.closest("[inert]") && getComputedStyle(c).visibility !== "hidden")
  const i = campos.indexOf(objetivo)
  if (i === -1) return
  e.preventDefault()
  const siguiente = campos[i + 1]
  if (siguiente) siguiente.focus()
  else {
    const sigue = e.currentTarget.querySelector<HTMLButtonElement>("button[data-enter-sigue]:not([disabled])")
    if (sigue) sigue.click()
    else e.currentTarget.requestSubmit()
  }
}
