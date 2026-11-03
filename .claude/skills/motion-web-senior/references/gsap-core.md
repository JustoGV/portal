# GSAP Core

Reference for implementing GSAP animation (tweens, timelines, easing, stagger, responsive/reduced-motion variants, and pointer-follow effects) correctly and idiomatically in a Next.js App Router + React 19 + TypeScript codebase.

## Current as of July 2026

| Package | Version | Notes |
|---|---|---|
| `gsap` | 3.15.0 | Core engine + every plugin (ScrollTrigger, SplitText, MorphSVG, DrawSVG, ScrollSmoother, Inertia, Physics2D, CustomEase, CustomBounce, CustomWiggle, MotionPathPlugin, Flip, Observer, Draggable, ScrambleText, etc.) |
| `@gsap/react` | 2.1.2 | Ships `useGSAP()`. Peer deps: `gsap ^3.12.5`, `react >=17` — satisfied by React 19. |

Install:
```bash
npm install gsap @gsap/react
```

**Licensing (verify-critical, changed recently):** Webflow acquired GreenSock in October 2024 and made GSAP **100% free for everyone, including all former "Club GreenSock" paid plugins**, effective April 2025. License is the "Standard no-charge license" (`https://gsap.com/standard-license`). There is no paid tier, no trial watermark, no member-only npm registry anymore.

- The old private registry `npm.greensock.com` is **deprecated** — never reference it, never tell a client to set up an `.npmrc` auth token for GSAP. Everything installs from public npm via `npm install gsap`.
- Plugins that used to require a paid Club GreenSock membership (ScrollSmoother, SplitText, MorphSVGPlugin, DrawSVGPlugin, InertiaPlugin, Physics2DPlugin, CustomEase, CustomBounce, CustomWiggle, ScrambleTextPlugin, GSDevTools) are now bundled inside the plain `gsap` package and imported as subpaths — no separate install, no separate license check. (ScrollTrigger, Flip, Observer, Draggable, and MotionPathPlugin were already free/public plugins before the April 2025 change — don't imply they were ever paywalled.)
- If you see old tutorials with `gsap-bonus.tgz`, `Club GreenSock`, or shockingly-green.com references — that's stale. Ignore it.

## Mental model

GSAP is an imperative animation engine, not a declarative one — you write JS that mutates a tween/timeline object graph, and it hands back a controllable instance (`.play()`, `.pause()`, `.reverse()`, `.kill()`, `.progress()`). In React this creates one core tension: React wants to own the DOM lifecycle, GSAP wants to own its own timers and cleanup. The entire integration story (`useGSAP`, `gsap.context()`, `matchMedia`) exists to reconcile that: GSAP tracks every animation/ScrollTrigger it creates inside a "context," and reverting that context on unmount undoes everything cleanly, including inline styles GSAP wrote to the DOM.

A senior treats a `gsap.timeline()` as the unit of composition, not individual tweens. Sequence relationships (what happens relative to what, and when) belong in the timeline's position parameter and labels — not in `setTimeout` chains or `onComplete` callbacks stacked on top of each other. Easing is a design decision, not a default: `power2.out` for UI micro-interactions, `power4.out`/`expo.out` for large dramatic entrances, `back.out(1.7)` sparingly for playful overshoot, `elastic`/`bounce` almost never on production marketing sites (reads as cheap unless it's the entire brand voice). Stagger is a spatial/temporal distribution problem — use the object form (`grid`, `from`, `axis`) instead of a flat number whenever more than a handful of elements are involved, or output looks mechanically identical to every other AI-generated hero grid.

Responsiveness and accessibility are not afterthoughts: `gsap.matchMedia()` is the correct primitive for both breakpoint-specific animation setups AND `prefers-reduced-motion`, and it should appear in nearly every nontrivial animation file, not just "big" projects.

## API essentials

### Core tweens

| Method | Behavior |
|---|---|
| `gsap.to(target, vars)` | Animates FROM current values TO `vars`. Default choice for entrances/transitions. |
| `gsap.from(target, vars)` | Animates FROM `vars` TO current values. Useful for entrance reveals defined by their start state. |
| `gsap.fromTo(target, fromVars, toVars)` | Explicit start and end state. Use when `from()`'s implicit "current value" is ambiguous (e.g., element not yet painted, or SSR-hydrated content). |
| `gsap.set(target, vars)` | Instant, no tween — for setting initial/hidden states before a reveal animation runs (prevents flash of unstyled content). |

