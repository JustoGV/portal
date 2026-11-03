"use client"
import { useRouter } from "next/navigation"
import { useActionState, useState, type FormEvent } from "react"
import { cambiarClaveInicial } from "@/acciones/primer-ingreso"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { useResultado } from "@/components/ui/Resultado"
import { enterAvanza } from "@/components/ui/use-enter-avanza"
import { comun } from "@/i18n/es/comun"
import { primerIngreso as t } from "@/i18n/es/ingreso"
import { CONTRASENA_MAX, CONTRASENA_MIN, contrasenaValida } from "@/lib/contrasena"
import { MENSAJES_CUENTA } from "@/lib/cuenta"

/** El primer ingreso: cambiar la contraseña inicial y entrar (D-013). */
export function FlujoPrimerIngreso() {
  const router = useRouter()
  return (
    <section className="in-paso">
      <PasoClave
        alTerminar={() => {
          router.replace("/")
          router.refresh()
        }}
      />
    </section>
  )
}

function PasoClave({ alTerminar }: { alTerminar: () => void }) {
  const router = useRouter()
  const mostrar = useResultado()
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [repetida, setRepetida] = useState("")
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof cambiarClaveInicial>> | null, datos: FormData) => {
    const estado = await cambiarClaveInicial(anterior, datos)
    if (estado.ok) alTerminar()
    else if (estado.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else {
      setErrores(estado.errores ?? {})
      if (!estado.errores) mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    }
    return estado
  }, null)

  const validar = (e: FormEvent<HTMLFormElement>) => {
    const err: Record<string, string> = {}
    if (!actual) err.actual = MENSAJES_CUENTA.claveActualMal
    if (!contrasenaValida(nueva)) err.nueva = nueva.length > CONTRASENA_MAX ? MENSAJES_CUENTA.claveLarga : MENSAJES_CUENTA.claveCorta
    else if (nueva === actual) err.nueva = MENSAJES_CUENTA.claveIgual
    if (repetida !== nueva) err.repetida = MENSAJES_CUENTA.claveDistinta
    setErrores(err)
    if (Object.keys(err).length) {
      e.preventDefault()
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(err)[0]}"]`)?.focus()
    }
  }

  return (
    <>
      <p className="in-paso__bajada">{t.paso1Bajada}</p>
      <form className="in-form" action={accion} onSubmit={validar} onKeyDown={enterAvanza} noValidate>
        <Campo etiqueta={t.actual} name="actual" tipo="password" valor={actual} alCambiar={setActual} icono="candado" autoComplete="current-password" autoFocus max={CONTRASENA_MAX} error={errores.actual} obligatorio />
        <Campo
          etiqueta={t.nueva}
          name="nueva"
          tipo="password"
          valor={nueva}
          alCambiar={setNueva}
          icono="llave"
          autoComplete="new-password"
          max={CONTRASENA_MAX}
          contador="siempre"
          progreso={Math.min(1, nueva.length / CONTRASENA_MIN)}
          ok={contrasenaValida(nueva)}
          ayuda={t.nuevaAyuda}
          error={errores.nueva}
          obligatorio
        />
        <Campo
          etiqueta={t.repetir}
          name="repetida"
          tipo="password"
          valor={repetida}
          alCambiar={setRepetida}
          icono="llave"
          autoComplete="new-password"
          max={CONTRASENA_MAX}
          ok={contrasenaValida(nueva) && repetida === nueva}
          error={errores.repetida}
          obligatorio
        />
        <Boton type="submit" variante="primaria" cargando={enviando} textoCargando={comun.guardando}>
          {t.guardarClave}
        </Boton>
      </form>
    </>
  )
}
