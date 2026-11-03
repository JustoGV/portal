// 8 y no 15 (docs/reglas/10 §2.1): lo pidió el socio, D-012. El segundo factor sigue siendo obligatorio.
export const CONTRASENA_MIN = 8
export const CONTRASENA_MAX = 128

export const contrasenaValida = (c: string) => c.length >= CONTRASENA_MIN && c.length <= CONTRASENA_MAX

/** Una contraseña inicial al azar: 20 caracteres sin los que se confunden (0/O, 1/l/I). */
export const contrasenaInicial = () => {
  const letras = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = crypto.getRandomValues(new Uint32Array(20))
  return Array.from(bytes, (b) => letras[b % letras.length]).join("")
}
