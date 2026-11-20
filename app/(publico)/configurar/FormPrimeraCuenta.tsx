"use client"
import { useRouter } from "next/navigation"
import { useActionState, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { crearPrimera } from "@/acciones/primera-cuenta"
import { CampoDuo } from "@/components/ingreso/CampoDuo"
import { Boton } from "@/components/ui/Boton"
import { useResultado } from "@/components/ui/Resultado"
import { comun } from "@/i18n/es/comun"
import { campoIngreso as c, primeraCuenta as t } from "@/i18n/es/ingreso"
import { CONTRASENA_MAX, CONTRASENA_MIN, contrasenaValida } from "@/lib/contrasena"
import { esquemaCuenta, MENSAJES_CUENTA } from "@/lib/cuenta"
import { EASE, gsap, quieto } from "@/lib/gsap"
import { NOMBRE_PERSONA_MAX } from "@/lib/nombre"

/**
 * La primera cuenta (D-015) en dos pasos (pedido de Mateo, docs/trabajo/MATEO.md §10.5): "Tus datos"
 * (nombre y email) y "Tu contraseña". Cada regla es la de lib/ que usa también la acción al guardar.
 */
export function FormPrimeraCuenta() {
  const router = useRouter()
  const mostrar = useResultado()
  const escena = useRef<HTMLDivElement>(null)
  const [paso, setPaso] = useState<1 | 2>(1)
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [clave, setClave] = useState("")
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

  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof crearPrimera>> | null, datos: FormData) => {
    const estado = await crearPrimera(anterior, datos)
    if (estado.ok) {
      router.replace("/ingresar?motivo=creada")
      router.refresh()
    } else {
      const err = estado.errores ?? {}
      setErrores(err)
      // Un error de nombre o email que solo el servidor ve (p. ej. ya existe) vuelve al primer paso.
      if (err.nombre || err.email) ir(1)
      if (!estado.errores) mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    }
    return estado
  }, null)

  const leerMayus = (e: KeyboardEvent<HTMLInputElement>) => setMayus(e.getModifierState?.("CapsLock") ?? false)

  const datosOk = () => {
    const err: Record<string, string> = {}
    const cuenta = esquemaCuenta.safeParse({ nombre, email })
    if (!cuenta.success) for (const i of cuenta.error.issues) err[String(i.path[0])] ??= i.message
    setErrores(err)
    return !Object.keys(err).length
  }

  const continuar = (e?: FormEvent) => {
    e?.preventDefault()
    if (datosOk()) ir(2)
  }

  const validar = (e: FormEvent<HTMLFormElement>) => {
    const err: Record<string, string> = {}
    if (!contrasenaValida(clave)) err.clave = clave.length > CONTRASENA_MAX ? MENSAJES_CUENTA.claveLarga : MENSAJES_CUENTA.claveCorta
    if (repetida !== clave) err.repetida = MENSAJES_CUENTA.claveDistinta
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
        <span className="esc__paso-nombre">{paso === 1 ? t.paso1 : t.paso2}</span>
        <span className="esc__paso-barra" aria-hidden="true">
          <span style={{ transform: `scaleX(${paso / 2})` }} />
        </span>
      </p>
      <div ref={escena}>
        {paso === 1 ? (
          <form key="1" className="esc__form" onSubmit={continuar} noValidate>
            <CampoDuo etiqueta={t.nombre} name="nombre" tipo="text" valor={nombre} alCambiar={setNombre} icono="persona" autoComplete="name" autoFocus max={NOMBRE_PERSONA_MAX} obligatorio mensaje={err("nombre")} alEnter={() => continuar()} />
            <CampoDuo etiqueta={t.email} name="email" tipo="email" valor={email} alCambiar={setEmail} icono="sobre" autoComplete="username" max={254} obligatorio mensaje={err("email")} alEnter={() => continuar()} />
            <Boton type="submit" variante="primaria" className="esc__boton">
              {c.continuar}
            </Boton>
          </form>
        ) : (
          <form key="2" className="esc__form" action={accion} onSubmit={validar} noValidate>
            <input type="hidden" name="nombre" value={nombre} />
            <input type="hidden" name="email" value={email} />
            <CampoDuo
              etiqueta={t.clave}
              name="clave"
              tipo="password"
              valor={clave}
              alCambiar={setClave}
              icono="llave"
              autoComplete="new-password"
              autoFocus
              max={CONTRASENA_MAX}
              progreso={Math.min(1, clave.length / CONTRASENA_MIN)}
              ok={contrasenaValida(clave)}
              obligatorio
              mayus={mayus}
              alTecla={leerMayus}
              mensaje={err("clave") ?? { texto: t.claveAyuda, tono: "ayuda" }}
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
              ok={contrasenaValida(clave) && repetida === clave}
              obligatorio
              mayus={mayus}
              alTecla={leerMayus}
              mensaje={err("repetida")}
            />
            <Boton type="submit" variante="primaria" cargando={enviando} textoCargando={t.creando} className="esc__boton">
              {t.crear}
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
