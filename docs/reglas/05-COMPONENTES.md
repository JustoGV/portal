# 05 — Componentes

Un componente por función, construido una vez en `components/ui/` y usado en todo el sistema. Si una pantalla necesita una variante, se agrega al componente, no se copia. **Cada pantalla nueva se arma con estos componentes**: así todo se lee como un solo sistema.

## 0. Reglas para todos

- Todo control interactivo tiene siete estados: `normal · hover · foco visible · apretado · deshabilitado · cargando · error`, y sale con los siete.
- El foco es el mismo anillo en todos (`--sys-foco`).
- El hover es un paso de nivel o de borde, nunca solo un cambio de color. El hover vive bajo `@media (hover: hover) and (pointer: fine)`; en touch hay estado apretado.
- El estado apretado responde al bajar el dedo o el botón del mouse (`:active`), no al soltar.
- Deshabilitado: `--sys-texto-3`, sin cambio de nivel, `cursor: not-allowed`.
- Cargando: el texto cambia por "Guardando…" / "Armando PDF…" y el control se atenúa; sin spinner.
- Todo lo que se toca mide al menos 44 px de alto (o tiene un área de toque de 44 px).

## 1. Botones

- **Una sola familia.** Tipos: `primaria` (relleno de marca; **una sola por vista**), `secundaria` (borde visible, fondo transparente), `peligro` (anular, eliminar), `sutil` (sin borde, para acciones de fila). Acciones distintas se ven distintas.
- **Una forma** (radio `s`, 8 px) y **un tamaño de letra** (16 px, peso 600). Las etiquetas son píldoras; los botones no, para que nunca se confundan.
- **Borde visible y contraste** contra lo que tienen atrás. Un botón del mismo color que el formulario fue un error real.
- **Efecto al pasar el mouse** (el elegido por Mateo, inspirado en el "Liquid Button" de Animate UI, hecho con GSAP):
  1. una línea de 3 px entra por abajo, de izquierda a derecha (0,3 s);
  2. el color sube y llena el botón (0,3 s), y el texto cambia de color;
  3. al salir se invierte. Escala 1,05 con el mouse encima y 0,95 al apretar.
  Hecho sobre `transform` (`scaleX`/`scaleY` de capas internas), interrumpible, con movimiento reducido (sin movimiento, cambio de color directo) y, en el teléfono, el relleno al tocar.
- **Ícono animado** a la izquierda del texto cuando ayuda a reconocer la acción (`04-ICONOS.md`).
- **Botón de solo ícono** (`IconButton`): nombre accesible obligatorio, tooltip diseñado, el mismo tipo y estados que un botón.
- Un botón al lado de un campo queda **a la altura del campo**: un campo con etiqueta flotante reserva espacio arriba y abajo, así que se alinea al control, no al bloque.

## 2. Campos (`Field`)

- Estructura: etiqueta + control + línea de ayuda + **línea de error siempre reservada** (con la altura de una línea, aunque esté vacía, para que nada salte cuando aparece un error).
- **Etiqueta flotante** (el "Animated Input" de SmoothUI fue el elegido): con el campo vacío la etiqueta está adentro; al tomar el foco sube al borde superior y se achica (`transform`, 0,32 s), y el ícono del campo se escribe solo (DrawSVG, 0,32 s). Un formulario que abre con datos se dibuja con las etiquetas arriba y los íconos ya dibujados.
- La ayuda se conecta con `aria-describedby`; el error marca `aria-invalid` y el borde en `--sys-danger`.
- Las reglas de cada campo (contador, línea que se llena, tilde, bloqueo del exceso) están en `06-FORMULARIOS.md`.

## 3. Controles propios: nunca los del navegador

Select, combobox (select con búsqueda), checkbox, radio, switch y **selector de fecha**, con `react-aria-components`: mismo teclado, mismos valores y mismos datos de formulario que los nativos, pero diseñados.

**Trampas de React Aria que ya rompieron algo:**

| Trampa | Qué pasa | Qué hacer |
|---|---|---|
| `Select` lee sus `<option>`/`<optgroup>` de los hijos **sin dibujarlos** | Opciones devueltas por un componente propio adentro del `Select` no aparecen: la lista queda vacía | Escribir las opciones en el lugar o devolverlas con una llamada a función (`{opciones(lista)}`), nunca `<MisOpciones />` |
| Un popover (lista, calendario) fuera de un `<dialog>` modal abierto | Se ve pero no se puede tocar: el click cae en el diálogo | Mover la capa del popover adentro del diálogo abierto mientras se muestra |
| `boundaryElement` apuntando al `<dialog>` | Ubica mal el popover | No usar el diálogo como límite |
| El alto del popover | React Aria lo escribe en línea y le gana a la hoja de estilos | Pasarlo por sus props, no por CSS |
| El campo de fecha | Cada dígito tecleado forma una fecha válida ("0002", "0020"…) y se queda con Enter | Validar al salir o al completar; manejar Enter a mano para avanzar de campo |

## 4. Formularios en tarjeta (`Dialog`, variante tarjeta)

