"use client"
import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from "react"
import { comun } from "@/i18n/es/comun"
import { Boton } from "./Boton"
import { TarjetaModal } from "./TarjetaModal"

type Pedido = { titulo: string; texto: ReactNode; accion: string; peligro?: boolean; cancelar?: string }
type Confirmar = (p: Pedido) => Promise<boolean>

const Contexto = createContext<Confirmar | null>(null)

/** En vez de confirm(): un diálogo propio con el texto de lo que va a pasar (docs/reglas/05 §4). */
export const useConfirmar = () => {
  const c = useContext(Contexto)
  if (!c) throw new Error("useConfirmar fuera de ProveedorConfirmar")
  return c
}

export function ProveedorConfirmar({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [abierto, setAbierto] = useState(false)
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const idTitulo = useId()

  const confirmar = useCallback<Confirmar>((p) => {
    resolver.current?.(false)
    setPedido(p)
    setAbierto(true)
    return new Promise<boolean>((r) => {
      resolver.current = r
    })
  }, [])

  const responder = (v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setAbierto(false)
  }

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <TarjetaModal abierto={abierto} alPedirCierre={() => responder(false)} idTitulo={idTitulo} ancho="26rem" rol="alertdialog">
        {pedido && (
          <>
            <h2 id={idTitulo} className="ui-dialogo__titulo">
              {pedido.titulo}
            </h2>
            <div className="ui-dialogo__bajada">{pedido.texto}</div>
            <div className="ui-dialogo__acciones">
              <Boton variante="secundaria" onPress={() => responder(false)} autoFocus>
                {pedido.cancelar ?? comun.cancelar}
              </Boton>
              <Boton variante={pedido.peligro ? "peligro" : "primaria"} onPress={() => responder(true)}>
                {pedido.accion}
              </Boton>
            </div>
          </>
        )}
      </TarjetaModal>
    </Contexto.Provider>
  )
}
