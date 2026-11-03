# 08 — Movimiento y GSAP

**El movimiento comunica estado; no decora.** Pero un sistema quieto se lee como "insulso": la vara es *"fluidez"* con *"ese diferencial de las cosas"*, sin exceso que cueste rendimiento. Para el detalle técnico de GSAP, la skill `motion-web-senior` (y `gsap-scrolltrigger` para scroll).

## 1. Herramientas

| Qué | Con qué |
|---|---|
| Hover, apretado, foco, cambios de color, entrada de un menú o un diálogo | **CSS** (`transition`, `@starting-style`) |
| La entrada en cascada de una pantalla o una tabla | **CSS** (`@keyframes` bajo una clase de llegada) |
| Íconos que se escriben, la tarjeta de resultado, paneles, el tooltip, el botón líquido, Flip al filtrar, arrastrar tarjetas | **GSAP** + `@gsap/react` |
| Cargadores de ruta (`loading.tsx`) | **Solo CSS** (un efecto de JS ahí no corre en una carga completa) |
| **Framer Motion** | **No.** Una referencia hecha con Framer Motion se rehace con GSAP o CSS |

GSAP es gratis entero, con todos sus plugins (DrawSVG, Flip, SplitText, MorphSVG). Se registra **una vez** en `lib/gsap.ts`, que también exporta `quieto()` (verdadero con movimiento reducido):

```ts
// lib/gsap.ts
"use client"
import { gsap } from "gsap"
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"
import { Flip } from "gsap/Flip"
gsap.registerPlugin(DrawSVGPlugin, Flip)
export const quieto = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
export { gsap, Flip }
```

En React, siempre `useGSAP(() => { … }, { scope })`, y los manejadores de eventos con `contextSafe`: se limpia solo al desmontar. GSAP con un `useEffect` a mano es un olor a error.

## 2. Las reglas que más importan

1. **Lo que se refresca solo no se vuelve a animar.** Un refresco automático compara con lo último que llegó: si no cambió nada, no toca el DOM; si cambió, redibuja **sin transición**. Las cosas se animan cuando alguien hace algo.
2. **La entrada de una pantalla se hace una vez**: CSS bajo una clase de llegada (`.llega`) que se saca a los ~2 s. Así arranca desde el primer cuadro, no parpadea al recargar y no se repite con cada cambio.
3. **Después de confirmar, no se recarga la página**: se reemplaza en el lugar lo que cambió.
4. **"Menos movimiento" nunca es "menos información"**: con `prefers-reduced-motion` se apaga el movimiento, pero los mensajes llegan, los estados finales se ven, y las tarjetas que se van solas las saca un reloj.
5. **Lo que aparece anima lo que contiene** (los íconos de un grupo que se abre, en cascada).
6. **Nombrar el momento antes de tocar**: el mismo elemento se mueve al cargar, al cambiar de estado, con el hover y con el scroll. "Más rápido" sobre un elemento puede referirse a cualquiera; se pregunta cuál.

## 3. Valores del sistema

```
duraciones: 150 ms (d1) · 220 ms (d2) · 320 ms (d3)
curva:      cubic-bezier(.25, 1, .5, 1)      ← ease-out-quart
```

- Son tokens (`--sys-dur-1/2/3`, `--sys-ease`). Un `ms` o un `cubic-bezier` sueltos en una hoja de estilos de un módulo son un error.
- Sin rebote ni elástico. Nada entra desde escala 0: el piso es 0,97 (la tarjeta de formulario, elegida con referencias, es la excepción documentada).
- Con movimiento reducido: d2 y d3 pasan a 0, y **d1 se queda** para los fundidos de opacidad.

| Frecuencia | Ejemplos | Movimiento |
|---|---|---|
| Teclado o repetido todo el día | `Ctrl+K`, foco, pestañas segmentadas que se usan todo el día | **Ninguno**: aparece al instante |
| Frecuente | Hover de botones, filas y tarjetas; menús | Casi imperceptible: d1 |
| Ocasional | Diálogos, paneles, avisos, un gráfico al cambiar de período | d2 al entrar, d1 al salir; d3 para barras y líneas |
| Raro | Un momento especial por sistema | Puede gastar más (~1 s con GSAP) |

## 4. Cómo se escribe

