"use client"
import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import { Icono } from "@/components/iconos/Icono"
import { comun } from "@/i18n/es/comun"

/** Nunca se muestra el error técnico (docs/reglas/03 §6). */
export default function ErrorRuta({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
  return (
    <main className="ui-pagina">
      <div className="ui-vacio" role="alert">
        <Icono nombre="alerta" tamano={48} className="ui-vacio__icono" />
        <h1 className="ui-vacio__titulo">Algo no salió bien</h1>
        <p>{comun.errorCarga}</p>
        <div className="ui-vacio__accion">
          <button type="button" className="ui-boton ui-boton--secundaria" onClick={reset}>
            <span className="ui-boton__contenido">{comun.reintentar}</span>
          </button>
        </div>
      </div>
    </main>
  )
}
