# 03 — Diseño visual: tokens, contraste, estados y textos

Cómo se convierte el criterio (`02`) en valores. Los colores concretos salen de la marca del cliente y se escriben en `docs/DISENO.md` al arrancar. Acá está **la estructura** que esos colores llenan y **el método** para comprobarlos.

## 1. Tokens: un solo lugar, nada suelto

Todos los valores viven como variables CSS en un archivo de tokens (`:root`), con prefijo propio (por ejemplo `--sys-*`). **Un tamaño, un color o una duración que no está en los tokens no existe.** Si hace falta uno nuevo, se agrega a la escala con su motivo.

### 1.1 Niveles de superficie, no colores por zona

| Token | Rol |
|---|---|
| `--sys-lienzo` | el fondo de la ventana |
| `--sys-capa` | la tarjeta |
| `--sys-capa-2` | lo elevado dentro de la tarjeta: campos, la fila con el mouse encima, un menú abierto, el diálogo |
| `--sys-capa-3` | lo más elevado: un control apretado, la cabecera de un panel |
| `--sys-borde` | la línea entre niveles (el borde de una tarjeta) |
| `--sys-borde-2` | la línea más fuerte: divisores, la línea bajo la cabecera de una tabla |
| `--sys-borde-control` | el contorno de un control (campo, botón secundario): **≥ 3:1 contra su fondo** (WCAG 1.4.11) |

- **Cada nivel es un color opaco**, calculado antes de publicar. Nada se compone en el navegador con transparencias apiladas, porque entonces el contraste depende de qué haya atrás.
- Los neutrales **se tiñen hacia el color de la marca**: OKLCH con el tono de la marca y croma distinto de 0. Un gris de croma 0 es "no lo pensé".
- Los escalones se dan en **OKLCH**, no en HSL: en OKLCH un mismo paso se ve igual de grande en todos los colores.

### 1.2 Texto: tres pasos

| Token | Rol | Piso |
|---|---|---|
| `--sys-texto-1` | cifras, nombres, títulos, valores | — |
| `--sys-texto-2` | líneas secundarias, ayudas, etiquetas | ≥ 4,5:1 en todos los niveles |
| `--sys-texto-3` | placeholders, palabras deshabilitadas | ≥ 4,5:1 en todos los niveles (es el piso; el gris apagado que el usuario cree que no ve bien es el error más caro) |

### 1.3 La familia de la marca (unas 7 variables por color)

`--sys-marca` · `--sys-marca-hover` · `--sys-marca-activo` (apretado) · `--sys-marca-texto` (lo que se escribe encima) · `--sys-marca-suave` y `--sys-marca-suave-2` (fondos tenues, opacos) · `--sys-marca-borde` · `--sys-foco` (el anillo de foco, **uno solo para todos los controles**: `2px solid` y `2px` de separación).

### 1.4 Estados: una escala aparte que la marca nunca toca

`--sys-ok` · `--sys-warn` · `--sys-danger` · `--sys-info`, cada uno con su texto, su fondo tenue opaco (`-bg`), su borde (`-borde`) y su versión sólida (`-solido`).

- **Identidad ≠ estado** (`02` A §3.2). Aunque la marca sea roja, el error sigue siendo el rojo de error y se distingue de la marca.
- **Un estado nunca es solo color**: lleva una palabra o un trazo (tilde, cruz, signo de exclamación, i).
- Cada combinación de texto de estado sobre cada nivel se mide. Una que no pasa queda prohibida y escrita (por ejemplo: "el texto de error nunca va sobre `capa-3`").

### 1.5 Escalas fijas

```
tipo:    xs .75rem · s .8125 · m .875 · l 1rem · xl 1.25 · 2xl 1.5 · 3xl 2 · 4xl 2.75   (razón ~1,2)
espacio: 1 .25rem · 2 .5 · 3 .75 · 4 1rem · 5 1.25 · 6 1.5 · 7 2 · 8 2.5 · 9 3.5
radio:   s 8px (controles, botones) · m 12px (menús, avisos) · l 16px (tarjetas) · xl 20px (diálogos) · full 999px (solo etiquetas)
toque:   2.75rem (44 px de alto mínimo para todo lo que se toca)
```

