"use client"
import { useId, useRef, type ChangeEvent, type CSSProperties, type InputHTMLAttributes, type KeyboardEvent } from "react"
import { Icono } from "@/components/iconos/Icono"
import type { NombreIcono } from "@/components/iconos/trazos"
import { escribirIconos } from "@/lib/gsap"
import { comun } from "@/i18n/es/comun"

type Props = {
  etiqueta: string
  name: string
  valor: string
  alCambiar: (valor: string) => void
  tipo?: "text" | "email" | "password" | "url"
  icono?: NombreIcono
  obligatorio?: boolean
  /** Tope de caracteres: no deja escribir más (docs/reglas/06 §1.4). */
  max?: number
  /** "siempre": contador desde la primera letra; "cerca": aparece pasado el 80 % del tope. */
  contador?: "siempre" | "cerca"
  /** Filtro de lo que se acepta de un cambio: null deja el campo como estaba. */
  filtrar?: (nuevo: string, actual: string) => string | null
  /** De 0 a 1: la línea de abajo que se llena. */
  progreso?: number
  ok?: boolean
  error?: string
  ayuda?: string
  multilinea?: boolean
  autoFocus?: boolean
  autoComplete?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"]
  alSalir?: () => void
  ancho?: boolean
  mono?: boolean
}

/** Campo con etiqueta flotante, contador, línea de progreso, tilde y línea de error reservada (05 §2, 06). */
export function Campo(p: Props) {
  const id = useId()
  const raiz = useRef<HTMLDivElement>(null)
  const idAyuda = `${id}-ayuda`
  const idError = `${id}-error`
  const n = p.valor.length
  const verContador = p.max !== undefined && (p.contador === "siempre" || (p.contador === "cerca" && n >= p.max * 0.8))

  const cambiar = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nuevo = e.target.value
    if (p.filtrar) {
      const v = p.filtrar(nuevo, p.valor)
      if (v !== null) p.alCambiar(v)
      return
    }
    p.alCambiar(nuevo)
  }

  const comunes = {
    id,
    name: p.name,
    value: p.valor,
    onChange: cambiar,
    placeholder: " ",
    className: p.mono ? "ui-campo__entrada ui-mono" : "ui-campo__entrada",
    maxLength: p.max,
    required: p.obligatorio,
    autoFocus: p.autoFocus,
    autoComplete: p.autoComplete ?? "off",
    "aria-invalid": p.error ? true : undefined,
    "aria-describedby": [p.ayuda ? idAyuda : "", p.error ? idError : ""].filter(Boolean).join(" ") || undefined,
    onFocus: () => escribirIconos(raiz.current),
    onBlur: p.alSalir,
  }

  return (
    <div
      ref={raiz}
      className={`ui-campo${p.ancho ? " ui-campo--ancho" : ""}`}
      data-con-icono={p.icono ? "" : undefined}
      data-error={p.error ? "" : undefined}
      data-ok={p.ok && !p.error ? "" : undefined}
    >
      <div className="ui-campo__control">
        {p.icono && <Icono nombre={p.icono} className="ui-campo__icono" />}
        {p.multilinea ? (
          <textarea {...comunes} rows={3} onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && e.stopPropagation()} />
        ) : (
          <input {...comunes} type={p.tipo ?? "text"} inputMode={p.inputMode} enterKeyHint="next" />
        )}
        <label htmlFor={id} className="ui-campo__etiqueta">
          {p.etiqueta}
          {p.obligatorio && (
            <span className="ui-campo__obligatorio" aria-hidden="true">
              {" "}*
            </span>
          )}
        </label>
        {p.ok && !p.error && <Icono nombre="tilde" className="ui-campo__tilde" />}
        <span className="ui-campo__linea" style={{ "--progreso": p.progreso ?? 0 } as CSSProperties} aria-hidden="true" />
      </div>
      <div className="ui-campo__pie">
        {p.error ? (
          <span id={idError} className="ui-campo__error" role="alert">
            {p.error}
          </span>
        ) : p.ayuda ? (
          <span id={idAyuda} className="ui-campo__ayuda">
            {p.ayuda}
          </span>
        ) : (
          <span />
        )}
        {verContador && (
          <span className="ui-campo__contador" aria-live="polite">
            {n}/{p.max}
          </span>
        )}
      </div>
      {p.obligatorio && <span className="sr-solo">{comun.obligatorio}</span>}
    </div>
  )
}
