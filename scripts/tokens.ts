// Calcula los colores de styles/tokens.css desde OKLCH y mide el contraste sobre los hex que se publican
// (docs/reglas/03 §3.3). Uso: pnpm exec tsx scripts/tokens.ts  → imprime el CSS y la tabla de contraste.
type Okl = [number, number, number]

const okToLinear = ([L, C, h]: Okl) => {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}
const enGamut = (c: number[]) => c.every((v) => v >= -1e-4 && v <= 1 + 1e-4)
/** Fuera de gamut se baja el croma, nunca se recorta canal por canal (docs/reglas/02 A §3.4). */
const aHex = (o: Okl) => {
  let [L, C, h] = o
  let lin = okToLinear([L, C, h])
  while (!enGamut(lin) && C > 0) { C -= 0.001; lin = okToLinear([L, C, h]) }
  const enc = (v: number) => {
    const x = Math.min(1, Math.max(0, v))
    return Math.round((x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055) * 255)
  }
  return "#" + lin.map(enc).map((n) => n.toString(16).padStart(2, "0")).join("")
}
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
export const contraste = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x! + 0.05) / (y! + 0.05)
}

const H = 264 // tono de la marca: azul índigo (D-014). Los neutrales se tiñen hacia él.
const n = (L: number, C = 0.008): Okl => [L, C, H]

const temas: Record<"claro" | "oscuro", Record<string, Okl>> = {
  claro: {
    lienzo: n(0.968, 0.008), capa: n(0.997, 0.002), "capa-2": n(0.978, 0.006), "capa-3": n(0.952, 0.01),
    borde: n(0.91, 0.012), "borde-2": n(0.85, 0.016), "borde-control": n(0.6, 0.02),
    "texto-1": n(0.24, 0.03), "texto-2": n(0.44, 0.025), "texto-3": n(0.51, 0.022),
    marca: n(0.49, 0.2), "marca-hover": n(0.44, 0.19), "marca-activo": n(0.4, 0.17), "marca-texto": n(0.995, 0.003),
    "marca-suave": n(0.955, 0.025), "marca-suave-2": n(0.915, 0.045), "marca-borde": n(0.62, 0.13), "marca-tinta": n(0.47, 0.19),
    foco: n(0.52, 0.2),
    ok: [0.47, 0.12, 150], "ok-bg": [0.96, 0.03, 150], "ok-borde": [0.78, 0.08, 150], "ok-solido": [0.52, 0.13, 150],
    warn: [0.48, 0.1, 70], "warn-bg": [0.965, 0.04, 85], "warn-borde": [0.8, 0.1, 80], "warn-solido": [0.78, 0.15, 80],
    danger: [0.5, 0.17, 27], "danger-bg": [0.965, 0.02, 20], "danger-borde": [0.8, 0.08, 22], "danger-solido": [0.55, 0.19, 27],
    info: [0.48, 0.13, 240], "info-bg": [0.965, 0.02, 240], "info-borde": [0.8, 0.07, 240], "info-solido": [0.52, 0.14, 240],
    // La barra lateral es azul noche en los dos temas: el marco del portal.
    "barra-fondo": n(0.235, 0.055), "barra-capa": n(0.285, 0.06), "barra-activo": n(0.35, 0.09),
    "barra-borde": n(0.33, 0.055), "barra-borde-control": n(0.56, 0.06),
    "barra-texto-1": n(0.975, 0.008), "barra-texto-2": n(0.82, 0.035), "barra-acento": n(0.8, 0.11), "barra-foco": n(0.78, 0.12),
  },
  oscuro: {
    lienzo: n(0.165, 0.012), capa: n(0.2, 0.015), "capa-2": n(0.24, 0.017), "capa-3": n(0.28, 0.019),
    borde: n(0.315, 0.019), "borde-2": n(0.38, 0.021), "borde-control": n(0.56, 0.024),
    "texto-1": n(0.96, 0.007), "texto-2": n(0.8, 0.016), "texto-3": n(0.73, 0.018),
    marca: n(0.53, 0.19), "marca-hover": n(0.5, 0.185), "marca-activo": n(0.46, 0.17), "marca-texto": n(0.995, 0.003),
    "marca-suave": n(0.26, 0.04), "marca-suave-2": n(0.31, 0.06), "marca-borde": n(0.6, 0.13), "marca-tinta": n(0.78, 0.12),
    foco: n(0.75, 0.13),
    ok: [0.8, 0.13, 150], "ok-bg": [0.26, 0.04, 150], "ok-borde": [0.45, 0.08, 150], "ok-solido": [0.72, 0.15, 150],
    warn: [0.84, 0.12, 80], "warn-bg": [0.27, 0.035, 75], "warn-borde": [0.48, 0.08, 75], "warn-solido": [0.8, 0.15, 80],
    danger: [0.78, 0.12, 25], "danger-bg": [0.27, 0.045, 25], "danger-borde": [0.48, 0.1, 25], "danger-solido": [0.68, 0.17, 25],
    info: [0.8, 0.1, 240], "info-bg": [0.27, 0.04, 240], "info-borde": [0.48, 0.08, 240], "info-solido": [0.72, 0.12, 240],
    "barra-fondo": n(0.185, 0.03), "barra-capa": n(0.235, 0.04), "barra-activo": n(0.3, 0.075),
    "barra-borde": n(0.28, 0.035), "barra-borde-control": n(0.54, 0.05),
    "barra-texto-1": n(0.975, 0.008), "barra-texto-2": n(0.8, 0.03), "barra-acento": n(0.8, 0.11), "barra-foco": n(0.78, 0.12),
  },
}

