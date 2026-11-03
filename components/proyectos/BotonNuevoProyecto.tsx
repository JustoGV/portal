"use client"
import { Boton } from "@/components/ui/Boton"
import { proyectos as t } from "@/i18n/es/proyectos"
import { useEditorProyecto } from "./EditorProyecto"

export function BotonNuevoProyecto() {
  const { abrirNuevo } = useEditorProyecto()
  return (
    <Boton variante="primaria" icono="agregar" onPress={abrirNuevo}>
      {t.nuevo}
    </Boton>
  )
}
