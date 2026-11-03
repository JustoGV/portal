# Motion Anti-Patterns

Catalog of the tells that make a site look AI-generated or amateur, why each one fails, and the senior fix — for Next.js 16 / React 19 / TypeScript / Tailwind 4 marketing and product sites.

## Current as of July 2026

| Library | Package (npm) | Version | Install | License / pricing |
|---|---|---|---|---|
| Motion (formerly Framer Motion) | `motion` | 12.42.2 | `npm install motion` | MIT, free |
| — React entry point | import from `motion/react` (not `framer-motion`) | — | — | `framer-motion` is the pre-rename package name; it's still published in lockstep with `motion` (same version, same day) as a compatibility alias, but the project itself calls itself Motion now — new projects should install `motion` and import from `motion/react` |
| Lenis | `lenis` | 1.3.25 | `npm install lenis` | MIT, free |
| — old scope | `@studio-freight/lenis` | 1.0.42 (~2 yrs stale) | — | Deprecated — do not install, moved to `darkroom-engineering/lenis` |
| GSAP | `gsap` | 3.15.0 | `npm install gsap` | 100% free (Webflow-backed since April 29, 2025) — ScrollTrigger, ScrollSmoother, SplitText, MorphSVG, DrawSVG all free, no Club GreenSock membership needed |
| GSAP + React | `@gsap/react` | 2.1.2 | `npm install @gsap/react` | Free under GreenSock's standard "no-charge" license (same license family as `gsap` core, not MIT) — provides `useGSAP()` |
| Peer context | `next` 16.2.10, `react`/`react-dom` 19.2.7 | — | — | — |

`@studio-freight/*` is a legacy scope still floating around in tutorials and AI training data — if you see it in a diff or a suggestion, that's itself a stale-tooling tell. Use `lenis`. `framer-motion` is milder: it still works and still gets published, but it's the old brand name — use `motion` for new code.

## Mental model

A senior treats motion as **feedback and continuity**, not decoration. Every animation must answer "what is this telling the user" — state changed, relationship revealed, attention directed, causality shown. If the answer is "the section needed to feel alive," cut it.

Restraint is the skill. Awwwards-tier sites use 2-4 motion vocabularies per project (e.g., one entrance style, one hover language, one scroll-driven reveal), applied with variation in timing/distance/easing per content type — not one recipe copy-pasted down the page. Uniformity reads as template, variation reads as craft.

Performance and accessibility are not add-ons, they're the definition of "done." Animate only `transform` and `opacity` (compositor-only, no layout/paint). Everything else on this list is a downstream consequence of forgetting that, forgetting `prefers-reduced-motion`, or forgetting that JS can fail to load.

Cleanup discipline matters more in Next.js App Router than people assume: client components can remount on navigation, layouts persist across routes, and Strict Mode double-invokes effects in dev. An animation system that isn't cleanup-safe leaks ScrollTriggers, rAF loops, and Lenis instances across route changes.

## API essentials

### Motion for React (`motion/react`)

| API | Use for | Notes |
|---|---|---|
| `<motion.div>` | Any animatable element | Swap `m.div` (no `AnimatePresence` context) for smaller bundles when you don't need exit animations |
| `initial` / `animate` | Mount-time animation | Set `initial={false}` to skip on first paint when SSR already shows final state |
| `whileInView` + `viewport={{ once: true, amount, margin }}` | Scroll-triggered reveals | `once: true` almost always — replaying on every scroll up/down is amateur |
| `variants` | Coordinated parent/child sequences | Prefer over inline objects once >1 child animates together |
| `transition={{ type: "spring", ... }}` | Interactive, physically-caused motion (drag release, hover snap) | Not for scripted entrances — see Pitfalls |
| `AnimatePresence` | Exit animations, route/tab transitions | Needs a stable `key`; only one direct child changes at a time per mode |
| `useReducedMotion()` | Reading OS-level reduced-motion preference | From `motion/react`; re-renders on live OS setting change |
| `useScroll` / `useTransform` | Scroll-linked (not scroll-triggered) values | Pair with `useSpring` to smooth jittery scroll-linked values |
| `layout` prop | Auto-animating layout changes | Uses FLIP under the hood (transform-based), safe — but expensive on large lists |

### Lenis