Common `vars` keys: `duration`, `ease`, `delay`, `stagger`, `repeat`, `yoyo`, `repeatDelay`, `onComplete`, `onStart`, `onUpdate`, `paused`.

### Timelines

```ts
const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.6 } });
```

Position parameter (2nd arg to `.to/.from/.fromTo/.add`) controls sequencing:

| Value | Meaning |
|---|---|
| (omitted) | Right after the previous tween ends (sequential, default) |
| `"<"` | Same start time as the previous tween (parallel) |
| `"-=0.3"` | 0.3s before the previous tween ends (overlap) |
| `"+=0.2"` | 0.2s gap after the previous tween ends |
| `"myLabel"` | At a named label |
| `"myLabel+=0.5"` | 0.5s after a label |
| absolute number `1.2` | At absolute time 1.2s on the timeline |

Labels: `tl.addLabel("reveal")` then reference `"reveal"` in later position params — makes long sequences legible and lets you jump (`tl.seek("reveal")`) or scope ScrollTrigger scrubs to sections.

Nesting: `parentTl.add(childTl, position)` — build reusable sub-timelines (e.g., a "card enter" timeline reused per card) and splice them into a master timeline; this is the senior pattern for composable, testable sequences instead of one 40-line flat timeline.

`defaults` on `gsap.timeline({ defaults: {...} })` cascades to every child tween unless overridden — set `ease`/`duration` once instead of repeating them.

### Easing vocabulary

Built-ins: `power1`–`power4` (progressively stronger), `back`, `elastic`, `bounce`, `circ`, `expo`, `sine`, `none` (linear). Each takes a direction suffix: `.in`, `.out`, `.inOut`. Default ease across GSAP is `power1.out` if unspecified.

Configurable variants: `"back.out(1.7)"` (overshoot amount), `"elastic.out(1, 0.3)"` (amplitude, period).

CustomEase (now free, no license gate):
```ts
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(CustomEase);

CustomEase.create(
  "hop",
  "M0,0 C0,0 0.056,0.442 0.175,0.442 0.294,0.442 0.332,0 0.332,0 0.332,0 0.414,1 0.671,1 0.991,1 1,0 1,0"
);

gsap.to(".el", { y: -80, ease: "hop", duration: 0.8 });
```
Grab curve strings from the CustomEase visual editor on gsap.com — don't hand-write cubic paths from memory.

### Stagger (advanced object form)

Flat number (`stagger: 0.08`) is fine for a simple list. For grids, hero tiles, or anything visually 2D, use the object form:

```ts
gsap.from(".tile", {
  opacity: 0,
  y: 40,
  duration: 0.7,
  ease: "power3.out",
  stagger: {
    each: 0.06,
    from: "center",       // "start" | "end" | "center" | "edges" | "random" | index
    grid: "auto",          // or [rows, cols] for explicit grid awareness
    axis: "y",              // restrict distribution to one axis
    ease: "power2.inOut",   // easing applied to the stagger distribution itself
    amount: 0.8              // total time budget spread across all staggers (overrides each when set)
  },
});
```
`amount` vs `each`: `amount` is "spread this total duration across everyone" (predictable total time regardless of item count); `each` is "wait this long between each start" (total time grows with item count). Pick `amount` for a fixed-length hero reveal, `each` for an infinite/variable-length list.

### Keyframes

Percentage-based object form (preferred, GSAP 3.7+) reads like CSS `@keyframes` and keeps one tween instead of a chain:
```ts
gsap.to(".hero-title", {
  keyframes: {
    "0%":   { opacity: 0, y: 30 },
    "60%":  { opacity: 1, y: -5 },
    "100%": { y: 0 },
  },
  ease: "power2.out",
  duration: 1.2,
});
```
Array form also exists (`keyframes: [{...}, {...}]`, each entry takes its own `duration`/`ease`) — use it when steps need per-step easing more than per-step timing percentages.

### matchMedia (responsive + reduced motion)

