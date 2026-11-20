"use client"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState } from "react"
import { cerrarMiSesion, cerrarMisOtrasSesiones, editarMiNombre } from "@/acciones/cuenta"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Dialogo } from "@/components/ui/Dialogo"
import { useResultado } from "@/components/ui/Resultado"
import { comun } from "@/i18n/es/comun"
import { cuenta as t } from "@/i18n/es/cuenta"
import { validarNombreCuenta, type MiCuenta } from "@/lib/cuenta"
import { gsap, quieto } from "@/lib/gsap"
import { NOMBRE_PERSONA_MAX } from "@/lib/nombre"
import { pegar } from "@/lib/texto"
import { FormClave } from "./FormClave"
import { FormActivar, FormCodigos, FormQuitar } from "./FormFactor"

// Lo que hace Mi cuenta (D-035, D-036), aparte de cómo se ve: abrir las tarjetas del nombre y la
// contraseña, cerrar sesiones y el formulario del nombre.

/** Un mail largo se parte después de la «@», nunca en medio del dominio. */
export const conCorte = (mail: string) => {
  const i = mail.indexOf("@")
  return i < 0 ? mail : (
    <>
      {mail.slice(0, i + 1)}
      <wbr />
      {mail.slice(i + 1)}
    </>
  )
}

/**
 * Lo que hace la pantalla: abrir las tarjetas del nombre y la contraseña (crecen desde su botón, D-030) y
 * cerrar sesiones (el dispositivo se achica y se va en 0,3 s antes de que llegue la lista nueva).
 */
export function useCuenta(c: MiCuenta) {
  const router = useRouter()
  const mostrar = useResultado()
  const confirmar = useConfirmar()
  // La lista de sesiones se busca al cerrar: así el hook no reparte una ref a quien dibuja.
  const lista = () => document.querySelector<HTMLUListElement>("[data-lista-sesiones]")
  const desde = useRef<Element | null>(null)
  const [modo, setModo] = useState<Modo | null>(null)
  const [apertura, setApertura] = useState(0)
  const [cambios, setCambios] = useState(false)

  // Segundo factor (D-044): si ya se ven los códigos de respaldo, cerrar pregunta si se guardaron.
  const [codigosAVista, setCodigosAVista] = useState(false)
  const activadas = useRef<number | null>(null)

  const abrir = (m: Modo) => {
    desde.current = document.activeElement
    setApertura((n) => n + 1)
    setCambios(false)
    setCodigosAVista(false)
    activadas.current = null
    setModo(m)
  }
  const cerrar = () => setModo(null)
  const terminarFactor = () => {
    const n = activadas.current
    setCodigosAVista(false)
    setModo(null)
    if (n !== null) {
      mostrar({ tipo: "guardado", titulo: t.factorActivado, texto: t.factorActivadoTexto(n) })
      router.refresh()
    }
  }
  const cerrarFactor = async () => {
    if (codigosAVista && !(await confirmar({ titulo: t.sinGuardarTitulo, texto: t.sinGuardarTexto, accion: t.yaGuardados, cancelar: t.volverAVerlos }))) return
    terminarFactor()
  }
  const cancelar = async () => {
    if (cambios && !(await confirmar({ titulo: comun.descartarTitulo, texto: comun.descartarTexto, accion: comun.descartar, cancelar: comun.seguirEditando, peligro: true }))) return
    cerrar()
  }
  const origen = () => (desde.current?.isConnected ? desde.current.getBoundingClientRect() : null)

  const plegar = (filas: Element[]) =>
    new Promise<void>((listo) => {
      if (!filas.length || quieto()) return listo()
      gsap.to(filas, { opacity: 0, scale: 0.94, y: 8, duration: 0.3, stagger: 0.05, ease: "power2.in", onComplete: listo })
    })
  const devolver = (filas: Element[]) => gsap.set(filas, { clearProps: "opacity,transform" })
  const tratar = (r: { ok: false; mensaje: string; sesion?: "vencida" }) => {
    if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: r.mensaje })
  }

  const otras = c.sesiones.filter((s) => !s.esEsta)

  const cerrarUna = async (id: string) => {
    const fila = lista()?.querySelector(`[data-sesion="${id}"]`)
    const filas = fila ? [fila] : []
    await plegar(filas)
    const r = await cerrarMiSesion(id)
    if (r.ok) {
      mostrar({ tipo: "guardado", titulo: t.cerrada, texto: t.cerradas(r.datos.cerradas) })
      router.refresh()
    } else {
      devolver(filas)
      tratar(r)
    }
  }

  const cerrarDemas = async () => {
    if (!(await confirmar({ titulo: t.demasTitulo(otras.length), texto: t.demasTexto, accion: t.cerrarDemas, peligro: true }))) return
    const filas = Array.from(lista()?.querySelectorAll("[data-sesion]:not([data-esta])") ?? [])
    await plegar(filas)
    const r = await cerrarMisOtrasSesiones()
    if (r.ok) {
      mostrar({ tipo: "guardado", titulo: t.cerradas(r.datos.cerradas) })
      router.refresh()
    } else {
      devolver(filas)
      tratar(r)
    }
  }

  const dialogos = (
    <>
      <Dialogo abierto={modo === "nombre"} alCerrar={cerrar} titulo={t.tituloNombre} bajada={pegar(t.bajadaNombre)} hayCambios={cambios} ancho="32rem" origen={origen}>
        <FormNombre key={`n${apertura}`} actual={c.nombre} alCambiar={setCambios} alGuardar={cerrar} alCancelar={cancelar} />
      </Dialogo>
      <Dialogo abierto={modo === "clave"} alCerrar={cerrar} titulo={t.claveTitulo} bajada={pegar(t.claveBajada)} hayCambios={cambios} ancho="32rem" origen={origen}>
        <FormClave key={`c${apertura}`} alCambiar={setCambios} alGuardar={cerrar} alCancelar={cancelar} />
      </Dialogo>
      <Dialogo abierto={modo === "factor"} alCerrar={cerrarFactor} titulo={pegar(t.factorTitulo)} bajada={pegar(t.factorBajada)} hayCambios={cambios} ancho="36rem" origen={origen}>
        <FormActivar
          key={`f${apertura}`}
          email={c.email}
          alCambiar={setCambios}
          alActivar={(n) => {
            activadas.current = n
            setCodigosAVista(true)
          }}
          alTerminar={terminarFactor}
          alCancelar={cancelar}
        />
      </Dialogo>
      <Dialogo abierto={modo === "codigos"} alCerrar={cerrarFactor} titulo={pegar(t.codigosTitulo)} bajada={pegar(t.codigosBajada)} hayCambios={cambios} ancho="36rem" origen={origen}>
        <FormCodigos
          key={`k${apertura}`}
          email={c.email}
          alCambiar={setCambios}
          alCrear={() => setCodigosAVista(true)}
          alTerminar={() => {
            setCodigosAVista(false)
            setModo(null)
            mostrar({ tipo: "guardado", titulo: t.codigosCreados })
          }}
          alCancelar={cancelar}
        />
      </Dialogo>
      <Dialogo abierto={modo === "quitar"} alCerrar={cerrar} titulo={pegar(t.quitarTitulo)} bajada={pegar(t.quitarBajada)} hayCambios={cambios} ancho="32rem" origen={origen}>
        <FormQuitar
          key={`q${apertura}`}
          alCambiar={setCambios}
          alQuitar={() => {
            setModo(null)
            mostrar({ tipo: "guardado", titulo: t.factorDesactivado, texto: t.factorDesactivadoTexto })
            router.refresh()
          }}
          alCancelar={cancelar}
        />
      </Dialogo>
    </>
  )

  return { abrir, dialogos, otras, cerrarUna, cerrarDemas }
}
export type Cuenta = ReturnType<typeof useCuenta>
type Modo = "nombre" | "clave" | "factor" | "codigos" | "quitar"

