"use client"
import { createContext, Suspense, use, useContext, useRef, useState, type ReactNode } from "react"
import { Boton } from "@/components/ui/Boton"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Dialogo } from "@/components/ui/Dialogo"
import { comun } from "@/i18n/es/comun"
import { grupos as t } from "@/i18n/es/grupos"
import type { FilaGrupo, ServicioElegible } from "@/lib/grupo"
import { pegar } from "@/lib/texto"
import { FormGrupo } from "./FormGrupo"

/** `desde`: el botón o la carpeta que abre la tarjeta; crece desde ahí (D-030). */
type Editor = {
  abrirNuevo: (desde?: Element | null) => void
  abrirEdicion: (g: FilaGrupo, desde?: Element | null) => void
  /** El grupo recién creado: la grilla lo resalta una vez y lo olvida. */
  tomarReciente: () => string | null
}
const Contexto = createContext<Editor | null>(null)

export const useEditorGrupo = () => {
  const c = useContext(Contexto)
  if (!c) throw new Error("useEditorGrupo fuera de EditorGrupo")
  return c
}

/**
 * El alta y la edición de un grupo, en una tarjeta centrada y en tres pasos (docs/reglas/05 §4; D-026).
 * Lo escrito se limpia al abrir la próxima vez, no al cerrar.
 */
export function EditorGrupo({ servicios, children }: { servicios: Promise<ServicioElegible[]>; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const [grupo, setGrupo] = useState<FilaGrupo | null>(null)
  const [apertura, setApertura] = useState(0)
  const [cambios, setCambios] = useState(false)
  const desde = useRef<Element | null>(null)
  const reciente = useRef<string | null>(null)
  const confirmar = useConfirmar()

  /** Cancelar pasa por la misma guardia que Escape o la ✕. */
  const cancelar = async () => {
    if (cambios && !(await confirmar({ titulo: comun.descartarTitulo, texto: comun.descartarTexto, accion: comun.descartar, cancelar: comun.seguirEditando, peligro: true }))) return
    setAbierto(false)
  }

  const abrir = (g: FilaGrupo | null, origen?: Element | null) => {
    // Sin origen dicho, el que tiene el foco: el botón que se acaba de apretar.
    desde.current = origen ?? document.activeElement
    setGrupo(g)
    setApertura((n) => n + 1)
    setCambios(false)
    setAbierto(true)
  }

  return (
    <Contexto.Provider
      value={{
        abrirNuevo: (d) => abrir(null, d),
        abrirEdicion: (g, d) => abrir(g, d),
        tomarReciente: () => {
          const id = reciente.current
          reciente.current = null
          return id
        },
      }}
    >
      {children}
      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo={grupo ? t.tituloEditar : t.tituloNuevo} bajada={pegar(t.bajadaForm)} hayCambios={cambios} ancho="38rem" origen={() => (desde.current?.isConnected ? desde.current.getBoundingClientRect() : null)}>
        <Suspense fallback={<div className="ui-skeleton" style={{ height: "24rem" }} />}>
          <ConServicios servicios={servicios}>
            {(lista) => (
              <FormGrupo
                key={apertura}
                grupo={grupo}
                elegibles={lista}
                alCambiar={setCambios}
                alGuardar={(id) => {
                  if (!grupo) reciente.current = id
                  setAbierto(false)
                }}
                alCancelar={cancelar}
              />
            )}
          </ConServicios>
        </Suspense>
      </Dialogo>
    </Contexto.Provider>
  )
}

function ConServicios({ servicios, children }: { servicios: Promise<ServicioElegible[]>; children: (s: ServicioElegible[]) => ReactNode }) {
  return children(use(servicios))
}

export function BotonNuevoGrupo() {
  const { abrirNuevo } = useEditorGrupo()
  return (
    <Boton variante="primaria" icono="agregar" onPress={(e) => abrirNuevo(e.target)}>
      {t.nuevo}
    </Boton>
  )
}