```ts
const mm = gsap.matchMedia();

mm.add(
  {
    isDesktop: "(min-width: 800px)",
    isMobile: "(max-width: 799px)",
    reduceMotion: "(prefers-reduced-motion: reduce)",
  },
  (context) => {
    const { isDesktop, isMobile, reduceMotion } = context.conditions as {
      isDesktop: boolean; isMobile: boolean; reduceMotion: boolean;
    };

    if (reduceMotion) {
      gsap.set(".hero", { opacity: 1, y: 0 }); // land in final state, no motion
      return;
    }

    gsap.to(".hero", { y: isDesktop ? -120 : -40, duration: isDesktop ? 1.2 : 0.7 });

    // optional cleanup specific to this branch
    return () => { /* runs when the matching branch stops matching or context reverts */ };
  }
);
```
Every animation-heavy component should have a `reduceMotion` branch. This is a correctness requirement, not decoration — treat its absence as a bug.

`mm.revert()` reverts everything created across all branches. Inside `useGSAP`, you generally don't need a separate `gsap.context()` — `matchMedia()` creates its own internally and `useGSAP`'s cleanup handles the rest.

### quickTo / quickSetter (pointer-follow, high-frequency updates)

Use instead of calling `gsap.to()` on every `mousemove`/`scroll` tick — same tween instance gets redirected instead of creating a new one each time:

