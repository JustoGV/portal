# ROADMAP

> **Estado al 2026-10-13:** el socio pidió construir todo de una vez. WU-01 a WU-04 están **construidas y verificadas en local** (Postgres de prueba en Docker, build de producción, Chromium headless). Lo que falta de cada una depende de las cuentas (OQ-002) y está marcado como **Pendiente**. WU-05 está a medias: Sentry y Speed Insights cableados; la medición y la lista de publicación, sin hacer.

Unidades en orden. Cada una termina con `typecheck`, `lint` y `test` en verde, la pantalla mirada a 375, 1440 y 1920 con la consola limpia (`docs/reglas/12`), una entrada en `docs/WORKLOG.md` y lo decidido en `docs/MEMORY.md`.

## WU-01 · La base

**Objetivo:** un portal vacío pero real: se instala, se entra con email, contraseña y segundo factor, el guard protege todo, la base tiene sus roles y la CI corre contra una base temporal.

**Antes de empezar:** aprobados estos documentos; `OQ-001` y `OQ-002` contestadas (o aceptado el supuesto); la página del registro abierta para cada paquete, con el veredicto en `docs/MEMORY.md`.

**Archivos:**

| Archivo | Qué hace |
|---|---|
| `.gitignore` | Deja afuera `node_modules`, `.next`, `.env*` |
| `.gitattributes` | `*.sql text eol=lf` (y LF para todo el texto) |
| `package.json`, `pnpm-lock.yaml` | Dependencias con versiones exactas; scripts `dev`, `build`, `typecheck`, `lint`, `test`, `db:generate`, `db:migrate` |
| `tsconfig.json` | TypeScript estricto |
| `next.config.ts` | Headers de seguridad (`docs/reglas/10` §5), región de las funciones |
| `proxy.ts` | CSP con nonce por pedido y `strict-dynamic` |
| `eslint.config.mjs`, `postcss.config.mjs` | Lint y Tailwind 4 |
| `vitest.config.ts` | Tests sin `passWithNoTests`, `fileParallelism: false` |
| `drizzle.config.ts` | Usa `DATABASE_URL_DIRECT`; una URL de mentira si falta, para poder generar |
| `styles/tokens.css` | Todos los tokens `--sys-*` en los dos temas, con neutrales |
| `app/globals.css` | La línea `@layer` primero, después Tailwind, los tokens y la base |
| `app/layout.tsx` | Fuente del repo con `preload`, tema, idioma `es-AR` |
| `public/fonts/…` | La familia elegida (`OQ-004`) |
| `lib/auth.ts` | better-auth: sin registro público, contraseña ≥ 8 (D-012), segundo factor, límite de intentos en la base, cookie con prefijo propio, sin caché de sesión |
| `lib/auth-client.ts` | Cliente de better-auth para el login y el alta del segundo factor |
| `app/api/auth/[...all]/route.ts` | Los endpoints de better-auth |
| `dal/sesion.ts` | `sesion()` y `usuarioPorAuthId()` con `cache()` de React |
| `dal/guard.ts` | `exigir(permiso)`: sesión, fila, activo, segundo factor, permiso |
| `lib/permisos.ts` | La matriz rol × acción y `tienePermiso()` (pura) |
| `lib/destino.ts` | `destinoSeguro()` para `?volver=` |
| `lib/contrasena.ts` | La regla de la contraseña (≥ 8, D-012), compartida entre campo y acción |
| `lib/fecha.ts` | Formato de fechas en la zona del proyecto |
| `db/index.ts` | Cliente Drizzle por HTTP con el rol de la app |
| `db/schema/auth.ts` | Tablas de better-auth (generadas por su CLI, revisadas) |
| `db/schema/usuarios.ts`, `configuracion.ts`, `auditoria.ts`, `limites.ts`, `index.ts` | Las tablas de base de `docs/DATOS.md` |
| `db/migrations/0000_roles.sql` | Crea `portal_app` con sus permisos mínimos |
| `db/migrations/0001_…sql` | Tablas, únicos, checks, el trigger de "al menos una cuenta activa" |
| `scripts/crear-admin.ts` | Crea una cuenta con una contraseña inicial al azar que se muestra **una vez en la terminal de quien lo corre**. Lo corre el dueño, nunca Claude |
| `app/(publico)/ingresar/page.tsx` + `form-ingreso.tsx` | Login con mensaje genérico y `?motivo=expirado` |
| `app/(publico)/primer-ingreso/page.tsx` + piezas | Cambiar la contraseña inicial; QR del segundo factor (con la dirección plegada para copiar); diez códigos de respaldo |
| `app/(app)/layout.tsx` | Barra lateral provisoria (la definitiva en `WU-02`), sin esperar datos |
| `app/(app)/page.tsx` | Inicio protegido con el guard y un vacío ("Todavía no hay proyectos") |
| `i18n/es/ingreso.ts` | Textos de las pantallas de ingreso |
| `tests/destino.test.ts` | Los cuatro casos de `?volver=` maliciosos y los buenos |
| `tests/permisos.test.ts` | La matriz del código contra la de `docs/ARQUITECTURA.md` |
| `tests/guard.test.ts` | Sin sesión → 401; inactivo → 401; sin segundo factor → 403; contra la base temporal |
| `tests/db.test.ts` | El rol de la app no puede borrar `usuarios` ni editar `auditoria`; el trigger frena dejar cero activos |
| `tests/ci.test.ts` | Falla si `CI=true` y falta la base (sin verdes silenciosos) |
| `.github/workflows/ci.yml` | `pnpm install --frozen-lockfile`, `pnpm audit`, typecheck, lint, crear rama de Neon, migrar, test, borrar la rama |

