// ¿Vale la pena manejar esta instancia? Solo lee: la base local arriba, el portal respondiendo y la cookie
// de prueba abriendo sesión. Uso: node <skill>/scripts/doctor.mjs <carpeta>/cookie.txt [http://localhost:3000]
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

const [archivo, base = "http://localhost:3000"] = process.argv.slice(2)
const filas = []
const ok = (n, v, d) => filas.push(`${v ? "ok   " : "FALLA"} ${n}${d ? ` · ${d}` : ""}`)

let docker = ""
try {
  docker = execFileSync("docker", ["ps", "--filter", "name=portal-cess-pg-55442", "--format", "{{.Status}}"], { encoding: "utf8" }).trim()
} catch {
  docker = ""
}
ok("base local (portal-cess-pg-55442)", docker.startsWith("Up"), docker || "Docker apagado o contenedor parado")

let ingresar = 0
try {
  ingresar = (await fetch(`${base}/ingresar`, { redirect: "manual" })).status
} catch {}
ok(`portal en ${base}`, ingresar === 200, `GET /ingresar → ${ingresar || "sin respuesta"}`)

if (!archivo || !existsSync(archivo)) ok("cookie de prueba", false, "no existe el archivo: correr la semilla (SKILL.md «Launch» paso 4)")
else if (ingresar === 200) {
  const c = JSON.parse(readFileSync(archivo, "utf8"))
  const r = await fetch(`${base}/`, { redirect: "manual", headers: { cookie: `${c.nombre}=${c.valor}` } })
  const destino = r.headers.get("location") ?? ""
  ok("sesión de prueba", r.status === 200, r.status === 200 ? "GET / → 200" : `GET / → ${r.status} ${destino}`)
}
console.log(filas.join("\n"))
process.exit(filas.some((f) => f.startsWith("FALLA")) ? 1 : 0)
