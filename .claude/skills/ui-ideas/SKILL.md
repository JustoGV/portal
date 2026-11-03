---
name: ui-ideas
description: Design & animation ideas grounded in Mateo's verified UI catalog (component libraries, section galleries, motion resources). Trigger when the user asks for design/animation ideas or options ("dame ideas para esta sección", "cómo hago este hero", "opciones de animación", "qué componente uso"), wants to compare design references, extract a component from a catalog site, or describes a UI element vaguely and needs its proper name.
---

# UI Ideas — the catalog as a working tool

Purpose: turn Mateo's hard-to-verbalize design ideas into named options with links, grounded in verified free resources.

## Step 1 — Load the knowledge

1. Read `COMPONENT-INDEX.md` **in this skill's own folder** — the component-level inventory (~200 lines, organized by use-case: heros, text effects, cards, scroll, nav, transitions, section vocabulary, signature-moment shortlist). This is your primary source for proposing: real component names with direct demo links.
2. Only if you need site-level context (tiers, which library for what): `UI-CATALOG.md` of Mateo's design arsenal — it exists only on his machine; skip this step if it is not there.
3. Project context: if the project has design tokens or a `PROJECT-BRAIN.md`, ideas must respect them — never propose against an established design system.

## Step 2 — Detect the mode

### IDEAS (default) — "dame ideas para [sección/página/interacción]"
Return **2-4 named options**, each with:
- **Pattern name** (the component's REAL name from COMPONENT-INDEX.md: "Hero Liquid Metal", "Border Beam", "Velocity Skew")
- **Where to see it** — the direct demo link from the index; site-level links from the catalog only as fallback
- **Why it fits THIS project** (tie to its audience/brand, not generic praise)
- **Effort**: trivial / moderate / signature-moment
End with: `→ MI PICK: [option] — [reason tied to context]`. If freshness matters (e.g. "what's current for SaaS pricing"), open the relevant catalog page directly and check it.

### COMPARAR — user gives 2+ references/URLs
Differences that matter (hierarchy, motion, conversion logic), then which one for THIS project and why. One verdict, no fence-sitting.

### EXTRAER — "sacá [componente] de [URL]"
Fetch the component's pattern, then produce adaptation notes: what maps to the project's existing tokens, what gets replaced, what gets dropped. Implementation follows the project's normal flow (`CLAUDE.md`) — this skill produces the direction, not the edit.

### NOMBRAR — user describes something vaguely
Give the proper name(s) of the matching pattern(s) + a catalog link where they can SEE each candidate and confirm. This builds the shared vocabulary that makes every future request cheaper.

## Rules

- Every suggestion carries its source link — an idea Mateo can't see is a paragraph, not an idea.
- Adapt, never paste: components always get translated to the project's tokens (web-distintiva rule: vet before installing; prefer copy-and-adapt over new dependencies).
- Anti-generic filter: if an option would look AI-templated (centered hero + fade-up + rounded-2xl grid), don't offer it.
- This skill gives direction and options. Building them follows the project's normal flow (`CLAUDE.md`, `docs/reglas/`).
- Catalog verified 2026-07-14; if a linked resource looks paywalled/moved, flag it and suggest updating UI-CATALOG.md.
