---
name: cerrar
description: "Cierre de sesion: volcar al repo todo lo que este chat produjo — entrada nueva en el WORKLOG, estado sobrescrito, y las decisiones, gotchas, deuda y preguntas abiertas en el MEMORY — respetando el formato de registro que el repo ya use. Correr antes de compactar y antes de cerrar cualquier chat de trabajo, aunque la tarea haya quedado sin terminar. Solo a mano: corre cuando el usuario escribe /cerrar (es el metodo de Mateo, docs/trabajo/MATEO.md; nunca se dispara solo)."
user-invocable: true
disable-model-invocation: true
---

# Cerrar — volcado de sesion

El par de `/retomar`. **Un chat que termina sin registro perdio su memoria.** El contexto se compacta y se pierde; un archivo en el repo sobrevive a la compactacion, al chat nuevo y a la maquina nueva.

Corre siempre, aunque la tarea este a medias. Especialmente si esta a medias.

## FASE 1 — Detectar el sistema del repo

Antes de escribir una linea, leer que registro ya existe: `WORKLOG.md`, `docs/*WORKLOG*`, `MEMORY.md`, `DECISIONS.md`, `ADR*`, `NOTES.md`, `PROJECT-BRAIN.md`.

**En este repo el registro es `docs/WORKLOG.md` y `docs/MEMORY.md`. Si existe, usar ESE formato exacto**: replicar sus encabezados, su numeracion, su idioma y su estilo de entrada. No inventar un esquema nuevo, no reordenar, no reescribir lo viejo. Las series numeradas continuan desde el numero mas alto alcanzado.

Si no existe ninguno, crear `WORKLOG.md` y `MEMORY.md` en la raiz con la estructura de abajo, en el idioma que ya use la documentacion del repo.

## FASE 2 — WORKLOG

**Seccion ESTADO** — se sobrescribe completa cada vez:

tarea actual | status real | ultimo chat con fecha | que espera del usuario | que espera de terceros | proxima accion | que no se toca.

**Seccion REGISTRO** — append, nunca se borra nada. Una entrada nueva, fechada:

- **Pedido:** lo que pidio el usuario en este chat, literal, incluido el GO-AHEAD tal como lo escribio.
- **Hecho:** que se construyo, concreto.
- **Archivos:** ruta completa de CADA archivo creado o modificado, con que se le cambio. Si uno quedo a medias, nombrar la funcion o el componente exacto donde quedo.
- **Verificado:** como se comprobo que funciona, con resultados reales — salida de tests, medidas, screenshots a 375 y 1440 si es UI. Lo que no se verifico va escrito como **sin verificar**. Nunca darlo por hecho.
- **Resuelto en el camino:** bugs que aparecieron y su causa real, no el sintoma.
- **Gates:** resultado literal de build / typecheck / lint / test. Si no se corrieron, decirlo.
- **Sigue:** el proximo paso.

## FASE 3 — MEMORY

Append, continuando la numeracion existente:

- `D-NNN` **decisiones** — que se decidio, por que, que alternativas se descartaron, cuando se reabriria. Si reemplaza una anterior, escribir "reemplaza D-0NN".
- `G-NNN` **gotchas** — trampas encontradas, con la causa profunda, no el sintoma.
- `TD-NNN` **deuda tecnica** asumida a proposito, con la unidad de trabajo donde se paga.
- `OQ-NNN` **preguntas abiertas** que requieren decision del usuario, de su socio o de un tercero.

Una "mejor idea" que quedo fuera del plan va aca como nota, nunca como codigo.

## FASE 4 — Reportar

Cuatro bloques: **Hecho / Falta / Sigue / De vos**. Una linea diciendo que archivos del registro se actualizaron.

Si despues de esto viene un `/compact`, no hace falta escribir instrucciones: el hook `PreCompact` las inyecta solo.

## Reglas

1. **Nada se resume ni se abrevia.** El destinatario es un chat que no vio nada de esta conversacion.
2. **Nada inventado.** Lo dudoso va marcado. Un archivo que no se abrio no se describe.
3. **Precision sobre brevedad.** Entre cortar un detalle tecnico o dejarlo, dejarlo.
4. **Secretos nunca.** De las variables de entorno van los NOMBRES y para que sirven, jamas los valores. **Nunca crear ni regenerar un `.env.example`.**
5. **Solo archivos de registro.** `/cerrar` no refactoriza, no arregla lo que quedo a medias y no commitea salvo que el usuario lo pida.
