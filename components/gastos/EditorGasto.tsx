"use client"
import { createContext, Suspense, use, useContext, useRef, useState, type ReactNode } from "react"
import { Boton } from "@/components/ui/Boton"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Dialogo } from "@/components/ui/Dialogo"
import { comun } from "@/i18n/es/comun"
import { gastos as t } from "@/i18n/es/gastos"
import type { FilaGasto } from "@/lib/gasto"
import { FormGasto, type Pagador } from "./FormGasto"

/** `desde`: el botón o la fila que abre la tarjeta; crece desde ahí (D-030). */
type Editor = { abrirNuevo: (desde?: Element | null) => void; abrirEdicion: (g: FilaGasto, desde?: Element | null) => void }
const Contexto = createContext<Editor | null>(null)

export const useEditorGasto = () => {
  const c = useContext(Contexto)
  if (!c) throw new Error("useEditorGasto fuera de EditorGasto")
  return c
}

/** El alta y la edición de un gasto, en una tarjeta centrada y en pasos, como Servicios (D-026). */
export function EditorGasto({ pagadores, yo, children }: { pagadores: Promise<Pagador[]>; yo: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const [gasto, setGasto] = useState<FilaGasto | null>(null)
  const [apertura, setApertura] = useState(0)
  const [cambios, setCambios] = useState(false)
  const desde = useRef<Element | null>(null)
  const confirmar = useConfirmar()

  const cancelar = async () => {
    if (cambios && !(await confirmar({ titulo: comun.descartarTitulo, texto: comun.descartarTexto, accion: comun.descartar, cancelar: comun.seguirEditando, peligro: true }))) return
    setAbierto(false)
  }

  const abrir = (g: FilaGasto | null, origen?: Element | null) => {
    desde.current = origen ?? document.activeElement
    setGasto(g)
    setApertura((n) => n + 1)
    setCambios(false)
    setAbierto(true)
  }

  return (
    <Contexto.Provider value={{ abrirNuevo: (d) => abrir(null, d), abrirEdicion: (g, d) => abrir(g, d) }}>
      {children}
      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo={gasto ? t.tituloEditar : t.tituloNuevo} bajada={t.bajadaForm} hayCambios={cambios} ancho="36rem" origen={() => (desde.current?.isConnected ? desde.current.getBoundingClientRect() : null)}>
        <Suspense fallback={<div className="ui-skeleton" style={{ height: "24rem" }} />}>
          <ConPagadores pagadores={pagadores}>
            {(lista) => <FormGasto key={apertura} gasto={gasto} pagadores={lista} yo={yo} alCambiar={setCambios} alGuardar={() => setAbierto(false)} alCancelar={cancelar} />}
          </ConPagadores>
        </Suspense>
      </Dialogo>
    </Contexto.Provider>
  )
}

function ConPagadores({ pagadores, children }: { pagadores: Promise<Pagador[]>; children: (p: Pagador[]) => ReactNode }) {
  return children(use(pagadores))
}

export function BotonNuevoGasto() {
  const { abrirNuevo } = useEditorGasto()
  return (
    <Boton variante="primaria" icono="agregar" onPress={(e) => abrirNuevo(e.target)}>
      {t.nuevo}
    </Boton>
  )
}
