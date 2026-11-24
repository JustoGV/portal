# Servicios

La lista de servicios de la consultora: tabla paginada en el servidor con filtros por estado y cliente en la URL, búsqueda, orden por columna y ficha de cada servicio.

## Sub-features

- `servicios-carga` abre con la tabla y las cifras.
- `servicios-filtro` los filtros cambian la URL (`?estado=`, `?cliente=`) y la tabla.
- `servicios-busqueda` escribir en la búsqueda filtra y deja `?q=` en la URL.
- `servicios-orden` click en el encabezado ordena (`?orden=`, `?dir=`).
- `servicios-paginas` cambiar de página (`?pagina=`) y la cantidad por página (`?por=`).
- `servicios-ficha` click en el nombre abre la ficha.

## How to get to it (user POV)

- Barra lateral → Portal → Servicios.
- `Ctrl+K` → «Servicios».

## Driving it with recorrer.mjs

Preconditions:

- Estado de partida del índice; la semilla carga 34 servicios «Proyecto de muestra NN», 3 archivados (solo si la tabla estaba vacía).

- **Carga.** `recorrer.mjs --rutas /servicios`. `ok` a los cinco anchos.
- **Filtros y páginas.** `recorrer.mjs --rutas "/servicios?estado=archivados,/servicios?pagina=2"`. La URL final conserva el parámetro (`informe.json` → `url`).
- **Links internos.** En `/servicios`, todos los `a[href]` de `main` que llevan filtros, orden o páginas empiezan con `/servicios`.
- **Ficha.** `recorrer.mjs --rutas /servicios --anchos 1440 --abrir "table.pr-tabla .pr-nombre"`. La captura abierta muestra la ficha.
- **Proof.** Capturas en `$EV` e `informe.json`.

## Gotchas

- Un link interno que apunte a `/` lleva a Inicio, no a Servicios.
- Abre de 10 en 10 por defecto (`?por` no aparece en la URL cuando es 10).
