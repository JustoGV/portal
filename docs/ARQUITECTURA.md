# ARQUITECTURA

## 1. Stack (`D-001`)

El de `CLAUDE.md` §3, sin cambios. Las versiones se eligen el día que se instalan, abriendo la página del registro (`docs/reglas/10` §9), y el veredicto queda en `docs/MEMORY.md`.

| Pieza | Elegido |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript estricto, `pnpm` |
| Estilos | Tailwind 4 + tokens propios en CSS (`@layer`) |
| Controles | `react-aria-components` |
| Movimiento | `gsap` + `@gsap/react` |
| Íconos | `@lordicon/element` + `lucide-react` + SVG propios |
| Validación | `zod` |
| Base | Postgres en Neon + Drizzle ORM con el driver `pg` por TCP, con transacciones (`D-006`) |
| Login | `better-auth` con el plugin de segundo factor (TOTP), sesiones en la base |
| Hosting | Vercel, funciones en la **misma región que la base** (`OQ-002`: propuesta São Paulo, `gru1` + `aws-sa-east-1`, a verificar el día que se crean) |
| Errores | Sentry, solo errores (`docs/reglas/09` §7) |
| Tests | Vitest; Playwright para mirar pantallas y medir |
| CI | GitHub Actions con una rama temporal de Neon por corrida |

Sin PDF ni Excel: el producto no exporta nada.

## 2. Estructura de carpetas

```
app/
  (publico)/ingresar/            login
  (publico)/primer-ingreso/      cambio de contraseña + alta del segundo factor
  (app)/layout.tsx               barra lateral; el marco no espera datos
  (app)/page.tsx                 Proyectos (la pantalla principal)
  (app)/grupos/                  Grupos
  (app)/usuarios/                Cuentas y configuración de inactividad
  api/auth/[...all]/route.ts     endpoints de better-auth
components/
  ui/                            un componente por función (docs/reglas/05)
  proyectos/  grupos/  usuarios/ piezas de cada módulo
dal/
  sesion.ts                      sesión cacheada por pedido
  guard.ts                       exigir(permiso)
  proyectos.ts grupos.ts usuarios.ts   lecturas de cada módulo (con guard)
acciones/
  proyectos.ts grupos.ts usuarios.ts   Server Actions ("use server", todas con guard)
db/
  index.ts                       cliente Drizzle (rol de la app)
  schema/                        tablas
  migrations/                    SQL generado y revisado (LF)
lib/                             reglas puras: permisos, destino, url, nombre, contraseña, formato de fechas, gsap, lordicon
i18n/es/                         textos por módulo, sin índice
styles/tokens.css                todos los tokens
public/fonts/  public/lordicon/  fuentes e íconos en el repo
scripts/crear-admin.ts           crea la primera cuenta (lo corre el dueño, nunca Claude)
tests/
.github/workflows/ci.yml
proxy.ts                         CSP con nonce por pedido y redirección optimista sin cookie (D-009)
instrumentation.ts               Sentry del servidor (solo si está SENTRY_DSN)
instrumentation-client.ts        Sentry del navegador (solo si está NEXT_PUBLIC_SENTRY_DSN), por el túnel /monitoreo
vercel.json                      región de las funciones (gru1, a confirmar en OQ-002)
scripts/migrar.ts                aplica las migraciones con DATABASE_URL_DIRECT
scripts/clave-rol-app.ts         habilita portal_app y le pone una contraseña al azar (la muestra una vez)
scripts/sembrar-prueba.ts        datos de muestra y una sesión de prueba, SOLO contra una base local
scripts/tokens.ts                calcula los colores de los tokens y mide su contraste
```

## 3. Rutas y módulos

| Ruta | Permiso | Pregunta que contesta al abrir |
|---|---|---|
| `/ingresar` | público | "¿Cómo entro?" |
| `/primer-ingreso` | sesión sin segundo factor | "¿Qué me falta para poder usar el portal?" |
| `/` Proyectos | `proyectos.ver` | "¿Dónde está el proyecto que busco?": la lista, con la búsqueda arriba |
| `/grupos` | `grupos.gestionar` | "¿Cómo están ordenados mis proyectos?" |
| `/usuarios` | `usuarios.gestionar` | "¿Quién tiene acceso y está activo?" |
| `Ctrl+K` | `proyectos.ver` | "Llevame a X ya" |

Filtros en la URL: `/?q=texto&grupo=<uuid>&estado=activos|archivados&pagina=2&por=25`.

## 4. Roles y permisos

Un rol, `admin`, guardado en la fila `usuarios.rol` (`D-002`). La matriz vive en `lib/permisos.ts` y un test la compara con esta tabla.

