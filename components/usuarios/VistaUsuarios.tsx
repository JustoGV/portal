"use client"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState, type FormEvent } from "react"
import { cambiarActivo, crearCuenta, nuevaClaveInicial } from "@/acciones/usuarios"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { CajaTabla } from "@/components/ui/CajaTabla"
import { Campo } from "@/components/ui/Campo"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Dialogo } from "@/components/ui/Dialogo"
import { Etiqueta } from "@/components/ui/Etiqueta"
import { useResultado } from "@/components/ui/Resultado"
import { enterAvanza } from "@/components/ui/use-enter-avanza"
import { comun } from "@/i18n/es/comun"
import { usuarios as t } from "@/i18n/es/usuarios"
import { MENSAJES_CUENTA, normalizarEmail, type FilaUsuario } from "@/lib/cuenta"
import { formatDia } from "@/lib/fecha"
import { NOMBRE_PERSONA_MAX } from "@/lib/nombre"
import { limpiarTexto } from "@/lib/texto"

type Clave = { nombre: string; email: string; clave: string } | null

export function BotonNuevaCuenta() {
  return (
    <Boton variante="primaria" icono="agregar" onPress={() => window.dispatchEvent(new CustomEvent("usuarios:nueva"))}>
      {t.nueva}
    </Boton>
  )
}

