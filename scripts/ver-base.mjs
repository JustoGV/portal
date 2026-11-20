// Mira qué tiene una base SIN cambiar nada (transacción de solo lectura). No imprime la conexión.
// Uso, con DATABASE_URL_DIRECT cargada solo en esa terminal:  node scripts/ver-base.mjs
import pg from "pg"

const url = process.env.DATABASE_URL_DIRECT
if (!url) {
  console.error("Falta la variable DATABASE_URL_DIRECT en esta terminal.")
  process.exit(1)
}
const tablas = ["usuarios", "auth_user", "auth_session", "proyectos", "grupos", "tarjetas", "comentarios", "auditoria"]
const c = new pg.Client({ connectionString: url })
await c.connect()
try {
  await c.query("begin read only")
  const m = await c.query(
    "select count(*)::int n from information_schema.tables where table_schema = 'drizzle' and table_name = '__drizzle_migrations'",
  )
  if (m.rows[0].n) {
    const r = await c.query("select count(*)::int n from drizzle.__drizzle_migrations")
    console.log(`Migraciones aplicadas: ${r.rows[0].n} (el repo tiene 8: de 0000 a 0007)`)
  } else console.log("Migraciones aplicadas: ninguna")
  for (const t of tablas) {
    const e = await c.query("select to_regclass($1) is not null as hay", [`public.${t}`])
    if (!e.rows[0].hay) {
      console.log(`${t}: no existe todavía`)
      continue
    }
    const r = await c.query(`select count(*)::int n from public.${t}`)
    console.log(`${t}: ${r.rows[0].n} filas`)
  }
  const u = await c.query("select to_regclass('public.usuarios') is not null as hay")
  if (u.rows[0].hay) {
    const r = await c.query("select nombre, rol, activo from public.usuarios order by creado_en")
    for (const f of r.rows) console.log(`  cuenta: ${f.nombre} · ${f.rol} · ${f.activo ? "activa" : "desactivada"}`)
  }
  await c.query("rollback")
} finally {
  await c.end()
}