- **Todo alta y toda edición se abre en una tarjeta centrada**, detrás de un botón que dice qué hay adentro. No hay formularios fijos en la página, ni cajones laterales nuevos, ni páginas de formulario.
- La tarjeta entra creciendo desde la mitad de su tamaño y 40 px más abajo, y sale achicándose al 80 %, sin inclinación. Es bloqueante (el fondo queda inerte).
- **Un formulario largo se ensancha** y acomoda sus campos en menos filas antes que scrollear.
- **Rápida de verdad**: la tarjeta y sus campos se montan mientras la pantalla está en reposo (como transición de baja prioridad) y **se reinician al cerrar, nunca se vuelven a montar con el click**. Montar campos pesados en el render del click costó 1,4 s de respuesta con CPU lenta.
- **Nada se monta ni se mide mientras la tarjeta está entrando**: la animación es un `transform` que maneja el hilo principal, y cualquier trabajo pesado en el medio la traba.
- Los valores de la salida se limpian **al abrir la próxima vez**, no al cerrar: un `<dialog>` cerrado se sigue pintando durante su transición de salida, y limpiar antes lo hace parpadear entero.
- **Guardia al cerrar con cambios**: si el formulario tiene cambios sin guardar, cerrar (Escape, la ✕, el fondo) pregunta antes.
- El foco entra al primer campo al abrir y vuelve al botón que la abrió al cerrar. Escape cierra.
- En vez de `confirm()` o `prompt()` nativos: un diálogo de confirmación propio (`useConfirmar`) con el texto de lo que va a pasar.

## 5. Tarjeta de resultado y avisos

- **Después de crear, guardar o generar**: tarjeta centrada con animación (GSAP) y un ícono animado por resultado:
  - **guardado**: el aro se dibuja y entra el tilde;
  - **no se guardó**: el ícono gira y entra la cruz;
  - **dato mal**: el signo de exclamación se balancea;
  - **PDF generado**: el aro, la hoja, el doblez y la flecha que baja.
  La tarjeta entra en 0,3 s desde un poco más arriba. Una línea de 3 px al pie muestra el tiempo que le queda (3 s).
- **Lo que salió bien se va solo. Un error espera un "Entendido"** y se lleva el foco; al cerrarse, el foco vuelve a donde estaba.
- **Uno a la vez**: el nuevo reemplaza al anterior, nunca se apilan.
- Los **avisos pasivos** (no son el resultado de una acción) van como un aviso chico abajo a la derecha, con las mismas reglas: uno a la vez, un solo nodo que cambia su texto (no uno nuevo por aviso, que repite la entrada).
- **Después de confirmar algo no se recarga la página**: el bloque pide lo que cambió y lo reemplaza en el lugar.
- Con movimiento reducido la tarjeta aparece quieta, con el ícono ya dibujado, y la saca el reloj.

## 6. Tooltip (`Pista`)

- Diseñado, nunca el `title` del navegador. Explica en pocas palabras qué hace el botón.
- Abre después de 350 ms de reposo del mouse. Si otro se cerró hace menos de 300 ms, el siguiente abre sin esperar. **Nunca dos a la vez**: el que abre termina al que se está yendo.
- Entra enfocándose: `opacity` 0 → 1, escala 0,95 → 1, 8 px hacia su botón y desenfoque de 4 px → 0, en 0,15 s, desde la punta de su flecha. Sale al revés en 0,1 s. Un click o un scroll lo cierran al instante.

## 7. Tablas, filtros y paginación

En `07-TABLAS-PAGINACION-FILTROS.md`.

## 8. Etiquetas de estado (`Badge`)

- La palabra del estado más un punto de color. Nunca solo color.
- Píldora (`radio full`): es lo único redondo, para que no se confunda con un botón.
- La elegida por Mateo tenía movimiento propio (el "Halo Badge" de Cult UI): un brillo que corre por el borde y un punto que late, **una vez** al entrar su fila y cada vez que el mouse entra en la fila. Nunca en bucle infinito: lo que parpadea todo el día está prohibido.

## 9. Tarjetas (`Card`)

- Niveles 1, 2 y 3 (la tarjeta de nivel 3 no lleva borde: en ese nivel el borde no se ve). Sin raya de color al costado, sin borde y sombra juntos.
- **Una sola tarjeta de color sólido por pantalla**, la del dato más importante; adentro solo texto en el color de texto puro, etiquetas con borde, botones con borde y divisores de 1 px.

## 10. Cifras que cambian (`Cifra`)

Un número que cambia (un total, un saldo) se anima por columna de dígito con una transición CSS, y lo pinta el servidor en su lugar. Cifras tabulares siempre. En un refresco automático no rueda: cambia.

## 11. Pestañas y filtros segmentados

- `linea`: la pestaña actual con una línea de 2 px del color de marca debajo; la línea se desliza con un click (no con teclado). `segmentos`: una pista con el segmento actual elevado.
- Teclado: flechas para moverse, Home/End; activación manual (Enter) en un grupo que cambia un formulario, para que una flecha no tire lo escrito.
- Cuando una pestaña elegida debe tener su propio color, el relleno toma ese color.

## 12. Barra lateral

Descrita en `02` B2. Notas de construcción:
- La altura de un grupo que se despliega se fija en línea **antes** del cambio de estado y recién ahí se anima. Medirla después de que React ya lo abrió hizo que saltara de cerrado a abierto en un cuadro ("parece tildado").
- La barra colapsada se abre tocándola en cualquier parte: un control nuevo dentro de la barra colapsada queda tapado por ese toque.

## 13. Skeleton y vacío

- Skeleton quieto, de la altura final.
- Vacío centrado con ícono y frase, sin recuadro punteado.
- El cargador de una ruta (`loading.tsx`) se anima **solo con CSS**: en una carga completa, React no hidrata el fallback que se está mostrando y un efecto de JavaScript ahí nunca corre. Un "Abriendo…" que no se mueve fue un error real.

## 14. Búsqueda rápida (`Ctrl+K`)

Abre y cierra al instante (es una acción de teclado de todos los días: no se anima). Los resultados cambian mientras se escribe.
