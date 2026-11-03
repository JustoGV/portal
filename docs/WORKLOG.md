# WORKLOG

Dos secciones. **§1 ESTADO** se sobrescribe completa cada vez que se cierra una sesión o una tarea. **§2 REGISTRO** solo se agrega, nunca se borra. Formato y reglas: `docs/reglas/01-FORMA-DE-TRABAJO.md` §3.

## 1. ESTADO

| Campo | Valor |
|---|---|
| Tarea actual | **Sistema construido (WU-01 a WU-04), verificado en local, sin publicar.** Portal interno con la lista de proyectos de los socios. |
| Estado real | App completa: login con segundo factor, primer ingreso, Proyectos (lista, búsqueda, filtros, paginación, alta/edición con aviso de repetido, archivar/restaurar), `Ctrl+K`, Grupos, Usuarios (cuentas, contraseña inicial, inactividad). `typecheck`, `lint` y 73 tests en verde contra Postgres 17 local. Mirada a 375, 1440 y 1920, tema claro y oscuro, consola limpia. **Sin git, sin cuentas, sin despliegue.** |
| Último chat | 2026-11-03 · rediseño de color, azul índigo (socio, D-014). |
| Qué espera de Mateo | Nada bloqueante. Si quiere, revisar el diseño con su método (`/seccion-premium`): no se hizo la ronda de referencias (ROADMAP WU-02). |
| Qué espera del socio | Contestar OQ-001 (se construyó con segundo factor obligatorio y 8 h) y OQ-002 (cuentas). Después, seguir `docs/PUESTA-EN-MARCHA.md`. Cuando quiera: OQ-003 a OQ-008. Decir cuándo inicializar git. |
| Qué espera de terceros | — |
| Próxima acción | Con las cuentas: git + primer commit, CI con rama de Neon, preview en Vercel, medir velocidad, lista de `docs/reglas/10` §8 (WU-05). |
| Qué no se toca | Las reglas de `docs/reglas/` sin un `D-` que diga por qué. `docs/reglas/02-CRITERIO-DASHBOARD.md` Parte A. Las migraciones 0000–0002 una vez que corran en producción. |

## 2. REGISTRO

### 2026-10-13 · Preparación del repo · Mateo
- **Pedido:** dejar armadas, para un proyecto nuevo, las reglas de diseño, íconos, rendimiento, seguridad del login y del sistema, paginación, filtros, movimiento y GSAP, formularios (DNI, teléfono, duplicados) y reglas estrictas de dashboard, sin el contenido del proyecto anterior; más un prompt de inicialización para el socio. Su método de trabajo (cerrar, retomar) anotado pero sin imponérselo al socio.
- **Hecho:** `CLAUDE.md`, `docs/reglas/00`–`12`, `docs/trabajo/MATEO.md`, este registro y `docs/MEMORY.md` vacíos con su forma, las skills en `.claude/skills/` (retomar, cerrar y seccion-premium solo a mano), `PROMPT-INICIO.md`.
- **Sigue:** el arranque con `PROMPT-INICIO.md`.

### 2026-10-13 · Arranque del proyecto · socio
- **Pedido:** "un portal donde básicamente es interno que me sirva para poder ponerle nombres a los proyectos que tenga y pegar el link de otros proyectos así me redirige". Usuarios: él y Mateo. Campos: la propuesta de Claude. Abrir: en pestaña nueva.
- **Hecho:** entrevista (dos tandas; la segunda contestada en 1 a 3) y los documentos del proyecto.
- **Archivos:** creados `docs/BRIEF.md`, `docs/ARQUITECTURA.md`, `docs/DATOS.md`, `docs/DISENO.md`, `docs/ROADMAP.md`; actualizados `docs/MEMORY.md` (D-001 a D-005, OQ-001 a OQ-007) y este archivo.
- **Verificado:** sin código que verificar. Documentos sin revisar por el socio.
- **Resuelto en el camino:** el primer pegado del prompt llegó con el bloque "EL PROYECTO" vacío; se pidió la descripción antes de escribir nada.
- **Sigue:** aprobación de los documentos y del plan de `WU-01`; respuestas a OQ-001 y OQ-002.