- **En `rem` fijos, nunca fluidos con `clamp()`**: un panel se mira siempre en la misma pantalla a la misma distancia (`02` A §4.3).
- **12 px es el piso** de cualquier texto. Los campos y botones van en 16 px (en iPhone, un campo de menos de 16 px hace zoom al tocarlo).
- Pesos 400 / 600 / 700. El 900 grita a 12 px.
- **Una sola familia tipográfica**, con cifras tabulares de verdad (`1111` y `0000` ocupan lo mismo). Todo número va con `font-variant-numeric: tabular-nums`.
- Interletrado `0.08em` en etiquetas cortas en mayúscula, `-0.01em` desde xl, `0` en el texto común. Interlineado 1,5 el texto, 1,2 los títulos, 1,1 las cifras grandes.
- **Las fuentes viven en el repo**, nunca en un CDN, con `font-display: swap`, un respaldo ajustado de tamaño y un `preload` del archivo principal.

### 1.6 Contenedores, no ventanas

- Los componentes se adaptan con `@container` al espacio que **ellos** tienen, no con `@media` al ancho de la ventana.
- Las únicas dos `@media` aceptadas: la estructural (la barra lateral que en el teléfono se abre encima) y la de capacidad `(hover: hover) and (pointer: fine)`, que decide si hay hover de verdad.

## 2. Dos temas, los dos de primera

Si el lugar de uso tiene luz de día y penumbra, el tema claro y el oscuro son los dos de primera clase (`02` A §1). Cada token tiene su valor en cada tema, y cada par se mide en los dos. Si se arranca con uno solo, queda como `OQ-` explícito.

## 3. El contraste se mide, y se mide bien

**Piso: 4,5:1 para todo texto, 3:1 para contornos de controles y texto grande.** Un par que no está medido no se dibuja.

**Cómo medir en el navegador:**

1. **No uses `canvas` para convertir colores**: `ctx.fillStyle` rechaza en silencio lo que no entiende (por ejemplo `lab()`) y se queda con el color anterior. Un texto blanco puede medir 1,00:1 y parecer una medición real. Usá el motor de CSS: `el.style.color = 'rgb(from <color> r g b / alpha)'` y leé `getComputedStyle(el).color`, que devuelve `color(srgb …)` para cualquier espacio de color.
2. **Componé cada capa translúcida sobre la de atrás, empezando por el fondo del propio elemento.** Las cuatro formas de medir mal que ya pasaron:
   - componer un fondo con transparencia **sobre blanco** en vez de sobre lo que tiene debajo;
   - `getComputedStyle().backgroundColor` ignora `background-image` (un degradado);
   - recorrer solo los padres y olvidar el fondo del elemento mismo;
   - componer una sola de dos atenuaciones que se multiplican (un color con alpha **y** un `opacity` encima).
3. **Los números de la documentación salen de los valores hex que se publican**, no de cuentas con decimales: la diferencia puede ser de 0,06 y hace que un par "pase" en el papel y no en la pantalla.
4. **Un bloque atenuado mientras carga** baja todos sus textos: con `opacity: .6` un texto secundario cae debajo del piso. Atenuar a `.8` como máximo, y medirlo.

## 4. Vetos visuales (no vuelven)

- La plantilla SaaS genérica: Inter o Geist, grises de Tailwind, todo centrado, `rounded-2xl` en todo, grilla de 3 columnas con ícono + título + texto.
- Monoespaciada como voz principal (solo para cadenas que alguien copia carácter por carácter: una contraseña inicial, códigos de respaldo).
- Todo blanco y negro sin nada animado.
- Raya de color al costado de una tarjeta como acento.
- Texto con degradé. Tramas `repeating-*` de fondo.
- Borde y sombra difusa en el mismo elemento: uno o el otro.
- Efectos de adorno: border beam, spotlight, máscaras de entrada.
- **Vidrio iluminado**: si se usa "glass", es vidrio esmerilado con poca luz, no brillante.
- Elevar con sombra o con `translateY` al pasar el mouse: la elevación se hace con niveles (`capa` → `capa-2`).
- **La raya larga (—) en los textos de pantalla.** Coma, dos puntos, punto o paréntesis.
- Casillas de un checklist tachadas o subrayadas al marcarse.
- Etiquetas de estado como "pastilla amarilla" genérica: mostrar opciones antes (una palabra con su punto de color funcionó bien).

