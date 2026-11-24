---
name: verify-portal
description: Manejar el portal CESS - GVG (Next.js, web interna) como un usuario con sesión y probar que una pantalla funciona - levantar la base local y el servidor, chequear la instancia, recorrer rutas a 360/375/412/1440/1920 con capturas, chequeo de saltos de línea, desborde y consola, y abrir/cerrar lo que la pantalla tenga. Usar cuando Mateo dice «verificá», o antes de entregar un cambio que se ve en pantalla (Inicio, Servicios, Clientes, Tablero, Gastos, Usuarios, Mi cuenta).
---

# Verificar el portal

El portal es una web interna (Next.js App Router, `C:\Dev\cess-consultora\portal`). Se prueba en local con una cuenta inventada (`prueba@example.com`). **Nunca contra producción** y nunca con datos de personas reales: la base local tiene solo datos de muestra. No se abre `.env.local` ni se imprime ningún secreto.

Todo lo que corre acá deja la prueba en una carpeta **fuera del repo**: `$EV` = `<scratchpad>/verify-portal/<AAAA-MM-DD-HHMM>/` (o `%TEMP%\verify-portal\...` si no hay scratchpad). La cookie va en `$EV/../cookie.txt` y tampoco se commitea.

## Launch

1. **Docker Desktop prendido.** Si `docker ps` falla: `"/c/Program Files/Docker/Docker/Docker Desktop.exe" &` y esperar a que `docker ps` responda.
2. **Base local:** `docker start portal-cess-pg-55442` (Postgres 17, `127.0.0.1:55442`). El puerto 55432 que dice `docs/PUESTA-EN-MARCHA.md` lo usa otro proyecto: no usarlo. Lista cuando `docker ps --filter name=portal-cess-pg-55442` dice `Up`.
3. **Servidor:** desde `portal/`, `pnpm dev` en segundo plano (Bash con `run_in_background`). Listo cuando el log dice `Ready` **y** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ingresar` da `200`. La primera vez Next puede cortar con un aviso de seguridad: se relanza. Si ya hay un `pnpm dev` de esta sesión en el 3000, se reusa; si el 3000 lo tiene otro proceso que no arrancaste vos, no se toca: se avisa.
   Migraciones: si una pantalla da 500 por una columna que no existe, `pnpm db:migrate` (solo local; lee `.env.local` solo).
4. **Sesión de prueba (sin contraseñas):**
   `pnpm exec tsx --conditions=react-server --env-file=.env.local scripts/sembrar-prueba.ts "$EV/../cookie.txt"`
   Se niega a correr si la base no es local. Crea, si faltan, las cuentas `prueba@example.com` y `socio@example.com`, grupos y servicios «Muestra» y tarjetas de muestra, y escribe la cookie firmada. Debe terminar con «Muestra cargada y sesión de prueba lista.».
5. **Playwright** (el portal no lo tiene como dependencia): una vez por scratchpad,
   `mkdir -p "<scratchpad>/verify-portal/pw" && cd "<scratchpad>/verify-portal/pw" && npm init -y >/dev/null && npm i playwright@1 && npx playwright install chromium`.
   Los scripts se corren **parados en esa carpeta** (buscan `playwright` desde ahí).

Teardown: ver «Cleanup».

## Doctor

Antes de manejar, y cada vez que algo raro pase:

`node .claude/skills/verify-portal/scripts/doctor.mjs "$EV/../cookie.txt"`

Comprueba: contenedor `Up`, `GET /ingresar` → 200, y que la cookie abre sesión (`GET /` → 200, no una redirección a `/ingresar`). Si la sesión falla, se vuelve a correr el paso 4 de Launch.

## Drive

`node <portal>/.claude/skills/verify-portal/scripts/recorrer.mjs --cookie "$EV/../cookie.txt" --salida "$EV" --rutas <rutas> [--anchos …] [--abrir <selector>] [--abierto <selector>] [--cerrar-esc]`

- Por cada ruta y ancho (por defecto 360, 375, 412, 1440, 1920; menos de 768 se abre como celular táctil): carga, corre el chequeo de saltos de línea sobre `main` (`scripts/saltos.mjs`: corta con lugar, palabra sola abajo, línea que termina en «de/la/y…», texto que se sale), mide el desborde horizontal, junta errores de consola y saca captura.
- `--abrir` hace click en el primer elemento que coincide y saca la captura abierta; `--abierto` es el selector que tiene que aparecer; `--cerrar-esc` aprieta Esc y comprueba que desaparece.
- En Git Bash, anteponer `MSYS_NO_PATHCONV=1` al comando: si no, `/tablero` llega como `C:/Program Files/Git/tablero` (el script lo deshace, pero otros argumentos con `/` no). Con esa variable las rutas de archivo van como `C:/...`, no `/c/...`. Ejemplo probado:
  `cd "<scratchpad>/verify-portal/pw" && MSYS_NO_PATHCONV=1 node C:/Dev/cess-consultora/portal/.claude/skills/verify-portal/scripts/recorrer.mjs --cookie "C:/.../verify-portal/cookie.txt" --salida "C:/.../verify-portal/<fecha>" --rutas /tablero --abrir "article.tb-tarjeta" --abierto ".tb-conv" --cerrar-esc`
- El chequeo de saltos mide contra su propia caja (no contra la pantalla) lo que está adentro de un contenedor que corre de costado (`overflow-x: auto/scroll` o `[data-carril]`), como las listas del Tablero en el celular.
- Sale con 1 si algo falla e imprime cada hallazgo. `informe.json` queda en `$EV`.
- Selectores reales de cada pantalla y qué comprobar: `features/`. Para un flujo que escribe (crear una tarjeta, guardar un gasto), se escribe un script chico en el scratchpad con Playwright que use esos selectores y, al final, se comprueba la fila en la base local (consulta de solo lectura con `scripts/ver-base.mjs` o `psql` contra 55442).

## Evidence

- La prueba es el camino real del usuario: navegar, hacer click, escribir. Nada de llamar Server Actions sueltas ni endpoints de prueba.
- Se captura la acción y el estado que queda (cerrada y abierta; antes y después de guardar), y el efecto en la base cuando lo hay.
- Al reportar: qué pasó, qué falló, la ruta de `$EV` y las capturas a Mateo (SendUserFile). Lo que no se pudo probar (un celular real, producción) se dice como no probado.
- La regla de saltos exige **0** a los cinco anchos antes de entregar, y además mirar la captura del celular.

## Cleanup

- `pnpm dev`: solo si lo arrancaste en esta corrida, se para con TaskStop de **esa** tarea. Nunca `taskkill /im node.exe` ni matar por nombre.
- La base: si la prendiste vos y Mateo no la estaba usando, `docker stop portal-cess-pg-55442`; si ya estaba arriba, se deja.
- Datos que creó la corrida (tarjetas, gastos de prueba): se borran por título o por `creado_por` de la cuenta de prueba, solo en la base local.
- **La carpeta `$EV` no se borra**: es la prueba. Después de limpiar, `ls "$EV"` tiene que seguir mostrando las capturas e `informe.json`.

## Helpers

| Script | Para qué | Cómo |
|---|---|---|
| `scripts/doctor.mjs` | Chequeo de solo lectura de la instancia | `node scripts/doctor.mjs <cookie.txt> [base]` |
| `scripts/recorrer.mjs` | Recorrer rutas con capturas, saltos, desborde y consola | ver «Drive» |
| `scripts/saltos.mjs` | La función del chequeo de saltos, para importar en un script propio | `import { ENLACE, revisar } from ".../saltos.mjs"`; `page.evaluate(revisar, [ENLACE, "main"])` |
| `<portal>/scripts/sembrar-prueba.ts` | Datos de muestra y cookie | Launch paso 4 |

Mapa de pantallas y cómo probar cada una: `features/README.md`. Mantenerlo con `/pstack:maintain-verification-skill`.