```ts
const xTo = gsap.quickTo(cursorRef.current, "x", { duration: 0.4, ease: "power3" });
const yTo = gsap.quickTo(cursorRef.current, "y", { duration: 0.4, ease: "power3" });

window.addEventListener("pointermove", (e) => {
  xTo(e.clientX);
  yTo(e.clientY);
});
```
`gsap.quickSetter(target, prop, unit)` is the even-lighter version — no easing/tweening at all, just a fast direct property write (used e.g. inside a ScrollTrigger `onUpdate` or an RAF loop where you're already interpolating manually).

### gsap.utils (grab-bag every implementer uses)

| Method | Purpose |
|---|---|
| `toArray(selector)` | Selector text / NodeList / array-like → real array. Use instead of `document.querySelectorAll` + spread. |
| `mapRange(inMin, inMax, outMin, outMax, value)` | Remap a number between two ranges (e.g. scroll progress → rotation degrees). |
| `interpolate(start, end, progress)` | Interpolate between numbers, colors, strings, arrays, even objects. |
| `snap(increment \| array, value)` | Snap a value to nearest step or nearest array entry. |
| `wrap(array \| min, max, value)` | Cycle through an array or numeric range, wrapping at the end. |
| `wrapYoyo(...)` | Like `wrap` but reverses direction at the ends instead of jumping. |
| `clamp(min, max, value)` | Constrain a value to a range. |
| `distribute(vars)` | Distribute values across an array (powers the `stagger` object form internally; usable standalone). |
| `normalize(min, max, value)` | Map a value in a range to 0–1 progress. |
| `pipe(...fns)` | Compose functions left to right. |
| `random(min, max, snapIncrement?, returnFunction?)` | Random number generator with optional snapping. |
| `selector(scopeEl)` | Returns a selector function scoped to one DOM element — same mechanism `useGSAP`'s `scope` option uses. |
| `getUnit(value)` | Extract the unit from a string, e.g. `"30px"` → `"px"`. |

### Ticker and global config

```ts
gsap.ticker.add((time, deltaTime, frame) => { /* runs every rAF tick */ });
gsap.ticker.fps(30);                 // throttle below native rAF rate
gsap.ticker.lagSmoothing(500, 33);   // if a stall > 500ms occurs, pretend only 33ms passed
```

```ts
gsap.config({
  nullTargetWarn: false,             // silence console warnings for empty selector matches
  autoSleep: 60,                      // frames between idle-ticker power-down checks
  force3D: "auto",                    // "auto" | true | false — GPU-accelerated transforms
  units: { rotation: "rad" },         // change default unit per property
});
```
Set `gsap.config()` once, at app bootstrap (a top-level client provider or the first client component that imports gsap) — not per-component.

## Patterns

### 1. Baseline client component with `useGSAP`

```tsx
// components/hero-reveal.tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function HeroReveal() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.set(".hero-title, .hero-sub", { opacity: 0, y: 24 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });
      tl.to(".hero-title", { opacity: 1, y: 0 })
        .to(".hero-sub", { opacity: 1, y: 0 }, "-=0.4");
    },
    { scope: container } // scopes ".hero-title" selectors to this subtree only
  );

  return (
    <div ref={container}>
      <h1 className="hero-title">Ship faster.</h1>
      <p className="hero-sub">Awwwards-grade, without the agency price tag.</p>
    </div>
  );
}
```
`scope` matters the moment this component renders more than once on a page (list of cards, etc.) — without it, `".hero-title"` selector text matches every instance in the DOM, not just this one.

### 2. Timeline with labels, nesting, and a reusable sub-sequence

```tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

function cardEnterTimeline(card: Element) {
  return gsap.timeline()
    .from(card, { opacity: 0, y: 30, duration: 0.5, ease: "power2.out" })
    .from(card.querySelector(".card-title"), { opacity: 0, x: -10, duration: 0.3 }, "-=0.2");
}

export function FeatureGrid() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const master = gsap.timeline();
      master.addLabel("start");

      gsap.utils.toArray<HTMLElement>(".feature-card").forEach((card, i) => {
        master.add(cardEnterTimeline(card), i === 0 ? "start" : "-=0.35");
      });
    },
    { scope }
  );

  return (
    <div ref={scope} className="grid grid-cols-3 gap-6">
      {/* .feature-card elements */}
    </div>
  );
}
```

### 3. Responsive + reduced-motion setup with `matchMedia` inside `useGSAP`

```tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function ParallaxBanner() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 1024px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { isDesktop, reduceMotion } = ctx.conditions as {
            isDesktop: boolean;
            reduceMotion: boolean;
          };

          if (reduceMotion) {
            gsap.set(".banner-layer", { y: 0 });
            return;
          }

          gsap.to(".banner-layer", {
            y: isDesktop ? -80 : -24,
            ease: "none",
            scrollTrigger: {
              trigger: scope.current,
              scrub: true,
            },
          });
        }
      );

      return () => mm.revert(); // belt-and-suspenders; useGSAP cleanup also handles this
    },
    { scope }
  );

  return <div ref={scope} className="banner"><div className="banner-layer" /></div>;
}
```
Note: `scrollTrigger` inside `vars` requires `ScrollTrigger` registered (`gsap.registerPlugin(ScrollTrigger)`) — see the ScrollTrigger reference for pinning/scrub specifics; this file only demonstrates matchMedia composition.

### 4. Pointer-follow cursor with `quickTo`

```tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!dotRef.current) return;

    const xTo = gsap.quickTo(dotRef.current, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(dotRef.current, "y", { duration: 0.35, ease: "power3" });

    const handleMove = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  });

  return <div ref={dotRef} className="pointer-events-none fixed left-0 top-0 h-3 w-3 rounded-full bg-white" />;
}
```
Plain `useGSAP(callback)` with no config array still gets full mount/unmount cleanup for anything GSAP-tracked (the tweens created via `quickTo`); the manual `addEventListener` cleanup is separate because DOM listeners aren't GSAP objects.

### 5. Imperative animation outside `useGSAP`'s callback: `contextSafe`

Click handlers, timeouts, or anything firing after the initial render still needs to be tracked for cleanup:

```tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function LikeButton() {
  const scope = useRef<HTMLButtonElement>(null);
  const { contextSafe } = useGSAP({ scope });

  const onClick = contextSafe(() => {
    gsap.fromTo(scope.current, { scale: 1 }, { scale: 1.3, yoyo: true, repeat: 1, duration: 0.15 });
  });

  return <button ref={scope} onClick={onClick}>Like</button>;
}
```
Skipping `contextSafe` here means the tween survives past unmount if the user clicks right before navigating away — a common source of "console error after route change" bug reports.

### 6. `gsap.context()` outside React (vanilla script, non-component module)

For non-React code paths (e.g. a plain `<script>` island, a Web Component, or a utility invoked from multiple places), `gsap.context()` is still the correct manual-cleanup primitive — `useGSAP` is just a React wrapper around it:

```ts
const ctx = gsap.context(() => {
  gsap.to(".el", { opacity: 1 });
}, scopeElement);

// later, when the scope is torn down:
ctx.revert();
```

## Integration gotchas (SSR / hydration / React 19 / Next App Router)

- **Always `"use client"`** on any file calling `gsap`, `useGSAP`, or touching `window`/`document`. Server Components cannot run GSAP; importing gsap into a Server Component file (even unused) can break the build or silently no-op.
- **Register plugins once per module**, at the top of the client file, not inside the component body or inside `useGSAP`'s callback — `gsap.registerPlugin(...)` re-running on every render is harmless but wasteful; putting it at module scope avoids the tree-shaking issue where bundlers drop an "unused" plugin import.
- **`gsap.registerPlugin(useGSAP)`** is still the documented pattern even though `useGSAP` is a hook, not a visual plugin — it exists to align GSAP's internal React-version detection. Do it once, alongside your other `registerPlugin` calls.
- **React 19 + StrictMode double-invoke**: local dev runs effects twice. `useGSAP`'s cleanup (via `gsap.context().revert()`) is what makes this safe — animations from the first invocation get fully reverted before the second one runs. Don't manually re-implement this with a raw `useEffect` + manual `gsap.to()` calls; you will get doubled/conflicting tweens in dev.
- **Selector scoping is mandatory in any component that can render more than once** (cards, list items, repeated sections). Always pass `{ scope: containerRef }` to `useGSAP`. Unscoped selector text (`".card"`) matches the whole document, not just this instance.
- **Initial-state flash**: if you animate elements `from` a hidden state (`opacity: 0`), that initial state only exists after JS runs. On a slow connection there's a flash of the final (visible) HTML before the animation's `gsap.set()` hides it. Fix with a CSS class that sets the pre-animation state (e.g. `opacity-0` via Tailwind) directly in the server-rendered markup, and let GSAP animate *from* that CSS state — don't rely on `gsap.set()` alone to hide content before paint.
- **Refs may be `null` on first render** under React 19's stricter typing — guard (`if (!ref.current) return;`) before handing a ref's `.current` to `gsap.quickTo`/`gsap.to` outside of `useGSAP`'s own null-safe scope handling.
- **`useIsomorphicLayoutEffect` inside `useGSAP`** already handles SSR (falls back to `useEffect` when `window` is undefined), so you do not need your own `typeof window !== "undefined"` guard around `useGSAP` itself — you do still need it around code that runs outside `useGSAP` (module-level `gsap.config()` calls, etc., are fine since they don't touch the DOM, but anything calling `window.matchMedia` directly at module scope is not).
- **One `useGSAP` per logical animation unit**, not one giant hook per page. Splitting by component keeps `scope` correct and keeps StrictMode remounts cheap to revert.

## Pitfalls (what makes output look AI-generic or breaks on mobile)

- **Everything fades up 24px with `power2.out` at 0.6s.** This is the single most recognizable "AI built this" tell. Vary duration, distance, and easing per element role — a hero headline entrance should not use the same curve as a button hover.
- **Flat-number stagger on a grid.** `stagger: 0.1` on a 4×4 grid animates row-by-row in a way that reads as a spreadsheet, not a design decision. Use the object form with `grid`/`from: "center"` or `"random"`.
- **No `prefers-reduced-motion` branch.** Shipping parallax/scroll-scrub/large-transform animations with zero `matchMedia` reduced-motion handling is an accessibility bug, not a nice-to-have — treat it as a blocking gap in review, same tier as missing alt text.
- **Animating `top`/`left`/`width`/`height` instead of `transform`/`opacity`.** Forces layout on every tick; on mobile Safari this is the difference between 60fps and visible jank. Default to `x`/`y`/`scale`/`rotation`/`opacity`; use `force3D` deliberately, not blindly on everything (it can cause blurry text on some GPUs if left on for elements that don't need it).
- **`gsap.to()` called repeatedly inside a `mousemove`/`scroll` handler** instead of `quickTo`/`quickSetter`. Creates a new tween every event, garbage-collector churn, visible stutter under fast pointer movement.
- **Missing cleanup on interval/click-triggered animations.** Anything created outside `useGSAP`'s callback body (event handlers, `setTimeout`) needs `contextSafe()`, or it leaks past unmount and can throw on a `null` target after route change.
- **Hardcoded pixel values baked into keyframes/timelines with no responsive branch.** A 120px parallax offset that's tuned for a 1440px desktop viewport turns into a wildly disproportionate motion on a 375px phone. Gate transform magnitude through `matchMedia`, not just duration.
- **Forgetting `gsap.registerPlugin(...)` for tree-shaken plugins** in bundlers (Next.js/Turbopack/webpack) that aggressively drop "unused" imports — the symptom is a plugin silently doing nothing in production while working in dev. Always explicit-register every plugin you import.
- **Overusing `elastic`/`bounce` eases on serious/enterprise-tone sites.** Reads as a template demo, not a crafted brand. Reserve bouncy eases for playful/consumer contexts and use restrained `power`/`expo` curves elsewhere.
- **Building sequences with nested `setTimeout` + separate `gsap.to()` calls** instead of one `gsap.timeline()`. Impossible to scrub, reverse, or retime later; always default to a timeline the moment more than one animation needs to relate to another in time.
