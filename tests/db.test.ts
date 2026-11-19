import { Client } from "pg"
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest"

// Las invariantes viven en Postgres (docs/reglas/11 §4). Corre contra la base de prueba (en CI, una
// rama temporal de Neon) con el rol de la app, dentro de una transacción que se deshace siempre.
const url = process.env.DATABASE_URL_DIRECT

describe.skipIf(!url)("invariantes en la base", () => {
  const c = new Client({ connectionString: url })
  let authId = ""
  let usuarioId = ""

  beforeAll(async () => {
    await c.connect()
  })
  afterAll(async () => {
    await c.end()
  })
  beforeEach(async () => {
    await c.query("begin")
    await c.query("set local role portal_app")
    authId = `prueba-${Date.now()}`
    await c.query("insert into auth_user (id, name, email, updated_at) values ($1, 'Prueba', $2, now())", [authId, `${authId}@example.com`])
    const r = await c.query("insert into usuarios (auth_user_id, nombre, email) values ($1, 'Prueba', $2) returning id", [authId, `${authId}@example.com`])
    usuarioId = r.rows[0].id
  })
  afterEach(async () => {
    await c.query("rollback")
  })

  const codigo = async (sql: string, params: unknown[] = []) => {
    await c.query("savepoint s")
    try {
      await c.query(sql, params)
      return "ok"
    } catch (e) {
      return (e as { code: string }).code
    } finally {
      await c.query("rollback to savepoint s")
    }
  }

  const proyecto = (nombre: string, link: string) => codigo("insert into proyectos (nombre, url, creado_por) values ($1, $2, $3)", [nombre, link, usuarioId])

  it("el responsable de un cliente (D-032): la base frena un mail en mayúsculas o mal escrito, un teléfono con letras y un texto vacío", async () => {
    const cliente = (col: string, valor: string) => codigo(`insert into grupos (nombre, ${col}) values ('Prueba responsable', $1)`, [valor])
    expect(await cliente("responsable_mail", "ana@sanatorio.com.ar")).toBe("ok")
    expect(await cliente("responsable_mail", "Ana@sanatorio.com.ar")).toBe("23514")
    expect(await cliente("responsable_mail", "ana@sanatorio")).toBe("23514")
    expect(await cliente("responsable_telefono", "+5493424551234")).toBe("ok")
    expect(await cliente("responsable_telefono", "(0342) 455-1234")).toBe("23514")
    expect(await cliente("responsable_dni", "30123456")).toBe("ok")
    expect(await cliente("responsable_dni", "30.123.456")).toBe("23514")
    expect(await cliente("responsable_dni", "123")).toBe("23514")
    expect(await cliente("responsable_telefono", "llamar tarde")).toBe("23514")
    expect(await cliente("responsable_nombre", "")).toBe("23514")
    expect(await cliente("responsable_cargo", " Director ")).toBe("23514")
  })

  it("el rol de la app no puede borrar proyectos, grupos, usuarios ni auditoría", async () => {
    for (const t of ["proyectos", "grupos", "usuarios", "auditoria"]) expect(await codigo(`delete from ${t}`), t).toBe("42501")
  })

  it("la auditoría solo acepta inserciones", async () => {
    expect(await codigo("insert into auditoria (usuario_id, accion, tabla) values ($1, 'prueba', 'x')", [usuarioId])).toBe("ok")
    expect(await codigo("update auditoria set accion = 'cambiada'")).toBe("42501")
  })

  it("solo guarda links https", async () => {
    expect(await proyecto("Uno", "https://uno.example.com/")).toBe("ok")
    expect(await proyecto("Dos", "javascript:alert(1)")).toBe("23514")
    expect(await proyecto("Tres", "http://tres.example.com/")).toBe("23514")
    expect(await proyecto("Cuatro", "https://cuatro example.com/")).toBe("23514")
  })

  it("el nombre no se repite sin importar mayúsculas, y el link no se repite", async () => {
    expect(await proyecto("Panel Admin", "https://a.example.com/")).toBe("ok")
    await c.query("insert into proyectos (nombre, url, creado_por) values ('Panel Admin', 'https://a.example.com/', $1)", [usuarioId])
    expect(await proyecto("panel admin", "https://b.example.com/")).toBe("23505")
    expect(await proyecto("Otro", "https://a.example.com/")).toBe("23505")
  })

  it("un nombre con espacios en los bordes no entra", async () => {
    expect(await proyecto(" Con espacios", "https://c.example.com/")).toBe("23514")
  })

  it("nunca quedan cero cuentas activas", async () => {
    // Desactiva todas las demás (en la base de prueba) y después intenta con la última.
    await c.query("update usuarios set activo = false where id <> $1 and activo", [usuarioId])
    expect(await codigo("update usuarios set activo = false where id = $1", [usuarioId])).toBe("P0001")
  })

  // El tablero (D-040).
  const tarjeta = async (lista = "tareas") => (await c.query("insert into tarjetas (lista, titulo, creado_por) values ($1, 'Prueba', $2) returning id", [lista, usuarioId])).rows[0].id as string
  const comentario = async (tarjetaId: string, respuestaA: string | null = null) =>
    (await c.query("insert into comentarios (tarjeta_id, autor_id, respuesta_a, texto) values ($1, $2, $3, 'Hola') returning id", [tarjetaId, usuarioId, respuestaA])).rows[0].id as string

  it("una tarjeta va en una de las cuatro listas, con título sin espacios en los bordes", async () => {
    expect(await codigo("insert into tarjetas (lista, titulo, creado_por) values ('dudas', 'Una duda', $1)", [usuarioId])).toBe("ok")
    expect(await codigo("insert into tarjetas (lista, titulo, creado_por) values ('otra', 'Una duda', $1)", [usuarioId])).toBe("23514")
    expect(await codigo("insert into tarjetas (lista, titulo, creado_por) values ('dudas', ' Una duda', $1)", [usuarioId])).toBe("23514")
    expect(await codigo("insert into tarjetas (lista, titulo, creado_por) values ('dudas', '', $1)", [usuarioId])).toBe("23514")
    expect(await codigo("insert into tarjetas (lista, titulo, creado_por, respuestas) values ('dudas', 'Una', $1, '{}'::jsonb)", [usuarioId])).toBe("23514")
  })

  it("solo una duda puede estar resuelta, y siempre con quién y cuándo", async () => {
    const duda = await tarjeta("dudas")
    const otra = await tarjeta("tareas")
    expect(await codigo("update tarjetas set resuelta_en = now(), resuelta_por = $2 where id = $1", [duda, usuarioId])).toBe("ok")
    expect(await codigo("update tarjetas set resuelta_en = now() where id = $1", [duda])).toBe("23514")
    expect(await codigo("update tarjetas set resuelta_en = now(), resuelta_por = $2 where id = $1", [otra, usuarioId])).toBe("23514")
  })

  it("una respuesta es de la misma tarjeta, y puede responder a otra respuesta (D-041)", async () => {
    const a = await tarjeta()
    const b = await tarjeta()
    const raiz = await comentario(a)
    const respuesta = await comentario(a, raiz)
    expect(await codigo("insert into comentarios (tarjeta_id, autor_id, respuesta_a, texto) values ($1, $2, $3, 'x')", [b, usuarioId, raiz])).toBe("23514")
    expect(await codigo("insert into comentarios (tarjeta_id, autor_id, respuesta_a, texto) values ($1, $2, $3, 'x')", [a, usuarioId, respuesta])).toBe("ok")
    expect(await codigo("insert into comentarios (tarjeta_id, autor_id, texto) values ($1, $2, ' ')", [a, usuarioId])).toBe("23514")
  })

  it("el rol de la app no borra tarjetas, y los comentarios no se editan ni se borran", async () => {
    const t = await tarjeta()
    await comentario(t)
    expect(await codigo("delete from tarjetas")).toBe("42501")
    expect(await codigo("update comentarios set texto = 'cambiado'")).toBe("42501")
    expect(await codigo("delete from comentarios")).toBe("42501")
  })

  it("la configuración es una sola fila", async () => {
    expect(await codigo("insert into configuracion (id) values (false)")).toBe("23514")
    expect(await codigo("update configuracion set inactividad_minutos = 7")).toBe("23514")
  })
})
