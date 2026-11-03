# 04 — Íconos: de dónde salen y cómo se usan

El pedido de origen: *"No podés poner un ícono de una X insulsa cuando hay montones de íconos con animaciones que son realmente atractivos, que hacen entender de qué trata esa parte."*

## 1. De dónde salen

| Fuente | Para qué | Cómo |
|---|---|---|
| **Lordicon** (`lordicon.com/icons`, set gratuito) | Íconos **animados** de cada página de la barra lateral, de acciones importantes y de la tarjeta de resultado | Archivos `.json` descargados al repo (`public/lordicon/`), dibujados con el elemento `<lord-icon>` del paquete `@lordicon/element`. **La licencia gratuita pide el crédito**: va al pie de una pantalla de administración |
| **lucide-react** (`lucide.dev/icons`) | Íconos utilitarios chicos, de 16 a 20 px: chevrons de listas, cerrar un aviso, ordenar una columna | Componente React, `strokeWidth` uniforme en todo el sistema |
| **Íconos dibujados propios** (SVG de trazo) | Acciones de fila, filtros, campos de formulario, cuando ningún set tiene el dibujo o hace falta que se "escriba" | SVG con trazos (`stroke`), animados con GSAP **DrawSVG** (gratis desde 2025) al entrar el mouse o al cambiar de estado |
| Sets animados hechos con Framer Motion | Inspiración | Se rehacen con GSAP o CSS: Framer Motion no entra al proyecto |

**Antes de sumar un set nuevo:** abrir su página, leer la licencia, mirar el peso de cada archivo y si se puede recolorear. Queda como `D-` en `docs/MEMORY.md`.

## 2. Reglas de uso

1. **Cada página tiene su ícono propio**, que corresponde a lo que hay adentro y tiene coherencia con los demás (mismo estilo de trazo, mismo peso visual). Nunca un ícono compartido por varias páginas.
2. **Los íconos se animan** al pasar el mouse, al tocar o al cambiar de estado. **Si uno de un tipo se anima, todos los de ese tipo también**: un ícono quieto al lado de otros vivos se lee como un error.
3. **Lo que aparece anima lo que contiene**: cuando se abre un grupo de la barra, sus íconos se animan en cascada.
4. **Se recolorean a la marca.** Nunca el color de fábrica de un set, nunca el verde de WhatsApp: el ícono de WhatsApp se dibuja como los demás íconos del sistema.
5. **Un ícono solo nunca es el único que dice algo**: un botón de solo ícono lleva su nombre accesible (`aria-label`) y un tooltip diseñado; un estado lleva su palabra.
6. **Rechazados por nombre**: la ✕ quieta como acción de fila, el disquete para "guardar", un ícono de Excel que "parece una calculadora", iniciales sueltas ("HC") o un círculo sin significado como acción.
7. **Tamaños en la escala**: 16, 20 y 24 px; los de página y de resultado más grandes. Más grandes que lo que pondría una plantilla.

## 3. Cómo se cargan sin costo

- El reproductor de Lordicon (`@lordicon/element`, que trae su motor Lottie) se carga **una sola vez, después de que la pantalla está dibujada**, y solo si hay un ícono de Lordicon en ella:

```ts
// lib/lordicon.ts
"use client"
let listo: Promise<void> | null = null
export const cargarLordicon = () =>
  (listo ??= import("@lordicon/element").then((m) => {
    if (!customElements.get("lord-icon")) m.defineElement()
  }))
```

- Los SVG dibujados viven en el código (sin pedido de red) y GSAP se registra una vez en `lib/gsap.ts` con sus plugins.

## 4. Trampas que ya costaron un error

| Trampa | Qué pasa | Qué hacer |
|---|---|---|
| Lordicon descargado con una animación `in-*` | Arranca desde un cuadro vacío: en reposo no dibuja nada (se ve un punto) | Al montarlo, llevarlo al último cuadro; o descargar la variante que arranca dibujada |
| Lordicon pinta cada capa desde `--lord-icon-<capa>` | La clase `current-color` pinta todas las capas de un solo color | Recolorear capa por capa con esas variables CSS |
| Lordicon dibujado chico | Su trazo, pensado para un lienzo de 430, queda en 0,5 px a 16–20 px y el antialias le come el color (se ve gris) | Fijar el grosor de línea en su shadow root, proporcional al tamaño (`1.6 × 430 / tamaño` px funcionó) |
| Un ícono oculto con `display: none` (la versión de teléfono de una etiqueta) | GSAP animando un SVG oculto recalcula los estilos de toda la página | Animar solo lo que está dibujado: comprobar que el ícono se ve antes de reproducir |
| DrawSVG en `"0% 0%"` con puntas redondeadas | Igual pinta un punto (un trazo de largo cero con punta redonda se dibuja) | Ocultar con `opacity` o `visibility` además del trazo |
| Un `<g>` dentro de un ícono que otro componente anima por `svg > *` | El grupo se anima entero o no se anima | Trazos directos bajo el `<svg>`, sin `<g>` |
| SVG con solo `viewBox`, sin `width`/`height` | No tiene tamaño propio: Firefox no lo dibuja en un canvas y Chrome lo hace de 300 × 150 | Dar `width` y `height` al cargarlo |

## 5. Animación de un ícono (valores de referencia)

- Al entrar el mouse: el trazo se escribe (DrawSVG) en 0,3 a 0,65 s según el dibujo, `power3.out`, interrumpible (`overwrite: "auto"`).
- Con movimiento reducido: el ícono aparece ya dibujado, sin movimiento.
- Se reproduce desde lo que lo dispara (el botón, la opción de un filtro, la fila de la tabla, el campo), no solo desde el SVG.
