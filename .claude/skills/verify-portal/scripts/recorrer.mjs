// Recorre rutas del portal como un usuario con sesión y deja la prueba en una carpeta fuera del repo.
// Por cada ruta y ancho: abre, espera, corre el chequeo de saltos, mide el desborde, junta errores de consola
// y saca una captura. Con --abrir <selector> además hace click en ese elemento, espera y saca otra captura,
// y con --cerrar-esc aprieta Esc y comprueba que lo abierto se fue.
//
// Uso (desde la carpeta donde está instalado playwright, ver SKILL.md «Launch»):
//   node <repo>/portal/.claude/skills/verify-portal/scripts/recorrer.mjs \
//     --cookie <carpeta>/cookie.txt --salida <carpeta>/evidencia --rutas /,/servicios \
//     [--anchos 360,375,412,1440,1920] [--abrir ".in-pila__mazo"] [--abierto ".in-pila__panel"] [--cerrar-esc]
//
// Sale con código 1 si hay saltos, desborde, errores de consola o algo que no abrió o no cerró.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import { ENLACE, revisar } from "./saltos.mjs"

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`)
  return i === -1 ? d : process.argv[i + 1]
}
const flag = (n) => process.argv.includes(`--${n}`)
const base = arg("base", "http://localhost:3000")
const cookie = JSON.parse(readFileSync(arg("cookie"), "utf8"))
const salida = arg("salida")
// Git Bash convierte "/tablero" en "C:/Program Files/Git/tablero" si no se corre con MSYS_NO_PATHCONV=1: se deshace.
const rutas = arg("rutas", "/")
  .split(",")
  .map((r) => r.replace(/^[A-Za-z]:\/.*?\/Git(?=\/|$)/, "") || "/")
  .map((r) => (r.startsWith("/") ? r : `/${r}`))
const anchos = arg("anchos", "360,375,412,1440,1920").split(",").map(Number)
const abrir = arg("abrir")
const abierto = arg("abierto")
const ALTOS = { 360: 800, 375: 812, 412: 915, 768: 1024, 1440: 900, 1920: 1080 }
mkdirSync(salida, { recursive: true })

// playwright se busca en la carpeta desde donde se corre, no en el repo (el portal no lo tiene instalado).
const { chromium } = createRequire(join(process.cwd(), "x.js"))("playwright")
const b = await chromium.launch()
const informe = []
let fallas = 0
for (const w of anchos) {
  const movil = w < 768
  const x = await b.newContext({ viewport: { width: w, height: ALTOS[w] ?? 900 }, ...(movil ? { isMobile: true, hasTouch: true } : {}) })
  await x.addCookies([{ name: cookie.nombre, value: cookie.valor, domain: new URL(base).hostname, path: "/" }])
  const p = await x.newPage()
  for (const ruta of rutas) {
    const errs = []
    const alError = (e) => errs.push(String(e).slice(0, 200))
    const alConsola = (m) => m.type() === "error" && errs.push(m.text().slice(0, 200))
    p.on("pageerror", alError)
    p.on("console", alConsola)
    const r = await p.goto(base + ruta, { waitUntil: "networkidle" })
    await p.waitForTimeout(1500)
    const nombre = (ruta.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "raiz") + `-${w}`
    const fila = { ruta, ancho: w, estado: r?.status(), url: p.url().replace(base, "") }
    if (fila.url.startsWith("/ingresar")) {
      fila.falla = "la sesión no sirve: redirigió a /ingresar"
    } else {
      fila.saltos = [...new Set(await p.evaluate(revisar, [ENLACE, "main"]))]
      fila.desborde = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      await p.screenshot({ path: join(salida, `${nombre}.png`), fullPage: !movil })
      if (abrir) {
        const el = p.locator(abrir).first()
        await el.scrollIntoViewIfNeeded()
        await el.click()
        await p.waitForTimeout(900)
        fila.abre = abierto ? await p.locator(abierto).count() > 0 : true
        await p.screenshot({ path: join(salida, `${nombre}-abierta.png`) })
        if (flag("cerrar-esc")) {
          await p.keyboard.press("Escape")
          await p.waitForTimeout(500)
          fila.cierraConEsc = abierto ? (await p.locator(abierto).count()) === 0 : true
        }
      }
    }
    fila.consola = errs
    p.off("pageerror", alError)
    p.off("console", alConsola)
    const mal = fila.falla || fila.estado >= 400 || fila.saltos?.length || fila.desborde > 0 || errs.length || fila.abre === false || fila.cierraConEsc === false
    if (mal) fallas++
    console.log(`${mal ? "FALLA" : "ok   "} ${ruta} @${w}: estado ${fila.estado} · saltos ${fila.saltos?.length ?? "-"} · desborde ${fila.desborde ?? "-"} · consola ${errs.length}${abrir ? ` · abre ${fila.abre} · Esc ${fila.cierraConEsc ?? "-"}` : ""}${fila.falla ? ` · ${fila.falla}` : ""}`)
    for (const s of fila.saltos ?? []) console.log(`      - ${s}`)
    for (const e of errs) console.log(`      ! ${e}`)
    informe.push(fila)
  }
  await x.close()
}
await b.close()
writeFileSync(join(salida, "informe.json"), JSON.stringify(informe, null, 2))
console.log(`${fallas === 0 ? "TODO OK" : `${fallas} con fallas`} · evidencia en ${salida}`)
process.exit(fallas === 0 ? 0 : 1)
