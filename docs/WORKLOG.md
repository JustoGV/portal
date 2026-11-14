# WORKLOG

Dos secciones. **§1 ESTADO** se sobrescribe completa cada vez que se cierra una sesión o una tarea. **§2 REGISTRO** solo se agrega, nunca se borra. Formato y reglas: `docs/reglas/01-FORMA-DE-TRABAJO.md` §3.

## 1. ESTADO

| Campo | Valor |
|---|---|
| Tarea actual | **WU-06 · Rediseño pantalla por pantalla** (`docs/ROADMAP.md`). Pantalla 1 Ingreso ✅ con OK de Mateo. Pantalla 2 Barra lateral: la barra está hecha (D-022) y espera su OK; falta la ronda de `Ctrl+K`, que cierra la pantalla. Proyectos: la lista está hecha (D-017) y espera su OK. |
| Estado real | Rama `diseno/lista-proyectos`, commiteada (sale de `main` en `52d2b00`) y **sin subir**: `123b793` con el rediseño y un commit de documentación del 2026-11-14 encima. `typecheck` y `lint` limpios, `test` 79 pasan (1 salteado) contra Postgres local en `portal-cess-pg-55442`. Next.js 16.4.6 (D-021). Mateo creó su cuenta local (`mateogaviraghi24@gmail.com`, con `pnpm crear-admin`, la corrió él) y entró: el ingreso real y el cambio de contraseña inicial funcionan. |
| Radar de seguridad | 2026-11-12 · `pnpm audit --prod`: 0 críticas, 0 altas, 3 moderadas en herramientas (TD-006). |
| Último chat | 2026-11-14 · Mateo, local: reorganización de todo el trabajo de la consultora (sin código). El portal pasa a ser el lugar de trabajo de los tres socios; `WU-07` (tablero) y `WU-08` (registro de casos) nuevas, las dos **después** de terminar `WU-06`. |
| Qué espera de Mateo | **De a una** (regla suya del 14/11): primero, OK o correcciones a la barra lateral. Después: OK a la lista de Proyectos; decir "subí el portal" si quiere la rama en GitHub; OQ-009 y el reparto de tareas con el socio. |
| Qué espera del socio | OQ-009; después OQ-002 (cuentas) para publicar (WU-05). |
| Qué espera de terceros | — |
| Próxima acción | Ronda de 5 a 7 referencias de `Ctrl+K` (búsqueda rápida, `components/ui/BusquedaRapida.tsx`, clases `bq__` de `styles/barra.css`) con el método de `docs/trabajo/MATEO.md` §5 y §10; después pantalla 3 Proyectos (formulario en pasos, tarjetas de resultado, avisos, íconos); 4 Grupos; 5 Usuarios (incluye TD-008); 6 Cuenta y configuración. **Las seis antes de `WU-07`: ese orden lo fijó Mateo y no se vuelve a proponer otro.** La cola de toda la consultora vive en `C:\Dev\cess-consultora\brain\_proceso\plan-de-trabajo.md`. |
| Qué no se toca | Las reglas de `docs/reglas/` sin un `D-` que diga por qué. `docs/reglas/02-CRITERIO-DASHBOARD.md` Parte A. Las migraciones 0000–0002 una vez que corran en producción. La rama `nombre-portal-consultora` del socio (OQ-009). Ningún `.env.example`. |

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

### 2026-11-12 · Lista de Proyectos con referencias · Mateo
- **Pedido:** mejorar el diseño del portal, empezando por Proyectos, con su método (ronda de referencias, elegir, plan, construir, mirar). Eligió "La #5"; GO-AHEAD: "Dale, link y píldora".
- **Hecho:** Proyectos pasa de tabla centrada a lista (D-017), con la tarjeta que sigue al mouse. `pegar()` en `lib/texto.ts` (une «de», «y», «la»… con la palabra siguiente y las dos últimas de cada párrafo) aplicado al nombre, la descripción y la bajada; `text-wrap: pretty` en párrafos y `balance` en títulos, en la capa base.
- **Archivos:** `components/proyectos/ListaProyectos.tsx` (lista `ul`/`li`, fila nueva), `components/proyectos/VistaPrevia.tsx` (nuevo), `styles/proyectos.css` (lista, ancho angosto con `@container`, tarjeta, esqueleto, movimiento reducido), `app/(app)/page.tsx` (esqueleto de filas, `pegar` en la bajada), `i18n/es/proyectos.ts` (bajada "Tocá un proyecto…", `actualizado`, `abreOtraPestana`; fuera las `col*` que ya no se usan), `lib/texto.ts` (`pegar`), `app/globals.css` (`text-wrap`), `docs/MEMORY.md` (D-017).
- **Verificado:** Chromium (Playwright) contra la base local con datos de muestra y de peor caso (nombre de 80 letras, descripción de 200, nombre de una letra, grupo de 40, sin grupo): capturas a 375, 1440 y 1920 en claro y oscuro, con la fila bajo el mouse; chequeo de saltos de línea a 360, 375, 390, 768, 1440 y 1920 → 0; búsqueda sin resultados muestra el vacío; un resultado; archivados; tocar la parte vacía de una fila abre el link en otra pestaña; Editar abre su tarjeta y no el link; Tab va del nombre a Editar; anillo de foco visible; consola sin errores. `typecheck` y `lint` limpios, `test` 79 pasan (1 salteado). **Sin verificar:** un celular real, Safari, lector de pantalla.
- **Sigue:** el formulario de nuevo/editar proyecto en pasos; tarjetas de resultado y avisos; íconos de Lordicon (reabre D-008, pendiente de Mateo).

