"use client"
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { encode } from "uqr"
import { codigosNuevos, confirmarFactor, empezarFactor, quitarFactor } from "@/acciones/cuenta"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { IndicadorPasos, PanelesPasos } from "@/components/ui/Pasos"
import { useResultado } from "@/components/ui/Resultado"
import { comun } from "@/i18n/es/comun"
import { cuenta as t } from "@/i18n/es/cuenta"
import type { Resultado } from "@/lib/acciones"
import { CONTRASENA_MAX } from "@/lib/contrasena"
import { agruparSecreto, codigoFactorValido, textoCodigos } from "@/lib/cuenta"
import { authClient } from "@/lib/auth-client"
import { aceptarDigitos } from "@/lib/digitos"
import { formatDia } from "@/lib/fecha"
import { pegar } from "@/lib/texto"

// El segundo factor desde Mi cuenta (D-044): activar en tres pasos, códigos nuevos y desactivar. Las tres
// tarjetas crecen desde su botón (D-030) y piden la contraseña antes de nada (docs/reglas/10 §2.2).

type Fallo = { ok: false; mensaje: string; errores?: Record<string, string>; sesion?: "vencida" }

/** Lo que hace la tarjeta cuando el servidor dice que no: el error en el campo, o un aviso, o volver a ingresar. */
const useFallo = () => {
  const mostrar = useResultado()
  return (r: Fallo, campo: string, setError: (e: string) => void) => {
    if (r.sesion === "vencida") window.location.replace("/ingresar?motivo=expirado")
    else if (r.errores?.[campo]) setError(r.errores[campo])
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: r.mensaje })
  }
}

/** El QR dibujado en SVG desde la dirección otpauth:// (uqr, sin innerHTML). Oscuro sobre blanco: la cámara lo lee así. */
function Qr({ texto }: { texto: string }) {
  const { d, lado } = useMemo(() => {
    const q = encode(texto, { ecc: "M", border: 2 })
    let camino = ""
    q.data.forEach((fila, y) => fila.forEach((negro, x) => negro && (camino += `M${x} ${y}h1v1h-1z`)))
    return { d: camino, lado: q.size }
  }, [texto])
  return (
    <svg className="cu-qr" viewBox={`0 0 ${lado} ${lado}`} role="img" aria-label={t.qrEtiqueta} shapeRendering="crispEdges">
      <rect width={lado} height={lado} fill="#fff" />
      <path d={d} fill="#0b1220" />
    </svg>
  )
}