## 5. Estados de cada bloque

Todo bloque que lee datos tiene los cuatro, diseñados desde el primer plan:

| Estado | Cómo se ve |
|---|---|
| Cargando | Skeleton **quieto** (sin brillo que corre, sin pulso), de la altura final, así nada salta al llegar los datos |
| Vacío, primera vez | Ícono y frase centrados, sin recuadro punteado, con la acción para crear lo primero ("Todavía no hay usuarios" + `Nuevo usuario`) |
| Vacío, sin resultados | La frase del filtro y la acción para ampliarlo o limpiarlo |
| Error | Qué revisar, en orden de probabilidad, y `Reintentar`. Los otros bloques siguen funcionando |

Texto de error común sugerido: *"No se pudieron cargar los datos. Revisá la conexión y probá de nuevo; si sigue igual, avisale al administrador."*

## 6. Textos

- Escritos para la persona que usa la pantalla, en sus palabras. Cero jerga, cero siglas sin explicar, cero nombres de herramientas que no conoce.
- **Los mensajes dicen qué hacer**, no qué falló por dentro. Nunca se muestra a una persona el mensaje técnico de un error (`sin-permiso`, `23505`, un stack).
- **La pantalla dice qué va a pasar antes de guardar** cuando la acción no se puede deshacer.
- Nunca mentir sobre el estado: si algo no va a funcionar, se dice en ámbar. Jamás "todo en orden" cuando no lo está.
- Todos los textos de la interfaz en archivos de idioma por módulo (`i18n/es/<modulo>.ts`), sin un archivo índice que los reúna todos (eso los cargaría juntos en cada pantalla).

## 7. Trampas de CSS que ya costaron un error

| Trampa | Qué pasa | Qué hacer |
|---|---|---|
| `outline-none` de Tailwind 4 | Pone `outline-style: none`; un `focus-visible:outline-2` posterior solo cambia el ancho y el anillo nunca se dibuja | No usar `outline-none` en controles, o declarar también el estilo |
| El preflight de Tailwind pone `margin: 0` a todo | Un `<dialog>` modal se centra con `margin: auto`: abre pegado arriba a la izquierda, sin error | Devolverle `margin: auto` al diálogo |
| El preflight pinta los placeholders con el 50 % del color del campo | En un campo de color de marca, el placeholder cae del piso de contraste | Color de placeholder explícito desde los tokens |
| Clases cortas o genéricas (`.p`, `.barra`, `.campo-etiqueta`) | Chocan con otra regla que ya existía; no falla nada, se ve mal | Buscar con grep antes de crear una clase; prefijo por módulo |
| `@layer` declarado después de `@import "tailwindcss"` | Las capas propias quedan por encima de las utilidades | La línea `@layer` va primera, antes del import |
| Reglas movidas de una capa a otra | Dejan de ganar por capa y ganan solo por especificidad | Revisar qué reglas pisaban a cuáles |
| Texto solo para lectores de pantalla (`position: absolute`) dentro de una caja con scroll horizontal | Ensancha toda la página en el teléfono | `position: relative` en la caja que scrollea |
| `<fieldset>` y pistas de grilla `auto` | No se achican por debajo de su contenido más ancho; a 375 px se cortan | `min-inline-size: 0`, columnas declaradas |
| Una `<legend>` dentro de un `fieldset` con borde | Corta el borde de arriba | Título propio, no `legend`, si el bloque tiene borde |
| `order` en una grilla | Cambia también el orden de pintado, no solo el lugar | `z-index` explícito si hay superposición |
| Hoja de estilos sin `Cache-Control` | El navegador pinta el HTML nuevo con la hoja vieja | Nombres con hash o caché correcta |