export function VistaUsuarios({ filas }: { filas: FilaUsuario[] }) {
  const router = useRouter()
  const confirmar = useConfirmar()
  const mostrar = useResultado()
  const [alta, setAlta] = useState({ abierta: false, apertura: 0 })
  const [cambios, setCambios] = useState(false)
  const [clave, setClave] = useState<Clave>(null)

  useEffect(() => {
    const nueva = () => {
      setCambios(false)
      setAlta((a) => ({ abierta: true, apertura: a.apertura + 1 }))
    }
    window.addEventListener("usuarios:nueva", nueva)
    return () => window.removeEventListener("usuarios:nueva", nueva)
  }, [])

  const cerrarAlta = () => setAlta((a) => ({ ...a, abierta: false }))
  const cancelarAlta = async () => {
    if (cambios && !(await confirmar({ titulo: comun.descartarTitulo, texto: comun.descartarTexto, accion: comun.descartar, cancelar: comun.seguirEditando, peligro: true }))) return
    cerrarAlta()
  }

  const tratar = (r: { ok: false; mensaje: string; sesion?: "vencida" }) => {
    if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: r.mensaje })
  }

  const alternar = async (u: FilaUsuario) => {
    if (u.activo && !(await confirmar({ titulo: t.desactivarTitulo(u.nombre), texto: t.desactivarTexto, accion: t.desactivar, peligro: true }))) return
    const r = await cambiarActivo(u.id, !u.activo)
    if (r.ok) mostrar({ tipo: "guardado", titulo: u.activo ? t.desactivada_ : t.activada, texto: r.datos.nombre })
    else tratar(r)
  }

  const restablecer = async (u: FilaUsuario) => {
    if (!(await confirmar({ titulo: t.claveTitulo(u.nombre), texto: t.claveTexto, accion: t.claveAccion, peligro: true }))) return
    const r = await nuevaClaveInicial(u.id)
    if (r.ok) setClave({ nombre: r.datos.nombre, email: u.email, clave: r.datos.clave })
    else tratar(r)
  }

  return (
    <>
      <CajaTabla etiqueta={t.tabla} filas={filas.length}>
        <table className="ui-tabla">
          <caption className="sr-solo">{t.tabla}</caption>
          <thead>
            <tr>
              <th scope="col">{t.colNombre}</th>
              <th scope="col" data-prioridad="2">
                {t.colEmail}
              </th>
              <th scope="col">{t.colEstado}</th>
              <th scope="col" data-prioridad="3">
                {t.colAlta}
              </th>
              <th scope="col">
                <span className="sr-solo">{t.colAcciones}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((u, i) => (
              <tr key={u.id} style={{ "--i": i } as React.CSSProperties}>
                <td className="gr-nombre">
                  {u.nombre} {u.esYo && <span className="ui-tabla__secundario">{t.vos}</span>}
                </td>
                <td data-prioridad="2" className="ui-tabla__secundario">
                  {u.email}
                </td>
                <td>
                  <Etiqueta tono={u.activo ? "ok" : "neutro"}>{u.activo ? t.activa : t.desactivada}</Etiqueta>
                </td>
                <td data-prioridad="3" className="ui-tabla__secundario">
                  {formatDia(u.creadoEn)}
                </td>
                <td className="ui-tabla__acciones">
                  {!u.esYo && (
                    <span className="ui-tabla__fila-acciones">
                      <BotonIcono icono="llave" etiqueta={`${t.claveNueva}: ${u.nombre}`} pista={t.claveNueva} onPress={() => restablecer(u)} />
                      <BotonIcono
                        icono={u.activo ? "desactivar" : "activar"}
                        etiqueta={`${u.activo ? t.desactivar : t.activar} ${u.nombre}`}
                        pista={u.activo ? t.desactivar : t.activar}
                        peligro={u.activo}
                        onPress={() => alternar(u)}
                      />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CajaTabla>

      <Dialogo abierto={alta.abierta} alCerrar={cerrarAlta} titulo={t.tituloNueva} bajada={t.bajadaNueva} hayCambios={cambios} ancho="30rem">
        <FormCuenta
          key={alta.apertura}
          alCambiar={setCambios}
          alCancelar={cancelarAlta}
          alCrear={(c) => {
            setCambios(false)
            cerrarAlta()
            setClave(c)
          }}
        />
      </Dialogo>

      <Dialogo abierto={clave !== null} alCerrar={() => setClave(null)} titulo={t.claveListaTitulo} ancho="30rem">
        {clave && <ClaveUnaVez dato={clave} alCerrar={() => setClave(null)} />}
      </Dialogo>
    </>
  )
}

function FormCuenta({ alCambiar, alCancelar, alCrear }: { alCambiar: (c: boolean) => void; alCancelar: () => void; alCrear: (c: NonNullable<Clave>) => void }) {
  const router = useRouter()
  const mostrar = useResultado()
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof crearCuenta>> | null, datos: FormData) => {
    const estado = await crearCuenta(anterior, datos)
    if (estado.ok) alCrear(estado.datos)
    else if (estado.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else if (estado.errores) {
      setErrores(estado.errores)
      mostrar({ tipo: "dato-mal", titulo: comun.datoMalTitulo, texto: estado.mensaje })
    } else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    return estado
  }, null)
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(email))

  useEffect(() => alCambiar(nombre !== "" || email !== ""), [nombre, email, alCambiar])

  const validar = (e: FormEvent<HTMLFormElement>) => {
    const err: Record<string, string> = {}
    if (!limpiarTexto(nombre)) err.nombre = MENSAJES_CUENTA.nombreFalta
    if (!emailOk) err.email = MENSAJES_CUENTA.emailMal
    setErrores(err)
    if (Object.keys(err).length) {
      e.preventDefault()
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(err)[0]}"]`)?.focus()
    }
  }

  return (
    <form action={accion} onSubmit={validar} onKeyDown={enterAvanza} noValidate>
      <div className="ui-dialogo__campos">
        <Campo etiqueta={t.nombre} name="nombre" valor={nombre} alCambiar={setNombre} icono="persona" max={NOMBRE_PERSONA_MAX} contador="cerca" obligatorio autoFocus error={errores.nombre} />
        <Campo etiqueta={t.email} name="email" tipo="email" valor={email} alCambiar={setEmail} icono="sobre" max={254} obligatorio ok={emailOk} error={errores.email} />
      </div>
      <div className="ui-dialogo__acciones">
        <Boton variante="secundaria" onPress={alCancelar}>
          {comun.cancelar}
        </Boton>
        <Boton type="submit" variante="primaria" icono="agregar" cargando={enviando} textoCargando={t.creando}>
          {t.crear}
        </Boton>
      </div>
    </form>
  )
}

function ClaveUnaVez({ dato, alCerrar }: { dato: NonNullable<Clave>; alCerrar: () => void }) {
  const [copiada, setCopiada] = useState(false)
  return (
    <>
      <p className="ui-dialogo__bajada">{t.claveListaTexto(dato.nombre, dato.email)}</p>
      <p className="us-clave ui-mono">{dato.clave}</p>
      <div className="ui-dialogo__acciones">
        <Boton
          variante="secundaria"
          icono="copiar"
          onPress={async () => {
            await navigator.clipboard.writeText(dato.clave)
            setCopiada(true)
          }}
        >
          {copiada ? t.copiada : t.copiar}
        </Boton>
        <Boton variante="primaria" onPress={alCerrar}>
          {t.listo}
        </Boton>
      </div>
    </>
  )
}