### 2026-10-13 · Construcción del sistema completo · socio
- **Pedido:** "no hagas con git todavía, creá el sistema de una vez".
- **Hecho:** WU-01 a WU-04 y la parte de código de WU-05. Base (Next 16, TypeScript estricto, Tailwind 4, tokens medidos), esquema y migraciones con rol de mínimos permisos y triggers, better-auth sin registro con límites por IP y por cuenta y segundo factor, guard en cada página y acción, CSP con nonce, Sentry sin datos personales, CI con rama temporal de Neon. Pantallas: ingresar, primer ingreso, Proyectos, Grupos, Usuarios, `Ctrl+K`, inactividad.
- **Archivos:** todo el código nuevo (`app/`, `components/`, `dal/`, `acciones/`, `lib/`, `db/`, `styles/`, `i18n/`, `scripts/`, `tests/`, configuración en la raíz, `.github/workflows/ci.yml`); `docs/PUESTA-EN-MARCHA.md` nuevo; actualizados `docs/MEMORY.md` (D-006 a D-011, TD-001 a TD-005, OQ-008), `DATOS.md`, `ARQUITECTURA.md`, `DISENO.md`, `ROADMAP.md`.
- **Verificado:** `pnpm typecheck` y `pnpm lint` sin errores ni avisos; `pnpm test` 73 pasan (1 salteado: solo corre en CI) contra Postgres 17 en Docker; romper a propósito la regla https, el guard de una acción, la matriz de permisos y el permiso DELETE hizo fallar su test. Build de producción OK; búsqueda de secretos en `.next/static`: 0. Con el servidor de producción local: sin cookie → 307 al login; cookie falsa → ningún dato; `crearCuenta` llamada sin sesión → rechazada, 0 cuentas nuevas. Login por HTTP: mensaje genérico igual exista o no la cuenta, 6º intento a una cuenta → 429, sin segundo factor → `/primer-ingreso`, QR + 10 códigos, TOTP real lo activa. Chromium headless a 375/1440/1920 en claro y oscuro: sin scroll horizontal, consola limpia; alta con aviso de repetido, tarjeta de resultado que se va sola, pregunta al descartar, `Ctrl+K` abre en otra pestaña, archivar, filtro, cuenta nueva con contraseña mostrada una vez, movimiento reducido. Tarjeta de formulario muestreada cuadro por cuadro. **Sin verificar:** velocidad en un preview, un teléfono real, Safari, lector de pantalla, el cierre por inactividad en dos pestañas, el login escrito a mano en el navegador (por regla Claude no escribe contraseñas ahí), la CI corriendo de verdad.
- **Resuelto en el camino:** `/` respondía 200 con la redirección adentro (por `loading.tsx`) → chequeo de cookie en `proxy.ts` (D-009). La tarjeta saltaba 90 ms al entrar porque montaba el formulario en el mismo cuadro → arranca después del primer pintado (TD-003). Escape no cerraba el formulario desde la descripción porque el campo cortaba todas las teclas → corta solo Enter. `upgrade-insecure-requests` y Speed Insights rompían la consola fuera de Vercel → solo en Vercel. `/%09/evil.com` pasaba `destinoSeguro` → se rechaza lo que decodificado trae control o `\`.
- **Sigue:** OQ-001 y OQ-002; después `docs/PUESTA-EN-MARCHA.md` y WU-05.

### 2026-10-15 · Correr en local y primera cuenta · socio
- **Pedido:** "iniciame el proyecto"; "creame una cuenta con estas credenciales"; "no quiero que te pida 15".
- **Hecho:** base de prueba prendida, `.env.local` local (fuera de git) y `pnpm dev` en http://localhost:3000. Cuenta `justitoogv@gmail.com` creada **solo en la base local**, con la contraseña que eligió el socio. Mínimo de contraseña bajado de 15 a 8 (D-012).
- **Archivos:** `lib/contrasena.ts` (mínimo 8), `i18n/es/ingreso.ts` (texto de ayuda), `docs/MEMORY.md` (D-012), `docs/ARQUITECTURA.md` y `docs/ROADMAP.md` (≥ 8). `.env.local` nuevo, ignorado por git.
- **Verificado:** `pnpm typecheck` OK; la pantalla de ingreso responde 200. El login con esa cuenta no lo probó Claude.
- **Sigue:** que el socio entre y active el segundo factor. La contraseña se escribió en el chat: no usarla en producción.

### 2026-10-15 · Sin segundo factor · socio
- **Pedido:** "no quiero esto" (el paso del QR en el primer ingreso).
- **Hecho:** el guard ya no exige segundo factor; el primer ingreso es solo cambiar la contraseña inicial; Usuarios sin la columna de segundo factor. D-013, contesta OQ-001.
- **Archivos:** `dal/guard.ts`, `app/(publico)/ingresar/page.tsx`, `app/(publico)/primer-ingreso/page.tsx` y `FlujoPrimerIngreso.tsx`, `components/usuarios/VistaUsuarios.tsx`, `i18n/es/ingreso.ts`, `i18n/es/usuarios.ts`, `tests/guard.test.ts`, `docs/MEMORY.md`, `docs/ARQUITECTURA.md`, `docs/BRIEF.md`.
- **Verificado:** `typecheck` y `lint` OK; test del guard 7/7 (el caso "sin segundo factor" ahora pasa). Las páginas responden en `pnpm dev`. No se miró la pantalla en el navegador.
- **Sigue:** que el socio recargue y entre.

### 2026-10-20 · Primeros links reales · socio
- **Pedido:** "por ahora estén estos links en el portal": Formularios (https://formularios-gvg.vercel.app/formularios/nuevo), Sistema público (https://consalud.vercel.app/) y https://consultora-ten.vercel.app/login.
- **Hecho:** en la base **local**, borrada toda la muestra (35 proyectos, 5 grupos, 5 cuentas de prueba, su auditoría) y cargados los tres proyectos a nombre de `justitoogv@gmail.com`, con su fila de auditoría. El tercero no tenía nombre: quedó `consultora-ten` (sale de su dirección) hasta que el socio lo cambie.
- **Archivos:** ninguno de código; solo datos de la base local.
- **Verificado:** consulta a la base: 3 proyectos y 1 cuenta. No se miró la pantalla.
- **Sigue:** cuando se publique, cargar estos tres en la base de producción (la local no viaja).

### 2026-11-03 · Rediseño de color · socio
- **Pedido:** "quiero que sea más profesional el portal agregando los colores adecuados". Antes pidió conectar el repo a GitHub (`https://github.com/JustoGV/portal.git`) y subir todo; frenó el primer comando y no se hizo.
- **Hecho:** paleta de marca azul índigo con la barra lateral en azul noche (D-014). Tokens nuevos `marca-tinta` y `barra-*`. Barra lateral, búsqueda `Ctrl+K`, campos con foco, listas, tabla (cabecera, fila con el mouse), paginación, enlaces y vacíos con acento de marca. Cabecera de página con línea abajo. Login en dos paneles desde 60rem (lema y tres ventajas a la izquierda).
- **Archivos:** `scripts/tokens.ts`, `styles/tokens.css`, `styles/barra.css`, `styles/componentes.css`, `styles/proyectos.css`, `styles/ingreso.css`, `app/(publico)/ingresar/page.tsx`, `i18n/es/ingreso.ts`, `docs/DISENO.md`, `docs/MEMORY.md` (D-014, OQ-004).
- **Verificado:** `scripts/tokens.ts` 166 pares, todos pasan; `typecheck` y `lint` OK. Chromium headless a 375, 1440 y 1920, claro y oscuro: ingresar, Proyectos, Grupos, Usuarios y `Ctrl+K`, sin scroll horizontal; un solo error de consola, un 404 de un recurso en la primera carga de `pnpm dev` (no aparece en el log del servidor; sin identificar). Para mirar las pantallas internas se creó una sesión temporal en la base local y se borró al terminar. **Sin verificar:** `pnpm test`, el formulario de proyecto abierto y el primer ingreso.
- **Sigue:** que el socio mire y diga si le gusta el azul; logo y nombre (OQ-004, OQ-006); git y GitHub cuando lo confirme.

