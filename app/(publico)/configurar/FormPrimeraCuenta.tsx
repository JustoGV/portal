"use client"
import { useRouter } from "next/navigation"
import { useActionState, useState, type FormEvent } from "react"
import { crearPrimera } from "@/acciones/primera-cuenta"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { useResultado } from "@/components/ui/Resultado"
import { enterAvanza } from "@/components/ui/use-enter-avanza"
import { comun } from "@/i18n/es/comun"
import { primeraCuenta as t } from "@/i18n/es/ingreso"
import { CONTRASENA_MAX, CONTRASENA_MIN, contrasenaValida } from "@/lib/contrasena"
import { esquemaCuenta, MENSAJES_CUENTA } from "@/lib/cuenta"
import { NOMBRE_PERSONA_MAX } from "@/lib/nombre"

/** Nombre, email y contraseña propia de la primera cuenta (D-015). */
export function FormPrimeraCuenta() {
  const router = useRouter()
  const mostrar = useResultado()
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [clave, setClave] = useState("")
  const [repetida, setRepetida] = useState("")
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof crearPrimera>> | null, datos: FormData) => {
    const estado = await crearPrimera(anterior, datos)
    if (estado.ok) {
      router.replace("/ingresar?motivo=creada")
      router.refresh()
    } else {
      setErrores(estado.errores ?? {})
      if (!estado.errores) mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    }
    return estado
  }, null)

  const validar = (e: FormEvent<HTMLFormElement>) => {
    const err: Record<string, string> = {}
    const cuenta = esquemaCuenta.safeParse({ nombre, email })
    if (!cuenta.success) for (const i of cuenta.error.issues) err[String(i.path[0])] ??= i.message
    if (!contrasenaValida(clave)) err.clave = clave.length > CONTRASENA_MAX ? MENSAJES_CUENTA.claveLarga : MENSAJES_CUENTA.claveCorta
    if (repetida !== clave) err.repetida = MENSAJES_CUENTA.claveDistinta
    setErrores(err)
    if (Object.keys(err).length) {
      e.preventDefault()
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(err)[0]}"]`)?.focus()
    }
  }

  return (
    <form className="in-form" action={accion} onSubmit={validar} onKeyDown={enterAvanza} noValidate>
      <Campo etiqueta={t.nombre} name="nombre" valor={nombre} alCambiar={setNombre} icono="persona" autoComplete="name" autoFocus max={NOMBRE_PERSONA_MAX} contador="cerca" error={errores.nombre} obligatorio />
      <Campo etiqueta={t.email} name="email" tipo="email" valor={email} alCambiar={setEmail} icono="sobre" autoComplete="username" max={254} error={errores.email} obligatorio />
      <Campo
        etiqueta={t.clave}
        name="clave"
        tipo="password"
        valor={clave}
        alCambiar={setClave}
        icono="llave"
        autoComplete="new-password"
        max={CONTRASENA_MAX}
        contador="siempre"
        progreso={Math.min(1, clave.length / CONTRASENA_MIN)}
        ok={contrasenaValida(clave)}
        ayuda={t.claveAyuda}
        error={errores.clave}
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
        ok={contrasenaValida(clave) && repetida === clave}
        error={errores.repetida}
        obligatorio
      />
      <Boton type="submit" variante="primaria" cargando={enviando} textoCargando={t.creando}>
        {t.crear}
      </Boton>
    </form>
  )
}
