"use client"
// El campo de las pantallas de ingreso (WU-06, variante "Escenario" elegida por Mateo el 2026-11-12):
// etiqueta flotante, ícono a dos colores que se anima al entrar (D-018), tilde, ojo para la contraseña,
// aviso de Bloq Mayús y línea de mensaje reservada (docs/reglas/06 §1.7). Sobre vidrio oscuro, con un brillo
// que sigue al mouse. La regla de cada campo vive en lib/ y la usa también la acción al guardar (06 §1.1).
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react"
import { pegar } from "@/lib/texto"
import { IconoDuo, type IconoDuoApi, type NombreDuo } from "@/components/iconos/IconoDuo"
import { campoIngreso as t } from "@/i18n/es/ingreso"

type Props = {
  etiqueta: string
  name: string
  tipo: "text" | "email" | "password"
  /** Tope de caracteres: no deja escribir más (06 §1.4). */
  max?: number
  inputMode?: "numeric" | "text" | "email"
  obligatorio?: boolean
  valor: string
  alCambiar: (v: string) => void
  icono: NombreDuo
  autoComplete: string
  autoFocus?: boolean
  ok?: boolean
  /** De 0 a 1: la línea de abajo que se llena. */
  progreso?: number
  /** El mensaje de abajo: ayuda (gris), ok (marca) o error (rojo). */
  mensaje?: { texto: string; tono: "ayuda" | "ok" | "error" }
  mayus?: boolean
  alTecla?: (e: KeyboardEvent<HTMLInputElement>) => void
  alSalir?: () => void
  alEnter?: () => void
}

export function CampoDuo(p: Props) {
  const id = useId()
  const icono = useRef<IconoDuoApi>(null)
  const ojo = useRef<IconoDuoApi>(null)
  const caja = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const idMensaje = `${id}-mensaje`
  const esClave = p.tipo === "password"

  // El brillo sigue al mouse: dos variables CSS, sin estado de React.
  const brillo = (e: PointerEvent<HTMLDivElement>) => {
    if (!caja.current) return
    const r = caja.current.getBoundingClientRect()
    caja.current.style.setProperty("--mx", `${e.clientX - r.left}px`)
    caja.current.style.setProperty("--my", `${e.clientY - r.top}px`)
  }

  return (
    <div className="cd" data-ok={p.ok || undefined} data-error={p.mensaje?.tono === "error" || undefined} data-lleno={p.valor ? "" : undefined}>
      <div ref={caja} className="cd__caja" onPointerMove={brillo}>
        <span className="cd__icono">
          <IconoDuo ref={icono} nombre={p.icono} tamano={22} />
        </span>
        <input
          id={id}
          className="cd__entrada"
          name={p.name}
          type={esClave && !visible ? "password" : p.tipo === "email" ? "email" : "text"}
          inputMode={p.inputMode}
          required={p.obligatorio}
          value={p.valor}
          placeholder=" "
          autoComplete={p.autoComplete}
          autoFocus={p.autoFocus}
          spellCheck={false}
          autoCapitalize={p.tipo === "text" ? undefined : "none"}
          maxLength={p.max ?? (p.tipo === "email" ? 254 : 128)}
          aria-invalid={p.mensaje?.tono === "error" || undefined}
          aria-describedby={p.mensaje?.texto || p.mayus ? idMensaje : undefined}
          onChange={(e) => p.alCambiar(e.target.value)}
          onFocus={() => icono.current?.animar("foco")}
          onBlur={p.alSalir}
          onKeyDown={(e) => {
            p.alTecla?.(e)
            if (e.key === "Enter" && p.alEnter) {
              e.preventDefault()
              p.alEnter()
            }
          }}
          onKeyUp={p.alTecla}
        />
        <label htmlFor={id} className="cd__etiqueta">
          {p.etiqueta}
        </label>
        {p.ok && (
          <span className="cd__tilde">
            <TildeQueEntra />
          </span>
        )}
        {esClave && (
          <button
            type="button"
            className="cd__ojo"
            aria-label={visible ? t.ocultar : t.mostrar}
            aria-pressed={visible}
            onClick={() => {
              setVisible((v) => !v)
              ojo.current?.animar("alternar")
            }}
          >
            <IconoDuo ref={ojo} nombre="ojo" tamano={20} tachado={visible} />
          </button>
        )}
        <span className="cd__linea" style={{ "--progreso": p.progreso ?? (p.valor ? 1 : 0) } as CSSProperties} aria-hidden="true" />
      </div>
      <div id={idMensaje} className="cd__pie" aria-live="polite">
        {p.mayus ? (
          <span className="cd__mensaje" data-tono="aviso">
            {t.mayus}
          </span>
        ) : p.mensaje?.texto ? (
          <span className="cd__mensaje" data-tono={p.mensaje.tono} role={p.mensaje.tono === "error" ? "alert" : undefined}>
            {pegar(p.mensaje.texto)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** El tilde se dibuja una vez, cuando aparece (no en cada tecla). */
function TildeQueEntra() {
  const api = useRef<IconoDuoApi>(null)
  useEffect(() => api.current?.animar(), [])
  return <IconoDuo ref={api} nombre="tilde" tamano={20} />
}