| Option | Purpose |
|---|---|
| `new Lenis({ duration, easing, ... })` | One instance per page, singleton |
| `lenis.raf(time)` | Must be driven by an external rAF loop — Lenis does not self-tick |
| `lenis.on('scroll', ScrollTrigger.update)` | Required if combined with GSAP ScrollTrigger, so ST recalculates on Lenis's virtual scroll |
| `lenis.destroy()` | Mandatory on unmount / route change |
| `autoRaf: true` (v1.1+) | Convenience flag to let Lenis run its own rAF — skip this when integrating with `gsap.ticker` (see Pitfalls, dual-loop) |

### GSAP + ScrollTrigger + `useGSAP`

| API | Purpose |
|---|---|
| `useGSAP(callback, { scope, dependencies })` from `@gsap/react` | Drop-in replacement for `useLayoutEffect`; auto-wraps in `gsap.context()`, auto-reverts (kills tweens/ScrollTriggers) on unmount or dependency change |
| `scope` config | Scopes GSAP selector text (`"section .title"`) to a container ref — prevents leaking selectors across mounted instances |
| `revertOnUpdate: true` | Re-creates and reverts the whole context every time deps change, not just on unmount |
| `ScrollTrigger.matchMedia({...})` | Responsive + reduced-motion branching in one call — put the whole reduced-motion / mobile animation set behind its own breakpoint key |
| `ScrollTrigger.getAll().forEach(t => t.kill())` | Manual fallback cleanup if not using `useGSAP` |
| `pin: true` | Creates a `.pin-spacer` wrapper automatically — do not also apply margin/padding assumptions to the pinned element's parent |

## Patterns

### 1. Progressive-enhancement entrance (never `opacity:0` at rest)

```tsx
// app/components/reveal.tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      // Start where content already renders in SSR HTML — no FOUC, no
      // stuck-invisible content if JS fails to hydrate.
      initial={{ opacity: 1, y: 0 }}
      whileInView={
        shouldReduceMotion
          ? undefined
          : { opacity: [0, 1], y: [16, 0] }
      }
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

The trick: `initial` matches the resting DOM state (visible), and the "from" values live inside the `whileInView` target as a keyframe array (`[0, 1]`). Motion still animates from the first keyframe on trigger, but a no-JS or pre-hydration user never sees `opacity: 0`. This is the opposite of the common `initial={{opacity:0}}` pattern, which guarantees invisible content if the effect never fires (ad blockers, JS errors, slow hydration).

### 2. Varied entrances, not one fade-up-40 template

```tsx
// Different content types get different motion signatures — this is
// what separates a designed site from a generated one.
const heroTitle = { initial: { opacity: 1 }, whileInView: { opacity: [0, 1] }, transition: { duration: 0.9 } };
const statCard   = { initial: { opacity: 1, scale: 1 }, whileInView: { opacity: [0, 1], scale: [0.96, 1] }, transition: { duration: 0.45, ease: "easeOut" } };
const listRow    = { initial: { opacity: 1, x: 0 }, whileInView: { opacity: [0, 1], x: [-12, 0] }, transition: { duration: 0.35 } };
const imageMask  = { initial: { clipPath: "inset(0 0 0 0)" }, whileInView: { clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"] }, transition: { duration: 0.8, ease: [0.65, 0, 0.35, 1] } };
```

Vary distance (8-24px, never a flat 40px everywhere), duration (0.3-0.9s by content weight — small UI moves fast, hero copy moves slower), and easing (`easeOut` for small elements, custom cubic-bezier for hero-scale moves). A flat `y: 40, duration: 0.5, ease: "easeOut"` on every single section, in order, top to bottom, is the single most recognizable AI tell in web motion today.

### 3. Lenis + GSAP ScrollTrigger — single driven loop, cleaned up

```tsx
// app/components/smooth-scroll-provider.tsx
"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return; // no smoothing, native scroll, no rAF loop at all

    const lenis = new Lenis({ duration: 1.1, wheelMultiplier: 1 });
    lenisRef.current = lenis;

    // Single source of truth for the frame loop: gsap.ticker drives Lenis,
    // not a separate requestAnimationFrame call — avoids two competing
    // smoothing systems fighting for the same scroll position.
    lenis.on("scroll", ScrollTrigger.update);

    // Named reference is required: gsap.ticker.remove() matches by function
    // identity, so add() and remove() must share the exact same reference —
    // two separate inline arrow functions would silently fail to detach.
    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Route change: kill every ScrollTrigger the previous route created.
  // Without this, ScrollTriggers from page A keep firing (and mis-firing,
  // since their trigger elements no longer exist) once page B mounts.
  useEffect(() => {
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [pathname]);

  return <>{children}</>;
}
```

Do not also set `html { scroll-behavior: smooth }` in CSS alongside Lenis — the browser's native smooth-scroll and Lenis's virtual scroll fight over scroll position, producing stutter on anchor-link jumps and `scrollIntoView` calls. Pick one: Lenis for the whole-page feel, or CSS `scroll-behavior` for a Lenis-free page. Same rule for Lenis + `ScrollSmoother` — both virtualize the scroll container; run one.

### 4. `useGSAP` for automatic per-component cleanup

```tsx
// app/components/pinned-section.tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function PinnedSection() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // matchMedia branch: desktop gets the pin+scrub treatment, mobile
      // and reduced-motion get a plain reveal — never a translated
      // reimplementation of the same heavy pin on a 375px viewport.
      ScrollTrigger.matchMedia({
        "(min-width: 900px) and (prefers-reduced-motion: no-preference)": function () {
          gsap.to(".panel", {
            xPercent: -100 * 2,
            ease: "none",
            scrollTrigger: {
              trigger: scope.current,
              pin: true,
              scrub: 1,
              end: "+=2000",
              // Always give a pinned section an implicit escape: a
              // finite end distance, never an open-ended pin.
            },
          });
        },
        "(max-width: 899px), (prefers-reduced-motion: reduce)": function () {
          gsap.from(".panel", { opacity: 0, stagger: 0.15, duration: 0.4 });
        },
      });
    },
    { scope } // auto-revert on unmount — no manual ScrollTrigger.kill() needed
  );

  return (
    <div ref={scope} className="relative h-screen overflow-hidden">
      <div className="panel">{/* ... */}</div>
    </div>
  );
}
```

`useGSAP`'s `scope` also prevents a second mount of the same component (Strict Mode dev double-invoke, or two instances on one page) from having their GSAP selector text collide.

### 5. Preloader that respects repeat visits

```tsx
"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "site-intro-seen";

