"use client"
import { useRouter } from "next/navigation"
import { useActionState, useState } from "react"
import { guardarInactividad } from "@/acciones/usuarios"
import { Boton } from "@/components/ui/Boton"
import { useResultado } from "@/components/ui/Resultado"
import { Selector } from "@/components/ui/Selector"
import { comun } from "@/i18n/es/comun"
import { usuarios as t } from "@/i18n/es/usuarios"
import { OPCIONES_INACTIVIDAD } from "@/lib/cuenta"

export function FormInactividad({ minutos }: { minutos: number | null }) {
  const router = useRouter()
  const mostrar = useResultado()
  const inicial = OPCIONES_INACTIVIDAD.find((o) => o.minutos === minutos)?.id ?? "480"
  const [valor, setValor] = useState<string>(inicial)
  const [guardado, setGuardado] = useState<string>(inicial)
  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof guardarInactividad>> | null, datos: FormData) => {
    const estado = await guardarInactividad(anterior, datos)
    if (estado.ok) {
      setGuardado(String(datos.get("inactividad")))
      mostrar({ tipo: "guardado", titulo: t.inactividadGuardada })
    } else if (estado.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    return estado
  }, null)

  return (
    <form action={accion} className="us-inactividad">
      <Selector etiqueta={t.inactividad} name="inactividad" opciones={OPCIONES_INACTIVIDAD.map((o) => ({ id: o.id, texto: o.texto }))} valor={valor} alCambiar={setValor} icono="reloj" />
      <Boton type="submit" variante="secundaria" cargando={enviando} textoCargando={comun.guardando} isDisabled={valor === guardado && !enviando}>
        {t.guardarInactividad}
      </Boton>
    </form>
  )
}
