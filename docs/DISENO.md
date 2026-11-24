# DISEÑO

## 1. Quién mira (docs/reglas/02 A §1)

> Lo abren **los tres socios** (Mateo, Justo y Claudio), que tienen varios proyectos y necesitan llegar rápido a uno. Entran con **una sola pregunta**: *"¿dónde está el link de X?"*. Lo encuentran, hacen click y se van: el portal es un paso de camino, no un lugar donde quedarse. Lo abren muchas veces al día y con poca atención, así que lo que buscan tiene que estar a la vista o a dos teclas (`Ctrl+K`, Enter). Desde dónde lo abren (escritorio, teléfono o los dos) y con qué luz está en `{{CONFIRMAR}}` (`OQ-007`).

Lo que sale de ahí:
- **Contestar al entrar**: la lista de proyectos es la pantalla de inicio, con la búsqueda arriba y el foco ya puesto en ella.
- **Encontrar sin leer todo**: búsqueda mientras se escribe, filtros por grupo que muestran solo los grupos que existen.
- **Abrir es la acción principal** de cada fila: un click en el nombre abre el link en otra pestaña. Editar y archivar son íconos secundarios.
- **Se usa todo el día**: nada parpadea ni se re-anima solo. `Ctrl+K` abre al instante, sin animación.
- **El portal abre siempre en claro** (D-030; Mateo: "no quiero que sea negro porque no se ve nada"). El tema oscuro quedó detrás de un atributo que hoy nadie pone.
- **Tocar una fila abre su ficha** en una tarjeta al centro (D-030); el link se abre con el botón "Abrir".

## 2. Marca

| Pieza | Valor |
|---|---|
| Nombre visible | `{{CONFIRMAR}}` (`OQ-006`) |
| Logo | `{{CONFIRMAR}}` (`OQ-004`) |
| Colores | Azul índigo, tono OKLCH 264 (`D-014`): marca `#2253cf` (claro) / `#3061d8` (oscuro). Barra lateral y panel del login en azul noche `#101d38` / `#0c1220` en los dos temas |
| Tipografía | Provisoria: **Manrope** variable, en `app/fuentes/` (`D-007`). Se cambia cuando haya marca (`OQ-004`) |

## 3. Tokens

Estructura de `docs/reglas/03` §1, con prefijo `--sys-`, en `styles/tokens.css`. Los colores salen de `scripts/tokens.ts`: se definen en OKLCH (neutrales con el tono de la marca, 264, y croma entre 0,002 y 0,03, nunca 0), se pasan a hex bajando el croma si caen fuera de la pantalla, y **el contraste se mide sobre esos hex**. `pnpm exec tsx scripts/tokens.ts` imprime la tabla: 166 pares medidos, todos pasan. Los más justos:

| Tema | Par | Contraste | Piso |
|---|---|---|---|
| claro | `barra-borde-control` sobre `barra-capa` | 3,08 | 3 |
| oscuro | `borde-control` sobre `capa-3` | 3,14 | 3 |
| oscuro | `marca` sobre `capa` | 3,30 | 3 |
| claro | `borde-control` sobre `capa-3` | 3,44 | 3 |
| claro | `texto-3` sobre `capa-3` | 5,00 | 4,5 |

Prohibido por medición: nada (todos los pares de texto de estado sobre todos los niveles pasan). En el tema oscuro, lo que va sobre un color de estado sólido va en `--sys-lienzo`; en el claro, en `--sys-capa` (salvo `warn-solido`, que lleva `--sys-texto-1`). Están como `--sys-<estado>-solido-texto`.

| Grupo | Tokens | Valor |
|---|---|---|
| Superficies | `lienzo` · `capa` · `capa-2` · `capa-3` · `borde` · `borde-2` · `borde-control` (≥ 3:1) | ver `styles/tokens.css`; neutrales teñidos de azul |
| Texto | `texto-1` · `texto-2` · `texto-3` (los tres ≥ 4,5:1 en todos los niveles) | ver `styles/tokens.css` |
| Marca | `marca` · `marca-hover` · `marca-activo` · `marca-texto` · `marca-suave` · `marca-suave-2` · `marca-borde` · `marca-tinta` · `foco` | azul índigo (`D-014`): claro `#2253cf` con texto `#fdfdff`; oscuro `#3061d8` con el mismo texto. `marca-tinta` es el color marca para texto y trazos sobre las superficies (≥ 4,5:1): `#204ec3` / `#93b7ff` |
| Barra | `barra-fondo` · `barra-capa` · `barra-activo` · `barra-borde` · `barra-borde-control` · `barra-texto-1` · `barra-texto-2` · `barra-acento` · `barra-foco` | azul noche en los dos temas. Adentro, `--sys-foco` pasa a ser `--sys-barra-foco` |
| Estados | `ok` · `warn` · `danger` · `info`, cada uno con `-bg` · `-borde` · `-solido` | ver `styles/tokens.css`; la marca nunca los toca |
| Escalas | tipo, espacio, radio y toque de `docs/reglas/03` §1.5 | fijas |
| Movimiento | `dur-1` 150 ms · `dur-2` 220 ms · `dur-3` 320 ms · `ease` `cubic-bezier(.25, 1, .5, 1)` | fijas |

## 4. Navegación

Barra lateral izquierda (`docs/reglas/02` B2), sin cabecera arriba (D-022, referencia #3 Animate UI Sidebar): arriba "CESS - GVG" + "PORTAL" y el botón de achicar, después la búsqueda (`Ctrl+K`), las secciones y, al pie, la cuenta y "Salir".

| Sección | Página | Ícono (a dos colores, D-018) |
|---|---|---|
| Portal | Servicios (D-023; la ruta y el código siguen como `proyectos`, D-027) | carpeta |
| Administración | Grupos | cuatro casillas con un más |
| Administración | Usuarios | dos personas |

Cada sección ("Portal", casa; "Administración", escudo) es una fila que se abre y cierra con un pico a la derecha; sus páginas van debajo como sub-enlaces, con sangría y unidas por una línea vertical (D-024). Arrancan abiertas. Un solo resaltado se desliza a la fila bajo el mouse y vuelve a la página actual; la actual enciende su tramo de la línea. Si la sección de la página actual está cerrada, el resaltado y la marca descansan en la fila de la sección. Achicada, queda una columna de íconos y el nombre aparece al lado al pasar el mouse.

Cada pantalla nueva sale de una ronda de 5 a 7 referencias reales de ese componente (`docs/reglas/02` B8) antes de construirla.
