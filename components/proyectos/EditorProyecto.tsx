"use client"
import { createContext, Suspense, use, useContext, useRef, useState, type ReactNode } from "react"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Dialogo } from "@/components/ui/Dialogo"
import { comun } from "@/i18n/es/comun"
import { proyectos as t } from "@/i18n/es/proyectos"
import type { FilaProyecto } from "@/lib/proyecto"
import type { Grupo } from "./ComboGrupo"
import { FormProyecto } from "./FormProyecto"

/** `desde`: el botón o la fila que abre la tarjeta; crece desde ahí (D-030). */
type Editor = { abrirNuevo: (desde?: Element | null) => void; abrirEdicion: (p: FilaProyecto, desde?: Element | null) => void }
const Contexto = createContext<Editor | null>(null)

export const useEditorProyecto = () => {
  const c = useContext(Contexto)
  if (!c) throw new Error("useEditorProyecto fuera de EditorProyecto")
  return c
}

/**
 * El alta y la edición viven detrás de un botón, en una tarjeta centrada (docs/reglas/02 B3.2), en tres
 * pasos y una sola columna (D-026). Lo
 * escrito se limpia al abrir la próxima vez, no al cerrar (docs/reglas/05 §4).
 */
export function EditorProyecto({ grupos, children }: { grupos: Promise<Grupo[]>; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const [proyecto, setProyecto] = useState<FilaProyecto | null>(null)
  const [apertura, setApertura] = useState(0)
  const [cambios, setCambios] = useState(false)
  const desde = useRef<Element | null>(null)

  const confirmar = useConfirmar()

  /** Cancelar pasa por la misma guardia que Escape o la ✕. */
  const cancelar = async () => {
    if (cambios && !(await confirmar({ titulo: comun.descartarTitulo, texto: comun.descartarTexto, accion: comun.descartar, cancelar: comun.seguirEditando, peligro: true }))) return
    setAbierto(false)
  }

  const abrir = (p: FilaProyecto | null, origen?: Element | null) => {
    // Sin origen dicho, el que tiene el foco: el botón que se acaba de apretar.
    desde.current = origen ?? document.activeElement
    setProyecto(p)
    setApertura((n) => n + 1)
    setCambios(false)
    setAbierto(true)
  }

  return (
    <Contexto.Provider value={{ abrirNuevo: (d) => abrir(null, d), abrirEdicion: (p, d) => abrir(p, d) }}>
      {children}
      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo={proyecto ? t.tituloEditar : t.tituloNuevo} bajada={t.bajadaForm} hayCambios={cambios} ancho="34rem" origen={() => (desde.current?.isConnected ? desde.current.getBoundingClientRect() : null)}>
        <Suspense fallback={<div className="ui-skeleton" style={{ height: "22rem" }} />}>
          <ConGrupos grupos={grupos}>
            {(lista) => (
              <FormProyecto key={apertura} proyecto={proyecto} grupos={lista} alCambiar={setCambios} alGuardar={() => setAbierto(false)} alCancelar={cancelar} alCerrar={() => setAbierto(false)} />
            )}
          </ConGrupos>
        </Suspense>
      </Dialogo>
    </Contexto.Provider>
  )
}

function ConGrupos({ grupos, children }: { grupos: Promise<Grupo[]>; children: (g: Grupo[]) => ReactNode }) {
  return children(use(grupos))
}
