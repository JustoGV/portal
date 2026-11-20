"use client"
import { useRouter } from "next/navigation"
import { useActionState, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { cambiarClaveInicial } from "@/acciones/primer-ingreso"
import { CampoDuo } from "@/components/ingreso/CampoDuo"
import { Boton } from "@/components/ui/Boton"
import { useResultado } from "@/components/ui/Resultado"
import { comun } from "@/i18n/es/comun"
import { campoIngreso as c, primerIngreso as t } from "@/i18n/es/ingreso"
import { CONTRASENA_MAX, CONTRASENA_MIN, contrasenaValida } from "@/lib/contrasena"
import { MENSAJES_CUENTA } from "@/lib/cuenta"
import { EASE, gsap, quieto } from "@/lib/gsap"

/**
 * El primer ingreso (D-013): cambiar la contraseña inicial y entrar. En dos pasos (docs/trabajo/MATEO.md
 * §10.5): la contraseña que te pasaron, y la nueva con su repetición.
 */
export function FlujoPrimerIngreso() {
  const router = useRouter()
  const mostrar = useResultado()
  const escena = useRef<HTMLDivElement>(null)
  const [paso, setPaso] = useState<1 | 2>(1)
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [repetida, setRepetida] = useState("")
  const [mayus, setMayus] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})

  const ir = (n: 1 | 2) => {
    setPaso(n)
    if (quieto()) return
    requestAnimationFrame(() => {
      if (escena.current) gsap.from(escena.current, { x: n === 2 ? 40 : -40, opacity: 0, duration: 0.4, ease: EASE })
    })
  }

  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof cambiarClaveInicial>> | null, datos: FormData) => {
    const estado = await cambiarClaveInicial(anterior, datos)
    if (estado.ok) {
      router.replace("/")
      router.refresh()
    } else if (estado.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else {
      const err = estado.errores ?? {}
      setErrores(err)
      if (err.actual) ir(1)
      if (!estado.errores) mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    }
    return estado
  }, null)

  const leerMayus = (e: KeyboardEvent<HTMLInputElement>) => setMayus(e.getModifierState?.("CapsLock") ?? false)

  const continuar = (e?: FormEvent) => {
    e?.preventDefault()
    if (!actual) {
      setErrores({ actual: MENSAJES_CUENTA.claveActualMal })
      return
    }
    setErrores({})
    ir(2)
  }

  const validar = (e: FormEvent<HTMLFormElement>) => {
    const err: Record<string, string> = {}
    if (!contrasenaValida(nueva)) err.nueva = nueva.length > CONTRASENA_MAX ? MENSAJES_CUENTA.claveLarga : MENSAJES_CUENTA.claveCorta
    else if (nueva === actual) err.nueva = MENSAJES_CUENTA.claveIgual
    if (repetida !== nueva) err.repetida = MENSAJES_CUENTA.claveDistinta
    setErrores(err)
    if (Object.keys(err).length) {
      e.preventDefault()
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(err)[0]}"]`)?.focus()
    }
  }

  const err = (k: string) => (errores[k] ? { texto: errores[k]!, tono: "error" as const } : undefined)

  return (
    <div className="esc__pasos">
      <p className="esc__paso-de" aria-live="polite">
        <span>{c.pasoDe(paso, 2)}</span>
        <span className="esc__paso-nombre">{paso === 1 ? t.pasoActual : t.pasoNueva}</span>
        <span className="esc__paso-barra" aria-hidden="true">
          <span style={{ transform: `scaleX(${paso / 2})` }} />
        </span>
      </p>
      <div ref={escena}>
        {paso === 1 ? (
          <form key="1" className="esc__form" onSubmit={continuar} noValidate>
            <CampoDuo
              etiqueta={t.actual}
              name="actual"
              tipo="password"
              valor={actual}
              alCambiar={setActual}
              icono="candado"
              autoComplete="current-password"
              autoFocus
              max={CONTRASENA_MAX}
              obligatorio
              mayus={mayus}
              alTecla={leerMayus}
              mensaje={err("actual")}
              alEnter={() => continuar()}
            />
            <Boton type="submit" variante="primaria" className="esc__boton">
              {c.continuar}
            </Boton>
          </form>
        ) : (
          <form key="2" className="esc__form" action={accion} onSubmit={validar} noValidate>
            <input type="hidden" name="actual" value={actual} />
            <CampoDuo
              etiqueta={t.nueva}
              name="nueva"
              tipo="password"
              valor={nueva}
              alCambiar={setNueva}
              icono="llave"
              autoComplete="new-password"
              autoFocus
              max={CONTRASENA_MAX}
              progreso={Math.min(1, nueva.length / CONTRASENA_MIN)}
              ok={contrasenaValida(nueva) && nueva !== actual}
              obligatorio
              mayus={mayus}
              alTecla={leerMayus}
              mensaje={err("nueva") ?? { texto: t.nuevaAyuda, tono: "ayuda" }}
            />
            <CampoDuo
              etiqueta={t.repetir}
              name="repetida"
              tipo="password"
              valor={repetida}
              alCambiar={setRepetida}
              icono="llave"
              autoComplete="new-password"
              max={CONTRASENA_MAX}
              ok={contrasenaValida(nueva) && repetida === nueva}
              obligatorio
              mayus={mayus}
              alTecla={leerMayus}
              mensaje={err("repetida")}
            />
            <Boton type="submit" variante="primaria" cargando={enviando} textoCargando={comun.guardando} className="esc__boton">
              {t.guardarClave}
            </Boton>
            <button type="button" className="esc__enlace" onClick={() => ir(1)}>
              {c.volver}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
