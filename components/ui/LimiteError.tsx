"use client"
import { useRouter } from "next/navigation"
import { Component, startTransition, type ReactNode } from "react"
import { Icono } from "@/components/iconos/Icono"
import { comun } from "@/i18n/es/comun"

class Limite extends Component<{ children: ReactNode; alReintentar: () => void }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="ui-vacio" role="alert">
        <Icono nombre="alerta" tamano={48} className="ui-vacio__icono" />
        <p className="ui-vacio__titulo">{comun.errorCarga}</p>
        <div className="ui-vacio__accion">
          <button
            type="button"
            className="ui-boton ui-boton--secundaria"
            onClick={() => {
              this.props.alReintentar()
              this.setState({ error: false })
            }}
          >
            <span className="ui-boton__contenido">{comun.reintentar}</span>
          </button>
        </div>
      </div>
    )
  }
}

/**
 * Un bloque que falla dice qué revisar y deja intactos los otros (docs/reglas/03 §5). "Reintentar"
 * vuelve a pedir los datos al servidor, sin recargar la página.
 */
export function LimiteError({ children }: { children: ReactNode }) {
  const router = useRouter()
  return <Limite alReintentar={() => startTransition(() => router.refresh())}>{children}</Limite>
}