const hex: Record<string, Record<string, string>> = {}
for (const [t, vs] of Object.entries(temas)) hex[t] = Object.fromEntries(Object.entries(vs).map(([k, v]) => [k, aHex(v)]))

const niveles = ["lienzo", "capa", "capa-2", "capa-3"]
const filas: string[] = []
const fallas: string[] = []
const medir = (t: string, frente: string, fondo: string, piso: number) => {
  const c = contraste(hex[t]![frente]!, hex[t]![fondo]!)
  filas.push(`| ${t} | ${frente} | ${fondo} | ${c.toFixed(2)} | ${piso} |`)
  if (c < piso) fallas.push(`${t}: ${frente} sobre ${fondo} = ${c.toFixed(2)} < ${piso}`)
}
for (const t of Object.keys(temas)) {
  for (const f of niveles) for (const x of ["texto-1", "texto-2", "texto-3", "ok", "warn", "danger", "info"]) medir(t, x, f, 4.5)
  for (const f of niveles) medir(t, "borde-control", f, 3)
  for (const f of niveles) medir(t, "foco", f, 3)
  medir(t, "marca-texto", "marca", 4.5); medir(t, "marca-texto", "marca-hover", 4.5); medir(t, "marca-texto", "marca-activo", 4.5)
  medir(t, "marca", "capa", 3); medir(t, "marca", "lienzo", 3)
  for (const e of ["ok", "warn", "danger", "info"]) { medir(t, e, `${e}-bg`, 4.5); medir(t, "texto-1", `${e}-bg`, 4.5) }
  for (const e of ["ok", "danger", "info"]) medir(t, t === "claro" ? "capa" : "lienzo", `${e}-solido`, 4.5)
  medir(t, t === "claro" ? "texto-1" : "lienzo", "warn-solido", 4.5)
  medir(t, "texto-1", "marca-suave", 4.5); medir(t, "texto-1", "marca-suave-2", 4.5); medir(t, "texto-2", "marca-suave", 4.5)
  for (const f of [...niveles, "marca-suave", "marca-suave-2"]) medir(t, "marca-tinta", f, 4.5)
  medir(t, "marca-borde", "capa", 3)
  for (const e of ["ok", "warn", "danger", "texto-2", "texto-3"]) medir(t, e, "marca-suave", 4.5) // fila con el mouse encima
  for (const f of ["barra-fondo", "barra-capa", "barra-activo"]) {
    medir(t, "barra-texto-1", f, 4.5); medir(t, "barra-texto-2", f, 4.5); medir(t, "barra-acento", f, 3); medir(t, "barra-foco", f, 3)
  }
  medir(t, "barra-borde-control", "barra-fondo", 3); medir(t, "barra-borde-control", "barra-capa", 3)
  medir(t, "marca-texto", "barra-fondo", 4.5)
}

const css = (t: string) => Object.entries(hex[t]!).map(([k, v]) => `  --sys-${k}: ${v};`).join("\n")
if (process.argv.includes("--css")) {
  console.log("/* claro */\n" + css("claro") + "\n/* oscuro */\n" + css("oscuro"))
} else {
  console.log(filas.join("\n"))
}
if (fallas.length) { console.error("\nNO PASAN:\n" + fallas.join("\n")); process.exitCode = 1 } else console.error(`\n${filas.length} pares, todos pasan.`)
