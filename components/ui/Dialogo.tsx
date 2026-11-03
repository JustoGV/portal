"use client"
import { useId, type ReactNode } from "react"
import { comun } from "@/i18n/es/comun"
import { BotonIcono } from "./BotonIcono"
import { useConfirmar } from "./Confirmar"
import { TarjetaModal } from "./TarjetaModal"

type Props = {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  bajada?: ReactNode
  /** Si hay cambios sin guardar, cerrar pregunta antes (docs/reglas/05 §4). */
  hayCambios?: boolean
  ancho?: string
  children: ReactNode
}

/** El formulario de alta o edición en una tarjeta centrada, detrás de un botón que dice qué hay adentro. */
export function Dialogo({ abierto, alCerrar, titulo, bajada, hayCambios, ancho, children }: Props) {
  const idTitulo = useId()
  const confirmar = useConfirmar()

  const pedirCierre = async () => {
    if (hayCambios) {
      const ok = await confirmar({ titulo: comun.descartarTitulo, texto: comun.descartarTexto, accion: comun.descartar, cancelar: comun.seguirEditando, peligro: true })
      if (!ok) return
    }
    alCerrar()
  }

  return (
    <TarjetaModal abierto={abierto} alPedirCierre={pedirCierre} idTitulo={idTitulo} ancho={ancho}>
      <div className="ui-dialogo__cabecera">
        <div>
          <h2 id={idTitulo} className="ui-dialogo__titulo">
            {titulo}
          </h2>
          {bajada && <p className="ui-dialogo__bajada">{bajada}</p>}
        </div>
        <BotonIcono icono="cerrar" etiqueta={comun.cerrar} onPress={pedirCierre} />
      </div>
      {children}
    </TarjetaModal>
  )
}