export function Preloader({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only the *first* visit in a session gets the vanity intro. Every
    // repeat visit — the overwhelming majority of sessions — skips it.
    if (!sessionStorage.getItem(SEEN_KEY)) {
      setShow(true);
      sessionStorage.setItem(SEEN_KEY, "1");
    }
  }, []);

  if (!show) return <>{children}</>;

  return <IntroSequence onComplete={() => setShow(false)}>{children}</IntroSequence>;
}
```

If a preloader is justified at all (brand film, first-load asset-heavy 3D scene), cap it near 1-1.5s of forced wait and make it skippable on click/tap/keypress. A 3+ second unskippable animation on every single page load — including the 9th visit that session — is a top usability complaint on real Awwwards submissions, not just an AI tell.

### 6. Touch-safe affordances (no hover-only reveal)

```tsx
// Bad: content only reachable via :hover has no touch equivalent.
// .card:hover .card-details { opacity: 1 }

// Good: state is driven by a real interaction that works on touch too.
"use client";
import { useState } from "react";

export function Card() {
  const [active, setActive] = useState(false);
  return (
    <div
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onClick={() => setActive((v) => !v)} // tap toggles on touch
      className="group"
    >
      <div
        style={{ opacity: active ? 1 : 0 }}
        className="transition-opacity duration-200"
      >
        Details
      </div>
    </div>
  );
}
```

Or detect touch capability once (`window.matchMedia("(hover: hover) and (pointer: fine)")`) and render an always-visible variant of the affordance for coarse pointers instead of trying to fake hover with `:active`.

### 7. rAF loops that stop when offscreen

```tsx
"use client";
import { useEffect, useRef } from "react";