/** Los 10 códigos de respaldo, con copiar y descargar. Se ven una sola vez. */
function Codigos({ codigos, email }: { codigos: readonly string[]; email: string }) {
  const mostrar = useResultado()
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigos.join("\n"))
      mostrar({ tipo: "guardado", titulo: t.codigosCopiados })
    } catch {
      mostrar({ tipo: "error", titulo: t.noSeCopio })
    }
  }
  const descargar = () => {
    const url = URL.createObjectURL(new Blob([textoCodigos(codigos, email, formatDia(new Date().toISOString()))], { type: "text/plain;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "codigos-de-respaldo-portal.txt"
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="cu-codigos">
      <p className="cu-factor__texto">{pegar(t.respaldoTexto)}</p>
      <ol className="cu-codigos__lista" aria-label={t.respaldoEtiqueta}>
        {codigos.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      <div className="cu-codigos__acciones">
        <Boton variante="secundaria" icono="copiar" onPress={copiar}>
          {t.copiar}
        </Boton>
        <Boton variante="secundaria" onPress={descargar}>
          {t.descargar}
        </Boton>
      </div>
    </div>
  )
}

/** Lo que viaja a la acción: dentro de un FormData, nunca como texto suelto (Next lo anota en desarrollo). */
const formulario = (campo: string, valor: string) => {
  const f = new FormData()
  f.set(campo, valor)
  return f
}

/** El campo de la contraseña, igual en las tres tarjetas. */
function CampoClave({ valor, alCambiar, error, alSalir }: { valor: string; alCambiar: (v: string) => void; error?: string; alSalir?: () => void }) {
  return (
    <Campo
      etiqueta={t.factorClave}
      name="clave"
      tipo="password"
      valor={valor}
      alCambiar={alCambiar}
      alSalir={alSalir}
      icono="candado"
      autoComplete="current-password"
      max={CONTRASENA_MAX}
      obligatorio
      autoFocus
      ayuda={t.factorClaveAyuda}
      error={error}
    />
  )
}

type PropsActivar = {
  email: string
  alCambiar: (c: boolean) => void
  /** El factor ya quedó activo y se ven los códigos: cerrar ahora pide confirmación. */
  alActivar: (cerradas: number) => void
  alTerminar: () => void
  alCancelar: () => void
}

/**
 * «Activar» en tres pasos (Pasos, D-026): la contraseña; el QR con la clave plegada por si la cámara no
 * anda y el código de 6 números, que se verifica solo al completarlo; los 10 códigos de respaldo. Hasta
 * verificar el código el factor no queda activo: cerrar a mitad de camino no cambia nada.
 */
export function FormActivar({ email, alCambiar, alActivar, alTerminar, alCancelar }: PropsActivar) {
  const fallo = useFallo()
  const mostrar = useResultado()
  const [paso, setPaso] = useState(0)
  const [alcanzado, setAlcanzado] = useState(0)
  const [clave, setClave] = useState("")
  const [errorClave, setErrorClave] = useState<string>()
  const [datos, setDatos] = useState<{ uri: string; secreto: string; codigos: string[] } | null>(null)
  const [codigo, setCodigo] = useState("")
  const [errorCodigo, setErrorCodigo] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const formCodigo = useRef<HTMLFormElement>(null)
  const listo = useRef<HTMLDivElement>(null)
  const activo = alcanzado === 2

  // Al pasar a los códigos, el campo del código queda en un paso inerte: el foco va a «Ya los guardé».
  useEffect(() => {
    if (paso === 2) listo.current?.querySelector("button")?.focus()
  }, [paso])

  const irA = (n: number) => {
    if (activo || n > alcanzado) return
    setPaso(n)
  }

  const seguir = async (e: FormEvent) => {
    e.preventDefault()
    if (enviando) return
    if (!clave) return setErrorClave(t.factorClaveFalta)
    setEnviando(true)
    try {
      const r: Resultado<{ uri: string; secreto: string; codigos: string[] }> = await empezarFactor(formulario("clave", clave))
      if (!r.ok) return fallo(r, "clave", setErrorClave)
      setDatos(r.datos)
      setClave("")
      setCodigo("")
      setErrorCodigo(undefined)
      setAlcanzado(1)
      setPaso(1)
    } finally {
      setEnviando(false)
    }
  }

  const verificar = async (e?: FormEvent) => {
    e?.preventDefault()
    if (enviando) return
    if (!codigoFactorValido(codigo)) return setErrorCodigo(t.codigoMal)
    setEnviando(true)
    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code: codigo })
      if (error) {
        setCodigo("")
        return setErrorCodigo(error.status === 429 ? t.demasiados : t.codigoMal)
      }
      const r = await confirmarFactor()
      if (!r.ok) return fallo(r, "codigo", setErrorCodigo)
      alCambiar(false)
      alActivar(r.datos.cerradas)
      setAlcanzado(2)
      setPaso(2)
    } finally {
      setEnviando(false)
    }
  }

  const copiarClave = async () => {
    if (!datos) return
    try {
      await navigator.clipboard.writeText(datos.secreto)
      mostrar({ tipo: "guardado", titulo: t.claveCopiada })
    } catch {
      mostrar({ tipo: "error", titulo: t.noSeCopio })
    }
  }

  return (
    <div className="cu-factor">
      <IndicadorPasos pasos={t.factorPasos} actual={paso} alcanzado={alcanzado} alIr={irA} etiqueta={t.factorPasosEtiqueta} />
      <PanelesPasos actual={paso} nombres={t.factorPasos}>
        <form onSubmit={seguir} noValidate>
          <div className="ui-dialogo__campos">
            <CampoClave
              valor={clave}
              alCambiar={(v) => {
                setClave(v)
                setErrorClave(undefined)
                alCambiar(!!v)
              }}
              error={errorClave}
            />
          </div>
          <div className="ui-dialogo__acciones">
            <Boton variante="secundaria" onPress={alCancelar}>
              {comun.cancelar}
            </Boton>
            <Boton type="submit" variante="primaria" icono="tilde" cargando={enviando && paso === 0} textoCargando={t.verificando}>
              {t.seguir}
            </Boton>
          </div>
        </form>

        <form ref={formCodigo} onSubmit={verificar} noValidate>
          <div className="cu-factor__qr">
            {datos && <Qr texto={datos.uri} />}
            <div className="cu-factor__qr-textos">
              <p className="cu-factor__texto">{pegar(t.qrTexto)}</p>
              <details className="cu-factor__plegado">
                <summary>{t.sinCamara}</summary>
                <p className="cu-factor__texto">{pegar(t.sinCamaraTexto)}</p>
                <div className="cu-factor__clave">
                  <code translate="no">{datos ? agruparSecreto(datos.secreto) : ""}</code>
                  <Boton variante="sutil" icono="copiar" onPress={copiarClave}>
                    {t.copiar}
                  </Boton>
                </div>
              </details>
            </div>
          </div>
          <div className="ui-dialogo__campos">
            <Campo
              etiqueta={t.codigo}
              name="codigo"
              valor={codigo}
              alCambiar={(v) => {
                const ok = aceptarDigitos(v, codigo, 6)
                if (ok === null) return
                setCodigo(ok)
                setErrorCodigo(undefined)
                // Con los 6 números se verifica solo, como en el ingreso.
                if (ok.length === 6) window.setTimeout(() => formCodigo.current?.requestSubmit(), 0)
              }}
              icono="llave"
              inputMode="numeric"
              autoComplete="one-time-code"
              max={6}
              mono
              progreso={codigo.length / 6}
              ok={codigo.length === 6 && !errorCodigo}
              ayuda={t.codigoAyuda}
              error={errorCodigo}
            />
          </div>
          <div className="ui-dialogo__acciones">
            <Boton variante="secundaria" onPress={alCancelar}>
              {comun.cancelar}
            </Boton>
            <Boton type="submit" variante="primaria" icono="tilde" cargando={enviando && paso === 1} textoCargando={t.verificando}>
              {t.verificar}
            </Boton>
          </div>
        </form>

        <div>
          {datos && <Codigos codigos={datos.codigos} email={email} />}
          <div ref={listo} className="ui-dialogo__acciones">
            <Boton variante="primaria" icono="tilde" onPress={alTerminar}>
              {t.yaGuardados}
            </Boton>
          </div>
        </div>
      </PanelesPasos>
    </div>
  )
}