| Acción | `admin` |
|---|---|
| `proyectos.ver` (lista, búsqueda, `Ctrl+K`, abrir) | ✓ |
| `proyectos.editar` (alta, edición) | ✓ |
| `proyectos.archivar` (archivar y restaurar) | ✓ |
| `grupos.gestionar` (crear, renombrar, archivar) | ✓ |
| `usuarios.gestionar` (alta, desactivar, contraseña inicial nueva) | ✓ |
| `configuracion.editar` (cierre por inactividad) | ✓ |

Reglas sobre la fila:
- Nadie se desactiva a sí mismo, y nunca queda cero cuentas activas (lo frena un trigger, `docs/DATOS.md`).
- Se pueden editar los proyectos archivados, no solo los activos: el archivo no es un período cerrado.

## 5. Modelo de amenazas

| Amenaza | Prob. | Impacto | Cómo se mitiga |
|---|---|---|---|
| Alguien de afuera entra al portal y obtiene el mapa de todos los proyectos (incluidos paneles de administración) | Media | Alto | Sin registro público (`disableSignUp`); contraseña ≥ 8 (D-012); **sin segundo factor (D-013)**; límite de intentos en Postgres; mensaje genérico de error |
| Un link guardado con `javascript:` o `data:` ejecuta código al hacer click (XSS guardado) | Baja | Alto | Solo `https://`: regla en `lib/url.ts` usada por el campo y la acción, `check` en la base; el link se dibuja solo como `href` de un `<a>`, nunca como HTML |
| La página abierta toma control de la pestaña del portal (tabnabbing) o recibe la dirección del portal | Media | Bajo | `target="_blank" rel="noopener noreferrer"` en todo link de proyecto (`D-004`) |
| Fuerza bruta al login o al segundo factor | Media | Alto | 5 intentos cada 15 min por IP y por cuenta, guardados en Postgres; límite propio para el segundo factor |
| La sesión queda abierta en una máquina ajena | Baja | Medio | Cierre por inactividad (supuesto 8 h, `OQ-001`); sesiones revocables en el servidor, sin caché en la cookie |
| Cuenta desactivada que sigue entrando | Baja | Medio | El guard lee `usuarios.activo` en cada pedido |
| Credencial filtrada (base, secreto de sesión, Sentry, Neon) | Baja | Alto | Valores solo en el panel de Vercel y en los secretos de GitHub Actions; búsqueda de secretos en `.next/static` después de cada build; rotación (`docs/reglas/10` §6) |
| Un socio borra proyectos por error | Media | Medio | No hay borrado: archivar y restaurar; el rol de la app no tiene `DELETE` sobre `proyectos`; auditoría que solo acepta inserciones |
| Llamar una Server Action sin sesión | Media | Alto | Guard al principio de toda acción y toda página; test con `curl` sin sesión antes de publicar |
| Paquete comprometido | Baja | Alto | Página del registro abierta antes de instalar; lockfile con versiones exactas; `pnpm audit` en CI |

## 6. Variables de entorno (solo nombres)

Los valores se cargan en el panel de Vercel (y los de CI en los secretos de GitHub Actions). Nunca en el repo, nunca un `.env.example`.

| Nombre | Dónde | Para qué |
|---|---|---|
| `DATABASE_URL` | Vercel | Conexión de la app con el rol de permisos mínimos (`portal_app`) |
| `DATABASE_URL_DIRECT` | Vercel (solo build/migraciones) y local del dueño | Conexión del dueño de la base, para correr migraciones |
| `BETTER_AUTH_SECRET` | Vercel | Firma las sesiones y cifra los secretos del segundo factor. Rotarlo cierra todas las sesiones y obliga a reactivar el segundo factor |
| `BETTER_AUTH_URL` | Vercel (Production) | La dirección pública del portal (`.vercel.app` o el dominio, `OQ-003`). En los previews, si falta, se usa `VERCEL_URL`, que pone Vercel solo |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel | A dónde manda errores el navegador (no es secreto, pero no se escribe en el repo) |
| `SENTRY_DSN` | Vercel | A dónde manda errores el servidor |
| `SENTRY_AUTH_TOKEN` | Vercel | Subir los mapas de código al hacer el build |
| `NEON_API_KEY` | GitHub Actions | Crear y borrar la rama temporal de la base en cada corrida de CI |
| `NEON_PROJECT_ID` | GitHub Actions (variable, no secreto) | El proyecto de Neon donde se crean esas ramas |
| `NEON_RAMA_VACIA` | GitHub Actions (variable, opcional) | La rama vacía de la que copia la CI; por defecto `ci-vacia` (OQ-008) |

Las acciones del servidor responden siempre HTTP 200 (es como funciona Next): un pedido sin sesión devuelve `{ ok: false, sesion: "vencida" }`, que es el 401 de `docs/reglas/10` §3, y la pantalla manda al login. Las páginas sin cookie responden 307 al login.