1. `transition` nombra sus propiedades. `transition: all` es un error.
2. Solo se animan `transform`, `opacity` y colores. Nunca `width`, `height`, `top`, `left`, `margin`, `box-shadow` ni `filter`. Dos excepciones aceptadas: un acordeón con `grid-template-rows: 0fr → 1fr`, y el trazo de un SVG (`stroke-dashoffset` / DrawSVG).
3. **Lo que anima GSAP no lleva `transition` de CSS**: las dos peleando dan un resultado que no es ninguno.
4. Hover bajo `@media (hover: hover) and (pointer: fine)`. El apretado, afuera.
5. Las entradas de elementos de la capa superior (`<dialog>`, menús, avisos) usan `@starting-style`; las salidas `transition-behavior: allow-discrete` sobre `display` y `overlay`.
6. Para un cambio de estado que el usuario dispara, **transición declarada en el estado destino, no un `@keyframes`**: un keyframe en `:checked` se reproduce otra vez en cada casilla que se dibuja ya marcada.
7. Un `@keyframes` de llegada se rellena solo hacia atrás (`animation-fill-mode: backwards`): con `both` o `forwards` retiene el valor para siempre y un cambio posterior salta en vez de transicionar.
8. Interrumpible: `overwrite: "auto"` en GSAP y `clearProps` al terminar.
9. **El valor inicial se fija antes del cambio de estado**, y recién ahí se anima. Medir la altura después de que React ya abrió algo hace que GSAP anime de abierto a abierto: salta de golpe.
10. Nada se monta ni se mide mientras corre una animación de entrada que maneja el hilo principal.
11. `clip-path` con GSAP: los dos extremos con la misma estructura de números (`inset(… round …)` en los dos).
12. Un elemento oculto con `display: none` no se anima.

## 5. "Fluido" se mide

- **Toda animación que cambia tamaño o posición se muestrea cuadro por cuadro** (`requestAnimationFrame`, leyendo la altura o la posición en cada cuadro) antes de mandarla a revisar. Un valor que pasa del inicio al final en un solo cuadro es un defecto, aunque la captura se vea bien. Se reportan los números (por ejemplo `0 47 109 … 420`).
- Trampas al medir:
  - un panel de navegador oculto congela `requestAnimationFrame` y GSAP no interpola: medir en Chromium headless (Playwright);
  - una captura de pantalla mientras se muestrea traba `requestAnimationFrame` (aparecen huecos de 100 ms que la animación no tiene);
  - una animación CSS en el compositor, muestreada con `getComputedStyle`, reporta saltos que nunca se ven: verificarla con la traza de rendimiento de Chrome;
  - en un navegador headless las animaciones pueden no avanzar: terminarlas a mano antes de medir colores.
- Al reportar: en qué momento de la animación se cambió algo y con qué valores, para que se pueda desmentir mirando.

## 6. Valores de referencia (elegidos con referencias reales en el proyecto anterior)

| Elemento | Movimiento |
|---|---|
| Entrada de pantalla | Título, secciones, botones, tarjetas y cifras en cascada desde el primer cuadro, en CSS, ~1,5 s en total |
| Tabla | `07` §2 |
| Botón líquido | `05` §1 |
| Etiqueta de campo | Sube al borde con el foco, 0,32 s; el ícono se escribe en 0,32 s |
| Tooltip | `05` §6 |
| Tarjeta de resultado | `05` §5 |
| Grupo de la barra lateral | Se abre al pasar el mouse con 120 ms de reposo; sus íconos en cascada |
| Arrastrar una tarjeta (tablero) | Se levanta en 0,2 s (escala 1,05, 3° de giro, sombra); la copia sigue al puntero sin suavizado; las vecinas se corren en 0,2 s; al soltar se desliza a su lugar en 0,25 s. El movimiento es optimista |
| Gráfico | Las barras crecen y la línea se dibuja al entrar y al cambiar de período; nunca en un refresco |
| Entre páginas | Una transición que fluya; si hay espera, una animación de carga con un mensaje |

## 7. Lo que nunca se anima

- Lo que trae un refresco automático.
- Una cifra que cambia por un refresco (cambia, no rueda).
- La búsqueda rápida, el anillo de foco, un cambio de pestaña con teclado.
- Los skeletons (quietos) y los vacíos.
- Un texto que cambia de estado por sus palabras: cambia al instante.
- Nada en bucle infinito en un panel que se mira todo el día.