**Reglas:** `10` (todo), `11` §1, §5, §6, `03` §1–§3, `09` §2 (1–2), `12`.

**Pendiente:** CI verde con la rama temporal de Neon (falta la cuenta, OQ-002/OQ-008) y el preview de Vercel. Hecho en local: migraciones, roles, guard, login con límites, segundo factor de punta a punta, headers, búsqueda de secretos.

**Terminado cuando:** CI verde con la base temporal; en el preview de Vercel se entra con una cuenta de prueba creada por el script, se activa el segundo factor y se llega al inicio; una ruta protegida sin sesión redirige a `/ingresar`; los headers están (`curl -I`); la búsqueda de secretos en `.next/static` da cero; tokens medidos en los dos temas.

## WU-02 · Componentes y barra lateral

**Objetivo:** las piezas de `components/ui/` que usan Proyectos, Grupos y Usuarios, construidas una vez.

**Archivos:** `components/ui/` (`Boton`, `BotonIcono`, `Pista`, `Campo`, `Combobox`, `Switch`, `Dialogo` en variante tarjeta, `useConfirmar`, `Resultado`, `Etiqueta`, `Tabla`, `Paginacion`, `Filtros`, `Vacio`, `Skeleton`, `BarraLateral`), `lib/gsap.ts`, `lib/lordicon.ts`, `lib/use-enter-avanza.ts`, `public/lordicon/…`, `app/(app)/layout.tsx`.

**Reglas:** `02` B2–B5, `04`, `05`, `08`. Ronda de referencias para la barra lateral, la tabla y la tarjeta de formulario.

**Pendiente:** la ronda de 5 a 7 referencias reales por componente (`docs/reglas/02` B8) no se hizo: los componentes siguen los valores elegidos en el proyecto anterior que traen las reglas (botón líquido, etiqueta flotante, tooltip, tarjeta de resultado). No hay página de prueba de componentes: se miraron dentro de las pantallas reales.

**Terminado cuando:** cada componente con sus siete estados, mirado en una página de prueba (que no se publica), con contraste y fluidez medidos.

## WU-03 · Proyectos y grupos

**Objetivo:** el corazón del portal.

**Archivos:** `db/schema/proyectos.ts`, `db/schema/grupos.ts`, su migración (con `pg_trgm`), `lib/url.ts`, `lib/nombre.ts`, `dal/proyectos.ts`, `dal/grupos.ts`, `acciones/proyectos.ts`, `acciones/grupos.ts`, `app/(app)/page.tsx`, `app/(app)/grupos/page.tsx`, `components/proyectos/…`, `components/grupos/…`, `components/ui/BusquedaRapida` (`Ctrl+K`), `i18n/es/proyectos.ts`, `i18n/es/grupos.ts`, tests de `lib/url.ts`, de duplicados y de archivar.

**Reglas:** `06` (§1, §7, §14), `07`, `09`, `10` §3–§4, `11` §4.

**Terminado cuando:** con datos de muestra se busca, se filtra, se pagina, se da de alta (con aviso en vivo de duplicado), se edita, se archiva, se restaura y se abre un link en otra pestaña; `Ctrl+K` lleva a un proyecto con dos teclas; un link `javascript:` lo rechazan el campo, la acción y la base.

**Hecho y mirado en local:** alta con aviso de repetido en vivo, edición, grupo nuevo desde el formulario, archivar y restaurar, filtros, paginación, búsqueda, `Ctrl+K`. **Pendiente:** `EXPLAIN` contra Neon con volumen real.

## WU-04 · Usuarios y cierre por inactividad

**Archivos:** `dal/usuarios.ts`, `acciones/usuarios.ts`, `app/(app)/usuarios/page.tsx`, `components/usuarios/…`, `lib/inactividad.ts` (el vigilante del cliente), `i18n/es/usuarios.ts`, tests.

**Terminado cuando:** se da de alta la cuenta del otro socio con una contraseña inicial; desactivar corta el acceso en el próximo pedido; no se puede dejar cero cuentas activas; el cierre por inactividad funciona en dos pestañas.

**Hecho y mirado en local:** alta de cuenta con la contraseña mostrada una vez, desactivar, contraseña inicial nueva, selector de inactividad. **Pendiente:** probar el cierre por inactividad con dos pestañas abiertas (solo se probó que el código corre sin errores).

## WU-05 · Publicación

**Archivos:** configuración de Sentry (`instrumentation.ts`, `sentry.*.config.ts` con `beforeSend`), Speed Insights, ajustes que salgan de medir.

**Terminado cuando:** la lista de `docs/reglas/10` §8 completa (incluida una restauración de prueba del backup, con fecha); LCP, INP y CLS medidos en el preview dentro de las metas; datos de muestra borrados con el ok del dueño.
