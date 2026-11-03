# portal-cess-gvg — instrucciones para Claude

Proyecto de dos personas: Mateo y su socio. Las **reglas del producto** (`docs/reglas/`) valen para todo el código, lo escriba quien lo escriba. La **forma de trabajar en el chat** es de cada uno: este archivo no le impone a nadie un ritual que no pidió.

Si algo no está en `docs/`, ni en este archivo, ni se puede verificar en el código, se dice en vez de adivinarlo.

## 0. ¿El proyecto ya arrancó?

Si no existe `docs/BRIEF.md`, el proyecto no arrancó todavía: seguí `PROMPT-INICIO.md` antes de escribir código.

## 1. Orden de lectura (cada chat nuevo, antes de tocar código)

1. `docs/WORKLOG.md` §1 ESTADO: en qué punto está el proyecto, qué espera a quién, cuál es la próxima acción.
2. `docs/BRIEF.md`, `docs/ARQUITECTURA.md`, `docs/DATOS.md` y `docs/ROADMAP.md`, cuando existan. El ROADMAP dice qué unidad de trabajo sigue y qué archivos toca.
3. `docs/MEMORY.md`: decisiones (`D-`), trampas (`G-`), deuda (`TD-`) y preguntas abiertas (`OQ-`). **Lo decidido no se vuelve a decidir.** Cambiarlo es un `D-` nuevo que dice "reemplaza D-0NN".
4. `docs/reglas/00-INDICE.md`, y las reglas que toca la tarea.

## 2. Reglas del producto que no se negocian

Cada una tiene su archivo con el detalle y el porqué. Están acá porque son las que se rompen sin darse cuenta.

1. **Autorización en el servidor.** Cada Server Action, cada route handler y cada página que lee datos empieza por el guard (`exigir(permiso)`). Esconder un botón es UX, no seguridad. Los roles salen de la fila del usuario en la base, nunca del pedido ni de la sesión del proveedor. → `10-SEGURIDAD.md`
2. **Plata**: `numeric(12,2)` en Postgres, `Decimal` o string en el código y en el cable. Nunca un `number` de JS. → `11-DATOS.md`
3. **Tiempo**: `timestamptz` en UTC, mostrado en `America/Argentina/Buenos_Aires` (o la zona que fije el BRIEF). → `11-DATOS.md`
4. **Las invariantes viven en Postgres**: únicos, checks, `EXCLUDE`, secuencias, triggers, tablas que no se borran. La validación de la app es para los mensajes, no para la seguridad. → `11-DATOS.md`
5. **Ningún dato inventado.** Precios, teléfonos, direcciones, nombres, textos legales: lo que falta va como `{{CONFIRMAR}}` en la pantalla y como `OQ-` en `docs/MEMORY.md`, diciendo quién lo tiene que pasar. → `01-FORMA-DE-TRABAJO.md`
6. **Ninguna tabla entera.** Paginación en el servidor, consultas acotadas por día o período, filtros en la URL. → `07-TABLAS-PAGINACION-FILTROS.md`
7. **Cada regla de un campo se escribe una vez** (en `lib/`) y la usan el campo mientras se escribe y la acción al guardar. El DNI repetido lo frena un índice único, no solo la pantalla. → `06-FORMULARIOS.md`
8. **Secretos**: solo en el panel de variables del hosting. Nunca en el repo, nunca en el chat, nunca un `.env.example`. En la documentación van los nombres, jamás los valores. → `10-SEGURIDAD.md`
9. **Rendimiento con metas**: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. Las librerías pesadas (PDF, Excel, gráficos, 3D) se cargan recién al hacer click. → `09-RENDIMIENTO.md`
10. **Lo que se refresca solo no se vuelve a animar.** Las cosas se animan cuando alguien hace algo, no cuando llegan datos. → `08-MOVIMIENTO-GSAP.md`
11. **Nada está hecho sin mirarlo**: la pantalla corriendo, a 375, 1440 y 1920, con la consola limpia. → `12-VERIFICACION.md`
12. **Prohibido**, salvo un `D-` que lo reabra: Framer Motion (el movimiento es GSAP y CSS) · Inter y Geist · Tailwind por CDN · el paquete `xlsx` de npm (tiene vulnerabilidades conocidas) · tokens o sesiones en `localStorage` · shadcn pegado sin adaptar a la marca · instalar un paquete sin abrir antes su página del registro · controles nativos del navegador a la vista (select, fecha, checkbox) · `confirm()`/`prompt()` nativos.

