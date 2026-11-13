"use client"
import { useRouter } from "next/navigation"
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { z } from "zod"
import { IconoDuo, type IconoDuoApi } from "@/components/iconos/IconoDuo"
import { CampoDuo } from "@/components/ingreso/CampoDuo"
import { Boton } from "@/components/ui/Boton"
import { campoIngreso as c, ingreso as t } from "@/i18n/es/ingreso"
import { authClient } from "@/lib/auth-client"
import { MENSAJES_CUENTA, normalizarEmail } from "@/lib/cuenta"
import { aceptarDigitos } from "@/lib/digitos"

type Paso = "clave" | "codigo"
const esEmail = z.email()

/**
 * Email y contraseña (WU-06 · Ingreso, variante Escenario). El email se valida mientras se escribe con la
 * misma regla que el servidor (`z.email()` sobre el email normalizado, lib/cuenta); el rojo espera a que
 * salgas del campo (docs/reglas/06 §1.5). Si la cuenta tiene segundo factor, sigue el paso del código.
 */
export function FormIngreso({ volver }: { volver: string }) {
  const router = useRouter()
  const flecha = useRef<IconoDuoApi>(null)
  const formCodigo = useRef<HTMLFormElement>(null)
  const [paso, setPaso] = useState<Paso>("clave")
  const [email, setEmail] = useState("")
  const [clave, setClave] = useState("")
  const [salioEmail, setSalioEmail] = useState(false)
  const [mayus, setMayus] = useState(false)
  const [codigo, setCodigo] = useState("")
  const [respaldo, setRespaldo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const normal = normalizarEmail(email)
  const emailValido = esEmail.safeParse(normal).success
  const estadoEmail = !normal ? "vacio" : emailValido ? "ok" : salioEmail ? "mal" : "escribiendo"
  const leerMayus = (e: KeyboardEvent<HTMLInputElement>) => setMayus(e.getModifierState?.("CapsLock") ?? false)
  const mensajeDe = (e: { status?: number } | null) => (e?.status === 429 ? t.demasiados : e?.status ? null : t.sinConexion)

  const ingresar = async (ev: FormEvent) => {
    ev.preventDefault()
    if (enviando) return
    if (!emailValido) {
      setSalioEmail(true)
      ev.currentTarget.querySelector<HTMLInputElement>('[name="email"]')?.focus()
      return
    }
    if (!clave) {
      setError(c.claveFalta)
      ev.currentTarget.querySelector<HTMLInputElement>('[name="password"]')?.focus()
      return
    }
    flecha.current?.animar()
    setEnviando(true)
    setError(null)
    try {
      const { data, error: e } = await authClient.signIn.email({ email: normal, password: clave })
      if (e) {
        setError(mensajeDe(e) ?? t.errorGenerico)
        return
      }
      if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
        setPaso("codigo")
        setClave("")
        return
      }
      router.replace(volver)
      router.refresh()
    } catch {
      setError(t.sinConexion)
    } finally {
      setEnviando(false)
    }
  }

  const verificar = async (ev?: FormEvent) => {
    ev?.preventDefault()
    if (enviando) return
    const valor = codigo.trim()
    if ((!respaldo && valor.length !== 6) || (respaldo && valor.length < 6)) {
      setError(t.codigoMal)
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const { error: e } = respaldo ? await authClient.twoFactor.verifyBackupCode({ code: valor }) : await authClient.twoFactor.verifyTotp({ code: valor })
      if (e) {
        setError(mensajeDe(e) ?? t.codigoMal)
        setCodigo("")
        return
      }
      router.replace(volver)
      router.refresh()
    } catch {
      setError(t.sinConexion)
    } finally {
      setEnviando(false)
    }
  }

  if (paso === "codigo") {
    return (
      <form ref={formCodigo} className="esc__form" onSubmit={verificar} noValidate>
        <p className="esc__ayuda">{respaldo ? t.respaldoAyuda : t.codigoBajada}</p>
        <CampoDuo
          key={respaldo ? "respaldo" : "totp"}
          etiqueta={respaldo ? t.respaldo : t.codigo}
          name="codigo"
          tipo="text"
          valor={codigo}
          alCambiar={(v) => {
            if (respaldo) return setCodigo(v.replace(/\s/g, "").slice(0, 32))
            const ok = aceptarDigitos(v, codigo, 6)
            if (ok === null) return
            setCodigo(ok)
            // Con los 6 números se verifica solo: no hace falta buscar el botón.
            if (ok.length === 6) window.setTimeout(() => formCodigo.current?.requestSubmit(), 0)
          }}
          max={respaldo ? 32 : 6}
          inputMode={respaldo ? "text" : "numeric"}
          icono="llave"
          autoComplete="one-time-code"
          autoFocus
          progreso={respaldo ? undefined : codigo.length / 6}
          ok={!respaldo && codigo.length === 6 && !error}
          mensaje={error ? { texto: error, tono: "error" } : undefined}
        />
        <Boton type="submit" variante="primaria" cargando={enviando} textoCargando={t.verificando} className="esc__boton">
          {t.verificar}
        </Boton>
        <button
          type="button"
          className="esc__enlace"
          onClick={() => {
            setRespaldo((r) => !r)
            setCodigo("")
            setError(null)
          }}
        >
          {respaldo ? t.usarApp : t.usarRespaldo}
        </button>
      </form>
    )
  }

  return (
    <form className="esc__form" onSubmit={ingresar} noValidate>
      <CampoDuo
        etiqueta={t.email}
        name="email"
        tipo="email"
        valor={email}
        alCambiar={(v) => {
          setEmail(v)
          setError(null)
        }}
        icono="sobre"
        autoComplete="username"
        autoFocus
        max={254}
        ok={estadoEmail === "ok"}
        mensaje={
          estadoEmail === "vacio"
            ? undefined
            : estadoEmail === "ok"
              ? { texto: c.emailOk, tono: "ok" }
              : estadoEmail === "mal"
                ? { texto: MENSAJES_CUENTA.emailMal, tono: "error" }
                : { texto: c.emailFalta, tono: "ayuda" }
        }
        alSalir={() => setSalioEmail(true)}
      />
      <CampoDuo
        etiqueta={t.contrasena}
        name="password"
        tipo="password"
        valor={clave}
        alCambiar={(v) => {
          setClave(v)
          setError(null)
        }}
        icono="candado"
        autoComplete="current-password"
        max={128}
        mayus={mayus}
        alTecla={leerMayus}
        mensaje={error ? { texto: error, tono: "error" } : undefined}
      />
      <Boton type="submit" variante="primaria" cargando={enviando} textoCargando={t.entrando} className="esc__boton">
        <span className="esc__boton-txt">
          {t.entrar}
          <IconoDuo ref={flecha} nombre="flecha" tamano={20} />
        </span>
      </Boton>
    </form>
  )
}