/** «Códigos nuevos»: la contraseña y, después, los 10 códigos nuevos (los anteriores ya no sirven). */
export function FormCodigos({ email, alCambiar, alCrear, alTerminar, alCancelar }: { email: string; alCambiar: (c: boolean) => void; alCrear: () => void; alTerminar: () => void; alCancelar: () => void }) {
  const fallo = useFallo()
  const [clave, setClave] = useState("")
  const [error, setError] = useState<string>()
  const [codigos, setCodigos] = useState<string[] | null>(null)
  const [enviando, setEnviando] = useState(false)
  const listo = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (codigos) listo.current?.querySelector("button")?.focus()
  }, [codigos])

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    if (enviando) return
    if (!clave) return setError(t.factorClaveFalta)
    setEnviando(true)
    try {
      const r = await codigosNuevos(formulario("clave", clave))
      if (!r.ok) return fallo(r, "clave", setError)
      alCambiar(false)
      alCrear()
      setCodigos(r.datos.codigos)
    } finally {
      setEnviando(false)
    }
  }

  if (codigos)
    return (
      <div>
        <Codigos codigos={codigos} email={email} />
        <div ref={listo} className="ui-dialogo__acciones">
          <Boton variante="primaria" icono="tilde" onPress={alTerminar}>
            {t.yaGuardados}
          </Boton>
        </div>
      </div>
    )
  return (
    <form onSubmit={crear} noValidate>
      <div className="ui-dialogo__campos">
        <CampoClave
          valor={clave}
          alCambiar={(v) => {
            setClave(v)
            setError(undefined)
            alCambiar(!!v)
          }}
          error={error}
        />
      </div>
      <div className="ui-dialogo__acciones">
        <Boton variante="secundaria" onPress={alCancelar}>
          {comun.cancelar}
        </Boton>
        <Boton type="submit" variante="primaria" icono="llave" cargando={enviando} textoCargando={t.verificando}>
          {t.crearCodigos}
        </Boton>
      </div>
    </form>
  )
}

/** «Desactivar»: con la contraseña; el botón en rojo dice lo que hace. */
export function FormQuitar({ alCambiar, alQuitar, alCancelar }: { alCambiar: (c: boolean) => void; alQuitar: () => void; alCancelar: () => void }) {
  const fallo = useFallo()
  const [clave, setClave] = useState("")
  const [error, setError] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  const quitar = async (e: FormEvent) => {
    e.preventDefault()
    if (enviando) return
    if (!clave) return setError(t.factorClaveFalta)
    setEnviando(true)
    try {
      const r = await quitarFactor(formulario("clave", clave))
      if (!r.ok) return fallo(r, "clave", setError)
      alCambiar(false)
      alQuitar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={quitar} noValidate>
      <div className="ui-dialogo__campos">
        <CampoClave
          valor={clave}
          alCambiar={(v) => {
            setClave(v)
            setError(undefined)
            alCambiar(!!v)
          }}
          error={error}
        />
      </div>
      <div className="ui-dialogo__acciones">
        <Boton variante="secundaria" onPress={alCancelar}>
          {comun.cancelar}
        </Boton>
        <Boton type="submit" variante="peligro" icono="desactivar" cargando={enviando} textoCargando={t.verificando}>
          {t.desactivar}
        </Boton>
      </div>
    </form>
  )
}
