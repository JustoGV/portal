import { Suspense, type ReactNode } from "react"
import { BarraLateral } from "@/components/ui/BarraLateral"
import { BusquedaRapida } from "@/components/ui/BusquedaRapida"
import { Inactividad } from "@/components/ui/Inactividad"
import { Proveedores } from "@/components/ui/Proveedores"
import { leerConfiguracion } from "@/dal/configuracion"
import { exigir } from "@/dal/guard"
import "@/styles/barra.css"

/**
 * El marco no espera datos (docs/reglas/09 §2.2): la barra se dibuja ya; el nombre del usuario y el
 * vigilante de inactividad van en su propio Suspense. El layout NO protege las páginas: cada página
 * tiene su guard (docs/reglas/10 §3).
 */
export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <Proveedores>
      <BarraLateral
        usuario={
          <Suspense fallback={<span className="ui-skeleton" style={{ width: "7rem", height: "1rem" }} />}>
            <NombreUsuario />
          </Suspense>
        }
      >
        {children}
      </BarraLateral>
      <BusquedaRapida />
      <Suspense fallback={null}>
        <Vigilante />
      </Suspense>
    </Proveedores>
  )
}

async function NombreUsuario() {
  try {
    const { usuario } = await exigir("proyectos.ver")
    return usuario.nombre
  } catch {
    return null
  }
}

async function Vigilante() {
  let datos: { minutos: number | null; inicio: number }
  try {
    const { sesion } = await exigir("proyectos.ver")
    const { inactividadMinutos } = await leerConfiguracion()
    datos = { minutos: inactividadMinutos, inicio: new Date(sesion.session.createdAt).getTime() }
  } catch {
    return null
  }
  return <Inactividad minutos={datos.minutos} inicioSesion={datos.inicio} />
}
