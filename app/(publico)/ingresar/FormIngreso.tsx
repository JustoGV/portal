"use client"
import { useRouter } from "next/navigation"
import { useRef, useState, type FormEvent } from "react"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { enterAvanza } from "@/components/ui/use-enter-avanza"
import { ingreso as t } from "@/i18n/es/ingreso"
import { authClient } from "@/lib/auth-client"
import { aceptarDigitos } from "@/lib/digitos"

type Paso = "clave" | "codigo"

export function FormIngreso({ volver }: { volver: string }) {
  const router = useRouter()
  const [paso, setPaso] = useState<Paso>("clave")
  const [email, setEmail] = useState("")
  const [clave, setClave] = useState("")
  const [codigo, setCodigo] = useState("")
  const [respaldo, setRespaldo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const formCodigo = useRef<HTMLFormElement>(null)

  const mensajeDe = (e: { status?: number } | null) => (e?.status === 429 ? t.demasiados : e?.status ? null : t.sinConexion)

  const ingresar = async (ev: FormEvent) => {
    ev.preventDefault()
    if (enviando) return
    if (!email.trim() || !clave) {
      setError(t.errorGenerico)
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const { data, error: e } = await authClient.signIn.email({ email: email.trim().toLowerCase(), password: clave })
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
      const { error: e } = respaldo
        ? await authClient.twoFactor.verifyBackupCode({ code: valor })
        : await authClient.twoFactor.verifyTotp({ code: valor })
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
      <>
        <h1 className="in-titulo">{t.codigoTitulo}</h1>
        <p className="in-bajada">{respaldo ? t.respaldoAyuda : t.codigoBajada}</p>
        <form ref={formCodigo} className="in-form" onSubmit={verificar} noValidate>
          {respaldo ? (
            <Campo key="respaldo" etiqueta={t.respaldo} name="codigo" valor={codigo} alCambiar={(v) => setCodigo(v.replace(/\s/g, ""))} max={32} icono="llave" autoFocus mono error={error ?? undefined} autoComplete="one-time-code" />
          ) : (
            <Campo
              key="totp"
              etiqueta={t.codigo}
              name="codigo"
              valor={codigo}
              alCambiar={(v) => {
                setCodigo(v)
                // Con los 6 números se verifica solo: no hace falta buscar el botón.
                if (v.length === 6) window.setTimeout(() => formCodigo.current?.requestSubmit(), 0)
              }}
              filtrar={(nuevo, actual) => aceptarDigitos(nuevo, actual, 6)}
              max={6}
              contador="siempre"
              progreso={codigo.length / 6}
              ok={codigo.length === 6 && !error}
              icono="candado"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              error={error ?? undefined}
            />
          )}
          <Boton type="submit" variante="primaria" cargando={enviando} textoCargando={t.verificando}>
            {t.verificar}
          </Boton>
        </form>
        <p className="in-pie">
          <button
            type="button"
            className="ui-enlace"
            onClick={() => {
              setRespaldo((r) => !r)
              setCodigo("")
              setError(null)
            }}
          >
            {respaldo ? t.usarApp : t.usarRespaldo}
          </button>
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="in-titulo">{t.titulo}</h1>
      <p className="in-bajada">{t.bajada}</p>
      <form className="in-form" onSubmit={ingresar} onKeyDown={enterAvanza} noValidate>
        <Campo etiqueta={t.email} name="email" tipo="email" valor={email} alCambiar={setEmail} icono="sobre" autoComplete="username" autoFocus max={254} />
        <Campo etiqueta={t.contrasena} name="password" tipo="password" valor={clave} alCambiar={setClave} icono="candado" autoComplete="current-password" max={128} error={error ?? undefined} />
        <Boton type="submit" variante="primaria" cargando={enviando} textoCargando={t.entrando}>
          {t.entrar}
        </Boton>
      </form>
      <p className="in-pie">{t.olvido}</p>
    </>
  )
}