/** El nombre propio, en un solo paso: es un solo campo y se ve entero antes de guardar. */
function FormNombre({ actual, alCambiar, alGuardar, alCancelar }: { actual: string; alCambiar: (c: boolean) => void; alGuardar: () => void; alCancelar: () => void }) {
  const router = useRouter()
  const mostrar = useResultado()
  const [nombre, setNombre] = useState(actual)
  const [tocado, setTocado] = useState(false)
  const [delServidor, setDelServidor] = useState<string | undefined>()

  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof editarMiNombre>> | null, datos: FormData) => {
    const estado = await editarMiNombre(anterior, datos)
    if (estado.ok) {
      alCambiar(false)
      alGuardar()
      mostrar({ tipo: "guardado", titulo: t.nombreGuardado, texto: estado.datos.nombre })
      router.refresh()
    } else if (estado.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else if (estado.errores?.nombre) setDelServidor(estado.errores.nombre)
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    return estado
  }, null)

  const err = validarNombreCuenta(nombre)
  useEffect(() => alCambiar(nombre !== actual), [nombre, actual, alCambiar])

  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!err) return
        e.preventDefault()
        setTocado(true)
        e.currentTarget.querySelector<HTMLInputElement>('[name="nombre"]')?.focus()
      }}
      noValidate
    >
      <div className="ui-dialogo__campos">
        <Campo
          etiqueta={t.nombre}
          name="nombre"
          valor={nombre}
          alCambiar={(v) => {
            setNombre(v)
            setDelServidor(undefined)
          }}
          alSalir={() => setTocado(true)}
          icono="persona"
          max={NOMBRE_PERSONA_MAX}
          contador="cerca"
          autoComplete="name"
          ayuda={t.nombreAyuda}
          obligatorio
          autoFocus
          ok={!err}
          error={delServidor ?? (tocado ? (err ?? undefined) : undefined)}
        />
      </div>
      <div className="ui-dialogo__acciones">
        <Boton variante="secundaria" onPress={alCancelar}>
          {comun.cancelar}
        </Boton>
        <Boton type="submit" variante="primaria" icono="tilde" cargando={enviando} textoCargando={comun.guardando}>
          {t.guardarNombre}
        </Boton>
      </div>
    </form>
  )
}