### 2026-11-03 · Primera cuenta desde la web · socio
- **Pedido:** "quiero que si no existe un usuario que pueda crear el primero yo, así, y subilo a git". Antes en el mismo chat: repo conectado a GitHub, migraciones 0000–0002 aplicadas en Neon (`sa-east-1`, base vacía), Vercel sin acceso desde Claude (el socio importa el repo a mano).
- **Hecho:** página `/configurar` (nombre, email, contraseña propia) que solo existe con la tabla `usuarios` vacía; `/ingresar` manda ahí si no hay cuentas; la acción crea la cuenta en una transacción con candado de Postgres (D-015). Aviso "Cuenta creada" en el login.
- **Archivos:** nuevos `app/(publico)/configurar/page.tsx`, `app/(publico)/configurar/FormPrimeraCuenta.tsx`, `acciones/primera-cuenta.ts`, `tests/primera-cuenta.test.ts`; cambiados `dal/cuentas.ts`, `lib/cuenta.ts`, `i18n/es/ingreso.ts`, `app/(publico)/ingresar/page.tsx`, `proxy.ts`, `docs/MEMORY.md`, `docs/PUESTA-EN-MARCHA.md`, `docs/ARQUITECTURA.md`.
- **Verificado:** `typecheck`, `lint` y tests en verde; build de producción OK. Con una base local vacía y `next start`: `/` → `/ingresar` → `/configurar`; contraseñas distintas marcan el error; crear lleva a `/ingresar?motivo=creada`; la fila queda con rol `admin`, `debe_cambiar_clave = false` y su línea en auditoría; `/configurar` pasa a redirigir al login; el ingreso con esa cuenta llega a Proyectos con la consola limpia. Solo a 1440; no se miró a 375 ni 1920 (usa la misma tarjeta que `/primer-ingreso`).
- **Sigue:** el socio crea su cuenta en `/configurar` apenas termina el primer deploy en Vercel. Rotar la contraseña de `neondb_owner` (pasó por el chat).
