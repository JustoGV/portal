# 07 — Tablas, paginación, filtros, búsqueda y exportes

Las listas son el corazón de un sistema interno: tienen que leerse bien con diez filas y seguir rápidas con cien mil.

## 1. Cómo se ve una tabla

- **Se nota que es una tabla**: caja con borde visible y radio de tarjeta. *"Parece que no tiene borde… se tiene que notar el componente de tabla, si no parece feo y no se entiende cada columna."*
- **La cabecera va en otro color** que las filas, en mayúscula chica (12 px, `0.08em`), con una línea más fuerte debajo, y queda fija arriba al scrollear (`position: sticky`) dentro de su caja.
- **Cada columna centrada**: el título y su contenido (texto, fecha, número, monto). Una celda con grilla o flex también centra su contenido. Solo la columna de acciones, sin título, va a la derecha.
- **Filas y columnas que usan el ancho**. Nada de dos datos apilados en una columna a la izquierda de una pantalla grande.
- **Acciones de fila como íconos claros y animados** (editar, ver, eliminar), cada uno con su tooltip. Nunca una ✕ suelta ni iniciales.
- Fila con el mouse encima: un paso de nivel (`capa-2`). Números y fechas con cifras tabulares.
- La caja de la tabla es enfocable y scrollea con las flechas (`role="region"`, `tabIndex=0`, `aria-label`), con `<caption>` para lectores de pantalla y `scope="col"` en la cabecera.
- **En el teléfono, menos columnas, no las mismas apretadas**: cada columna tiene prioridad 1, 2 o 3 y se muestran según el ancho del contenedor (`@container`). Una tabla de puras cifras puede scrollear de costado dentro de su caja, con un desvanecido en el borde.
- Una tabla nunca va angosta al costado de un formulario: va abajo, a todo el ancho.

## 2. La entrada en cascada

- Al montarse la tabla: la caja pasa de `opacity` 0 a 1 y de escala 0,98 a 1 en 0,4 s; cada fila sube 20 px y aparece en 0,5 s, una detrás de otra con un paso de `min(0,25 s, 1 s ÷ (n − 1))` sobre las primeras 15 filas. Todo dura 1,5 s como máximo.
- Animaciones CSS sobre `transform` y `opacity` (van en el compositor, no traban).
- **Una vez por tabla montada**: al entrar a la pantalla y al cambiar de filtro. **Nunca en un refresco automático, una búsqueda o un guardado.** Si una lista tiene que repetir la entrada, se remonta con otra `key` (otro filtro), nunca por cada letra de una búsqueda: remontar con la primera tecla redibujó 300 filas.
- Las etiquetas de estado de cada fila terminan su animación dentro de esos 1,8 s.
- Con movimiento reducido, las filas aparecen sin movimiento.

## 3. Paginación

- **En el servidor, siempre.** Nunca se trae una tabla entera para paginarla en el navegador.
- **Total y página en una lectura**: `count(*) over ()` en la misma consulta, o una consulta agrupada para el total y los contadores de los filtros, y después la página.

```sql
select p.*, count(*) over () as total
from personas p
where (:filtro = 'todos' or p.estado = :filtro)
order by p.nombre, p.id          -- siempre un desempate único: sin él, el orden entre páginas cambia
limit :por_pagina offset (:pagina - 1) * :por_pagina;
```

- **El componente `Paginacion`** es el pie de toda tabla larga: filas por página (10 · 25 · 50), "1–10 de 243" y las páginas, con anterior y siguiente.
- **La página, el filtro y las filas por página viven en la URL** (`?pagina=2&filtro=activos&por=25`): un link abre la misma vista, y atrás y adelante funcionan. Un valor inválido vuelve al valor por defecto, nunca a un error.
- Los filtros y las filas por página viven **por encima** de lo que cambia (el día, la página): cambiar de día los conserva y empieza en la página 1.
- Para listas enormes ordenadas por fecha (un historial, una auditoría), paginación por cursor (`where (fecha, id) < (:ultima_fecha, :ultimo_id)`) en vez de `offset`.
- **Una lista larga en el navegador dibuja 50 filas y 50 más al scrollear.** Dibujar 300 filas de golpe hizo que abrir cualquier diálogo y cada tecla costaran 9.000 elementos (abrir un `<dialog>` modal recalcula el estilo de toda la página).

## 4. Filtros

- **En una fila, arriba de la tabla.** Diseñados como controles de filtro (segmentados con un relleno de color que se desliza al elegir, con su ícono animado), no como texto suelto.
- **Solo se muestran los filtros que tienen algo**: si el cliente usa 2 de 8 categorías, se ven 2. Sin nada que filtrar, la barra de filtros no aparece.
- Cada opción puede llevar su contador (cuántas filas hay).
- **Cambiar un filtro anima las filas**: las que se van se desvanecen y las que quedan se reacomodan (GSAP Flip). Esto pasa **solo** en la función que cambia el filtro: un refresco automático o un guardado nunca corren Flip.
- **Un rango de fechas ("desde / hasta") y los filtros que piden elegir varias cosas esperan un botón "Ver"**, que se ilumina cuando lo elegido es distinto de lo que se muestra. Los períodos rápidos (Hoy, Esta semana, Este mes) se aplican al instante.
- Mientras llega el resultado de un filtro, el bloque se atenúa a `.8` (con `aria-busy`) y la vista anterior queda hasta que llega la nueva. No se reemplaza la lista por "Cargando…".

## 5. Búsqueda

- En el servidor, con una espera de 250 a 300 ms después de la última tecla.
- `ilike '%texto%'` con los comodines `%` y `_` del usuario escapados, servido por un **índice de trigramas** (`pg_trgm`, GIN) en las columnas que se buscan. Sin ese índice, un comodín al principio recorre toda la tabla.
- Buscar números (DNI, teléfono) compara dígitos contra columnas de dígitos (`dni_normalizado`). **Un texto sin dígitos no debe buscar en las columnas de dígitos**: `"…".includes("")` es verdadero y una búsqueda de "ana" devolvía a todos.
- La búsqueda no repite la entrada en cascada.
- Sin resultados: el vacío "sin resultados" con la acción para limpiar la búsqueda o el filtro.

## 6. Consultas acotadas

- Toda consulta de una pantalla está acotada: por día, por período o por página. Las excepciones (un total histórico, un catálogo de decenas de filas) se escriben como tales en `docs/DATOS.md`.
- **"Los registros de este día" es un rango sobre la columna cruda**, no una función sobre ella, así lo sirve el índice:

```sql
where fecha >= (:dia::timestamp at time zone 'America/Argentina/Buenos_Aires')
  and fecha <  ((:dia + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires')
```

- Cada consulta nueva tiene su índice (o la razón por la que no lo necesita) y su `EXPLAIN (ANALYZE, BUFFERS)` revisado.
- `order by` siempre con un desempate único (`, id`).

## 7. Exportar (Excel, CSV, PDF)

- La librería se carga **al hacer click** (`await import(...)`), nunca en la carga de la pantalla.
- El exporte pasa por el mismo guard que la pantalla, respeta los filtros de la URL y **escribe una fila de auditoría con la cantidad de filas** exportadas.
- Un archivo grande sale de un route handler `GET` con su guard, no armado por una Server Action.
- **Inyección de fórmulas**: una celda de texto que empieza con `=`, `+`, `-`, `@`, tabulación o retorno de carro se escapa (anteponiendo `'`) antes de escribirla en un CSV o un Excel.
- Íconos de exporte que se entiendan (nunca uno de Excel que "parece una calculadora").