### 2026-11-12 · Ingreso rediseñado (WU-06, pantalla 1) y Next.js seguro · Mateo
- **Pedido:** "arranquemos con ingreso"; ante la ronda de 7 referencias, "no me gusta tu elección, hacé 3 prototipos atractivos con los componentes de formularios atractivos"; GO-AHEAD "Dale"; eligió "vamos con el 1" con los cambios de D-019; "Dale" al plan de pasarlo al ingreso real; y, al ver el aviso de Next en la pantalla, "agregá esto a este plan".
- **Hecho:** 3 prototipos reales detrás del selector de `prototype` en `/ingresar/prototipos` (Escenario, Editorial, Pasos), probados y borrados después de elegir. Escenario pasó a `/ingresar`, `/configurar` (2 pasos) y `/primer-ingreso` (2 pasos). Íconos propios a dos colores con movimiento estilo Lordicon (D-018) en `components/iconos/IconoDuo.tsx`. Next.js y vitest actualizados (D-021).
- **Archivos:** nuevos `components/iconos/IconoDuo.tsx`, `components/ingreso/Escenario.tsx`, `components/ingreso/CampoDuo.tsx`; reescritos `app/(publico)/ingresar/page.tsx`, `FormIngreso.tsx`, `app/(publico)/configurar/page.tsx`, `FormPrimeraCuenta.tsx`, `app/(publico)/primer-ingreso/page.tsx`, `FlujoPrimerIngreso.tsx`, `styles/ingreso.css`; `i18n/es/ingreso.ts` (título "Inicio de sesión", `campoIngreso`, pasos; fuera `bajada`, `olvido`, `lema`, `ventajas`); `lib/marca.ts` (D-019); `package.json` y `pnpm-lock.yaml` (D-021); `docs/MEMORY.md` (D-019 a D-021, TD-006).
- **Verificado:** Chromium (Playwright) contra la base local: `/ingresar` a 375, 1440 y 1920; con aviso de sesión vencida; `/primer-ingreso` a 375 y 1440 (marcando la cuenta de prueba con contraseña inicial y devolviéndola después); email incompleto → mensaje, email válido → tilde, contraseña incorrecta → "Email o contraseña incorrectos"; chequeo de saltos de línea en 0 en `/ingresar`, `/ingresar?motivo=inactiva` y `/` a 360, 375, 390, 768, 1440 y 1920; consola sin errores. `typecheck` y `lint` limpios, `test` 79 pasan (1 salteado). `pnpm audit --prod`: 0 críticas, 0 altas. **Sin verificar:** `/configurar` (solo aparece con la base sin cuentas), un ingreso exitoso (Claude no escribe contraseñas), el paso del código de segundo factor, un celular real.
- **Resuelto en el camino:** un error de hidratación en `/primer-ingreso` ("La contraseña que te pasaron" vacío en el servidor) era el servidor de desarrollo con `i18n/es/ingreso.ts` viejo en caché: se fue al reiniciarlo. La base de Docker se cayó dos veces porque otro proyecto de la máquina (EDV) tomó el puerto 55432: la del portal pasó a `portal-cess-pg-55442` (mismo volumen) y `.env.local` apunta ahí.
- **Sigue:** WU-06 pantalla 2, la barra lateral y `Ctrl+K`.