export function useVisibleRaf(callback: (t: number) => void, enabled: boolean) {
  const rafId = useRef<number>();
  const running = useRef(enabled);

  useEffect(() => {
    running.current = enabled;
    if (!enabled) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      return;
    }
    const loop = (t: number) => {
      callback(t);
      if (running.current) rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [enabled, callback]);
}

// Usage: pair with an IntersectionObserver so `enabled` flips false the
// moment the canvas/WebGL element scrolls out of view.
```

Any continuous rAF driver (custom cursor, canvas particle field, WebGL shader background) must gate on visibility (`IntersectionObserver`, `document.visibilityState`) — a background tab or an offscreen hero still burning a frame budget is a real battery/CPU cost, not a theoretical one.

## Pitfalls

- **`whileInView` fade-up-40px on every `<section>`.** The single most recognizable AI-generated tell. If every section uses identical `{opacity:0, y:40}` → `{opacity:1, y:0}` at `duration:0.5`, it reads as templated regardless of how good the copy/layout is. Vary distance, duration, easing, and technique (mask reveal, stagger, scale) per content type.
- **Uniform 0.5s duration everywhere.** Real interfaces have a duration hierarchy: micro-interactions 100-200ms, UI transitions 200-400ms, content reveals 400-700ms, hero/cinematic moments 700ms-1.2s. One duration for all of it is a tell in itself even when the easing varies.
- **Animating `width`, `height`, `top`, `left`.** Forces layout recalculation on every frame — janky below 60fps on anything but a trivial DOM. Animate `transform: scale()/translate()` and `clip-path` instead. For "growing" UI, animate `scaleX`/`scaleY` from a fixed-size box, or use Motion's `layout` prop (FLIP-based, transform-only).
- **Scroll-jacking with no escape and no reduced-motion path.** A pinned/hijacked scroll section that never respects `prefers-reduced-motion` or has no keyboard/skip escape traps users, and fails accessibility review outright. Every pin gets a `matchMedia` branch (see Pattern 4) and a finite scroll distance.
- **3s+ vanity preloaders on repeat visits.** Gate behind `sessionStorage`, cap duration, make skippable. See Pattern 5.
- **Two smoothing systems running at once** — Lenis + ScrollSmoother, or Lenis + CSS `scroll-behavior: smooth`, or two separate `requestAnimationFrame` loops each calling their own `.raf()`. Symptoms: scroll stutter, anchor links overshooting, `scrollIntoView` fighting the smoother. Pick exactly one system; drive it from exactly one ticker (see Pattern 3).
- **Missing cleanup on route change.** In App Router, a client component that creates ScrollTriggers/Lenis instances but never kills them on unmount leaves ghost triggers bound to DOM nodes that no longer exist — they fire (or silently no-op with a console warning) on the next page, and worse, keep the old page's elements retained in memory. Always kill via `useGSAP`'s auto-revert or an explicit `ScrollTrigger.getAll().forEach(t => t.kill())` / `lenis.destroy()` in a cleanup function keyed to `usePathname()`.
- **Pin-spacer layout breakage.** `pin: true` wraps the pinned element in a generated `.pin-spacer` div. Applying margin to the pinned element's original parent, or expecting `:nth-child` selectors on siblings to still line up, breaks after ScrollTrigger inserts that wrapper. Style the spacer via `pinSpacing` config or wrap your own layout container one level up.
- **Desktop-only motion with broken mobile parity.** A scroll-jacked horizontal-pin section built and tested only at 1440px, then shipped as-is to a 375px viewport — either it's unusably slow/jerky on a weaker GPU, or the pinned content overflows. Always author the mobile branch explicitly (see `matchMedia` in Pattern 4); it does not have to be the same interaction, it has to be an intentional one.
- **Springs on non-interactive, scripted entrances.** `type: "spring"` implies a physical cause — a drag release, a snap-back, a value chasing a target. Applying a bouncy spring to a page-load fade-up (a scripted, non-physical event) reads as decorative overshoot, not physicality. Reserve springs for gesture-driven and stateful UI (drag, toggle, magnetic hover); use eased tweens (`duration` + cubic-bezier) for scripted entrances.
- **Content stuck at `opacity: 0` when JS fails or the effect never fires.** If `initial={{opacity: 0}}` is the DOM's resting state and hydration errors, gets blocked, or the observer never triggers (element already in view before the script runs, in some edge cases), the content is permanently invisible — a full accessibility/SEO failure, not just an animation bug. Fix per Pattern 1: resting state is visible, animation "from" values live in the trigger's target keyframes, not in `initial`.
- **rAF loops running while offscreen.** See Pattern 7 — gate any continuous animation loop on `IntersectionObserver`/`visibilitychange`, not just at mount.
- **Hover-only affordances on touch devices.** `:hover`-gated reveals (tooltips, "hover to see more" cards, hover-triggered nav) are simply unreachable on touch — no hover state exists. Detect `(hover: hover)` or wire real interaction handlers (see Pattern 6).
- **Animating `blur()` or `box-shadow` at large radii every frame.** Both are expensive paint operations; a large blur radius or spread animated continuously (parallax blur, animated glow) tanks frame rate on non-Retina/low-end GPUs. Pre-render blurred variants where possible, keep animated blur radii small (<20px), or fake the effect with a static blurred pseudo-element cross-faded via `opacity` instead of animating the blur value itself.
