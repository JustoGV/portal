import "server-only"
import { resolve4, resolve6, resolveMx } from "node:dns/promises"

// ¿El dominio de un mail recibe correo? (D-033). Se pregunta al DNS al guardar: primero sus registros MX y,
// si no tiene, su dirección (un dominio sin MX igual puede recibir en su propia dirección, RFC 5321 §5.1).
// Un MX vacío («0 .», RFC 7505) dice explícitamente que no recibe. Nunca más de TOPE_MS: si el DNS no
// contesta, no se inventa un "no" y se deja guardar.

const TOPE_MS = 3000

/** Dominios reservados para pruebas (RFC 2606 y 6761). Solo se aceptan fuera de producción: ahí no hay buzones reales. */
const DE_PRUEBA = /(^|\.)(example\.(com|org|net)|test)$/u

export type DominioMail = "recibe" | "no-recibe" | "sin-respuesta"

const conTope = <T>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new Error("tope")), TOPE_MS))])

const sinRegistros = (e: unknown) => {
  const code = (e as { code?: string }).code
  return code === "ENOTFOUND" || code === "ENODATA" || code === "ENONAME" || code === "NXDOMAIN"
}

export async function dominioDeMail(mail: string): Promise<DominioMail> {
  const dominio = mail.slice(mail.lastIndexOf("@") + 1).toLowerCase()
  if (process.env.NODE_ENV !== "production" && DE_PRUEBA.test(dominio)) return "recibe"
  try {
    const mx = await conTope(resolveMx(dominio))
    if (mx.length === 0) throw Object.assign(new Error("sin mx"), { code: "ENODATA" })
    return mx.every((r) => r.exchange === "" || r.exchange === ".") ? "no-recibe" : "recibe"
  } catch (e) {
    if (!sinRegistros(e)) return "sin-respuesta"
  }
  // Sin MX: vale la dirección del dominio.
  const direcciones = await Promise.allSettled([conTope(resolve4(dominio)), conTope(resolve6(dominio))])
  if (direcciones.some((r) => r.status === "fulfilled" && r.value.length > 0)) return "recibe"
  return direcciones.every((r) => r.status === "rejected" && sinRegistros(r.reason)) ? "no-recibe" : "sin-respuesta"
}