### 2026-11-12 · Barra lateral (WU-06, pantalla 2) · Mateo
- **Pedido:** "Queda, seguimos" (cierra Ingreso); ronda de 6 referencias de barra; eligió "La #3"; GO-AHEAD "Dale, visible".
- **Hecho:** barra nueva (D-022): empresa y "Portal" arriba, secciones siempre visibles, resaltado que viaja, íconos a dos colores, achicado en curva con el nombre al pasar el mouse.
- **Archivos:** `components/ui/BarraLateral.tsx` (reescrito; fuera el grupo desplegable), `styles/barra.css` (parte `bl__` reescrita; la de `Ctrl+K`, `bq__`, igual), `components/iconos/IconoDuo.tsx` (grupos, personas, salir, panel), `i18n/es/navegacion.ts` (`seccionPortal`), `docs/DISENO.md` §4, `docs/MEMORY.md` (D-022).
- **Verificado:** Chromium (Playwright): a 1440 en oscuro y 1920 en claro, el resaltado queda en la misma altura que "Usuarios" con el mouse encima (311 px / 311 px) y vuelve a la página actual al salir (179 / 179); achicada, el nombre "Grupos" aparece al lado; a 375 el menú entra desde la izquierda; consola limpia. `typecheck` y `lint` limpios, `test` 79 pasan. Saltos de línea: 0 en `/` y `/grupos`; 3 en textos de la pantalla Usuarios a 360–390 (no de la barra), quedan para la pantalla 5. **Sin verificar:** `Ctrl+K` rediseñado (sigue igual), un celular real.
- **Sigue:** la ronda de referencias de `Ctrl+K`, que cierra la pantalla 2.

### 2026-11-13 · Cierre del chat (WU-06 pantallas 1 y 2) · Mateo
- **Pedido:** después de la barra, "no puedo ingresar al sistema"; "pero usá este correo mateogaviraghi24@gmail.com"; sobre el pie de la barra, "esto no me gusta, no hay una sección de configuración, de última anotalo como una próxima tarea para hacer cuando se implemente que hay que mejorar eso"; y `/cerrar`.
- **Hecho:** diagnóstico del ingreso: no era una falla, su cuenta no existía en la base local (solo `prueba@example.com` y `socio@example.com`; el servidor registró "User not found" en sus dos intentos). Mateo corrió `pnpm crear-admin "Mateo Gaviraghi" mateogaviraghi24@gmail.com` (Claude no lo corre: muestra la contraseña) y entró. La pantalla 6 "Cuenta y configuración" quedó anotada en `docs/ROADMAP.md`. Registro al día.
- **Archivos:** `docs/ROADMAP.md` (pantalla 6), `docs/MEMORY.md` (G-001 a G-003, TD-007, TD-008, OQ-006 contestada, OQ-009), este archivo (ESTADO reescrito).
- **Verificado:** el ingreso con una cuenta real lo probó Mateo (la captura muestra la barra con "Mateo Gaviraghi"). **Sin verificar:** `/configurar`, el paso del código de segundo factor, un celular real.
- **Gates:** sin cambios de código desde la entrada de la barra (`typecheck`, `lint` limpios; `test` 79 pasan).
- **Sigue:** la ronda de `Ctrl+K`.


### 2026-11-14 · Reorganización del trabajo de la consultora (solo documentación) · Mateo
- **Pedido:** "estoy muy perdido, no sé cómo podemos avanzar… siempre falta uno para el peso". Charla por preguntas, de a una. GO-AHEAD: "Armarlo de una forma eficiente, que sea muy, muy, muy profesional… empezar a trabajar como líderes técnicos".
- **Hecho:** el orden de toda la consultora quedó en el cerebro (`brain/_proceso/plan-de-trabajo.md`): 1) rediseño completo del portal (`WU-06`), 2) tablero de trabajo (`WU-07`), 3) formularios por chat, 4) registro de casos (`WU-08`). En este repo: `WU-06` con el orden confirmado y `WU-07` y `WU-08` descritas en el ROADMAP. Reglas de diseño dictadas por Mateo para todos los sistemas (vara: sus proyectos Sanalys y EDV): formularios en tarjetas por pasos, tres niveles de texto, tablas centradas, etiqueta en cada botón, desplegables propios, confirmación y error animados que dicen por qué, movimiento que muestra el cambio al filtrar, íconos propios, tablero y configuración completos, y en el celular como una app.
- **Archivos:** `docs/ROADMAP.md` (orden de `WU-06`, `WU-07`, `WU-08`), este archivo (ESTADO).
- **Verificado:** nada que correr; no se tocó código.
- **Resuelto en el camino:** Claude propuso dos veces hacer el tablero después de la pantalla 3 y lo escribió en el ROADMAP como decidido. Mateo lo rechazó: "habíamos dicho el rediseño primero, ¿por qué me proponés el tablero?". Corregido. Causa: reabrir una decisión ya tomada. Regla: el orden que fija Mateo no se vuelve a proponer.
- **Gates:** no se corrieron (sin cambios de código desde `123b793`).
- **Sigue:** OK de Mateo a la barra lateral, y la ronda de `Ctrl+K`. Una sola pregunta por vez. `WU-07` necesita antes un `D-` que amplíe el alcance del BRIEF y el acuerdo con el socio.
