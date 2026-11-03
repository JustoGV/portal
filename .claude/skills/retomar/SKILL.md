---
name: retomar
description: "Arranque de sesion en un proyecto que ya viene trabajado: leer el registro durable del repo, verificarlo contra el codigo y git, y devolver el plan en tabla esperando el GO-AHEAD del usuario antes de tocar un solo archivo. Solo a mano: corre cuando el usuario escribe /retomar (es el metodo de Mateo, docs/trabajo/MATEO.md; nunca se dispara solo)."
user-invocable: true
disable-model-invocation: true
---

# Retomar — arranque de sesion

El par de `/cerrar`. `/cerrar` deja el estado escrito en el repo; `/retomar` lo levanta y lo verifica. Salio de Sanalys, donde el CLAUDE.md del repo ya declara este arranque como obligatorio; el metodo sirve para cualquier proyecto.

**Nada se toca hasta el GO-AHEAD.** Este es el punto de la skill. Un chat que arranca escribiendo codigo sin leer el registro repite trabajo, re-decide lo decidido y rompe convenciones que ya existian.

## FASE 1 — Leer

Leer directo en el hilo principal, con rangos y grep (Mateo corto la lectura por subagentes: era mas lenta y resumia mal). Las lecturas independientes van juntas en un mismo mensaje.

Pedir contenido **literal**, nunca resumenes abstractos:

1. `CLAUDE.md` / `AGENTS.md` del repo, si existen. Si declaran su propio orden de lectura o protocolo de sesion, ese orden manda sobre esta skill.
2. El registro de estado: `WORKLOG.md`, o `docs/*WORKLOG*`, `NOTES.md`, `PROJECT-BRAIN.md`. La seccion de ESTADO completa y las ultimas 3 entradas del log.
3. El registro de decisiones: `MEMORY.md`, `DECISIONS.md`, `ADR*`. **Lo que esta ahi no se re-decide ni se vuelven a proponer alternativas.**
4. El roadmap o lista de tareas, si existe: la tarea de este chat y su lista de archivos declarada.
5. `README.md` y los docs que gobiernen especificamente lo que se va a tocar.
6. El manifiesto del stack (`package.json`, `pyproject.toml`, etc.): scripts exactos de dev/build/test/lint y versiones de las deps principales.

Si el repo tiene skills propias por tipo de tarea (un `docs/13-SKILLS.md` o equivalente), leerlo y cargar las que correspondan **antes** de escribir el plan. Si una skill no carga, parar y decirlo.

Si NO existe ningun registro de estado, decirlo en la primera linea de la respuesta y ofrecer `/cerrar` al final de la sesion para crearlo.

## FASE 2 — Verificar contra la realidad

El registro puede estar desactualizado. Comprobar:

- `git status --short`, `git log --oneline -10`, rama actual, PRs abiertos.
- Que los archivos que el registro dice terminados existan y contengan lo que dice.

**Si el registro y el codigo no coinciden, decirlo antes de seguir.** Es el hallazgo mas importante del arranque y nunca se resuelve en silencio.

## FASE 3 — Plan

Un solo mensaje al usuario, en espanol:

1. En que punto exacto esta el proyecto y que estamos por hacer.
2. Que esta pendiente y de quien depende cada cosa.
3. La lista de archivos a tocar, rutas completas. **Esa lista es la frontera**: un archivo fuera de ella es un stop-and-report.
4. Las decisiones y convenciones ya cerradas que aplican.
5. El plan como literales, en tabla: `archivo | que contiene | que lo gobierna`. Nombres, medidas, valores, comandos. Cero adjetivos.

Cerrar con **Hecho / Falta / Sigue / De vos**. Si el repo define su propio formato de mensaje, usar ese.

## FASE 4 — Parar

Esperar el `GO-AHEAD` escrito. No hay excepciones por tareas chicas ni por "esto es obvio".

- Ambiguo: maximo 3 preguntas numeradas, cada una respondible con una palabra.
- No decidido: no decidirlo en silencio. Registrarlo como pregunta abierta (`OQ-NN` o el formato del repo), marcar el lugar con `{{CONFIRMAR}}`, avisar en una linea y seguir con todo lo que no dependa de eso.
- Una "mejor idea" fuera del plan es una nota para el registro de decisiones, no codigo.

## Reglas

1. **El juicio no se delega.** El plan, las decisiones y el codigo son del hilo principal.
2. **Nunca inventar estado.** Lo que no se leyo o no se verifico se dice como tal.
3. **Nada es hecho hasta mirarlo.** En trabajo de UI, la verificacion es la pagina corriendo con screenshots, no una lectura del codigo.
4. **Cerrar lo que se abre.** Toda sesion arrancada con `/retomar` termina con `/cerrar`, aunque la tarea quede sin terminar.