## 3. Stack por defecto

Es el que funcionó en el proyecto anterior. Se confirma o se cambia en el arranque y queda como `D-001`. Las versiones se eligen el día que se instalan, abriendo la página del registro (`10-SEGURIDAD.md` §9).

| Pieza | Por defecto | Para qué |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript estricto | Server Components, Server Actions |
| Estilos | Tailwind 4 + tokens propios en CSS (`@layer`) | Una escala, nada suelto |
| Controles | `react-aria-components` | Select, combobox, fecha, checkbox, radio, switch accesibles y diseñados |
| Movimiento | `gsap` + `@gsap/react` (todos los plugins son gratis) | Timelines, DrawSVG, Flip |
| Íconos | `@lordicon/element` (animados) + `lucide-react` (utilitarios) | `04-ICONOS.md` |
| Validación | `zod` | Un esquema por acción, en el servidor |
| Base de datos | Postgres (Neon) + Drizzle ORM | Invariantes en la base |
| Login | `better-auth` sobre nuestra propia base | Sesiones en el servidor, revocables |
| Hosting | Vercel, con las funciones en la misma región que la base | `09-RENDIMIENTO.md` §1 |
| PDF / Excel | `jspdf` + `jspdf-autotable` · `write-excel-file` / `read-excel-file` | Siempre con `await import()` al hacer click |
| Errores | Sentry (solo errores, sin datos personales) | `09-RENDIMIENTO.md` §7 |

## 4. Cómo trabaja cada uno

- **Por defecto, seguí a la persona que escribe en el chat**: su forma de pedir, su ritmo, su formato. No le impongas reportes, aprobaciones ni pasos que no pidió.
- **Lo mínimo compartido**, porque son dos personas sobre el mismo repo: cuando una tarea cambia algo, una entrada corta en `docs/WORKLOG.md`, y lo que se decidió en `docs/MEMORY.md`. Así el otro sabe qué pasó sin preguntar. → `docs/reglas/01-FORMA-DE-TRABAJO.md`
- **Mateo trabaja con su propio método**, escrito en `docs/trabajo/MATEO.md`. Aplica solo cuando él lo pide: cuando escribe `/retomar`, `/cerrar` o `/seccion-premium`, o cuando dice que es él. **Nunca se le aplica al socio.**
- Si no sabés quién escribe y la tarea no lo necesita, no preguntes: trabajá con las reglas del producto y el mínimo compartido.

## 5. Skills de este repo (`.claude/skills/`)

| Skill | Cuándo | Cómo |
|---|---|---|
| `retomar`, `cerrar` | El ciclo de sesión de Mateo: leer el estado al arrancar, volcarlo al cerrar | Solo a mano: `/retomar`, `/cerrar` |
| `seccion-premium` | Diseñar una pantalla o un componente con una ronda de referencias reales, elegir, planear y construir | Solo a mano: `/seccion-premium` |
| `motion-web-senior` | Cualquier animación: GSAP, timelines, transiciones, rendimiento del movimiento | Se carga sola cuando la tarea es de movimiento |
| `gsap-scrolltrigger` | Animaciones atadas al scroll (la skill oficial de GSAP) | Se carga sola |
| `ui-ideas` | Nombres reales de componentes y patrones, con links a demos para abrir y probar | Se carga sola cuando se piden ideas u opciones |

## 6. Git y repo

- Una rama por tarea, PR a `main`. `main` se despliega a producción.
- Nunca se commitea un secreto, un `.env.local` ni un `.env.example`.
- Antes de cada PR: `typecheck`, `lint` y `test` en verde, y una revisión de seguridad del diff (`10-SEGURIDAD.md` §10).
- Una migración que ya corrió en producción no se edita nunca: se escribe otra (`11-DATOS.md` §5).
