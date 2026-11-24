# Tablero

El tablero de trabajo: cuatro listas (Dudas, Servicios, Tareas, Correcciones) con tarjetas que se arrastran o se mueven con un menú, una ficha con la conversación tipo chat y un alta de tarjeta por pasos.

## Sub-features

- `tablero-carga` abre con las cuatro listas y las cifras por lista.
- `tablero-ficha` click o Enter en una tarjeta abre su ficha con la conversación.
- `tablero-mover` el botón «Mover … a otra lista» cambia la tarjeta de lista.
- `tablero-alta` alta por pasos con preguntas propias de cada lista.
- `tablero-mensaje` escribir y mandar un mensaje en la conversación.

## How to get to it (user POV)

- Barra lateral → Tablero.
- Inicio → «Ver el tablero» o una fila de Urgente.

## Driving it with recorrer.mjs

Preconditions:

- Estado de partida del índice; la semilla carga 6 tarjetas (solo si el tablero estaba vacío), una duda con dos mensajes.

- **Carga.** `recorrer.mjs --rutas /tablero`. Cuatro `section.tb-lista[data-lista]` visibles; `ok` a los cinco anchos.
- **Ficha.** `recorrer.mjs --rutas /tablero --abrir "article.tb-tarjeta" --abierto ".tb-conv" --cerrar-esc`. Abre `true`, Esc `true`.
- **Mensaje (escribe).** Script propio: abrir la primera tarjeta, escribir en la caja de la conversación, click en `button[aria-label="Mandar mensaje"]`; el mensaje aparece en `.tb-conv` y existe la fila en `comentarios` de la base local. Al terminar, borrar ese comentario.
- **Proof.** Capturas cerrada y con la ficha abierta, e `informe.json`.

## Gotchas

- En el celular las listas corren de costado: el texto fuera de la pantalla (contenedor con `overflow-x: auto`) se mide contra su caja: no cuenta como salto. Probado el 2026-11-23: 0 a los cinco anchos.
- Cada lista muestra hasta 200 tarjetas; con más, aparece el aviso al pie.
