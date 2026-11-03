# Motion Design Language

How a senior motion director thinks about easing, timing, choreography, and scroll narrative when building Awwwards-grade sites — and the token system, component patterns, and restraint rules that make it repeatable instead of vibes-based.

## Current as of July 2026

| Library | Package | Version (verified npm) | Install | License |
|---|---|---|---|---|
| Motion (formerly Framer Motion) | `motion` | 12.42.2 | `npm i motion` | MIT |
| GSAP core | `gsap` | 3.15.0 | `npm i gsap` | Proprietary "no charge" standard license (not MIT) — 100% free for all use incl. commercial, since April 2025, following Webflow's October 2024 acquisition of GreenSock. All plugins — ScrollTrigger, SplitText, MorphSVG, DrawSVG, ScrollSmoother — ship in the same package, no license key, no "Club GreenSock." |
| GSAP React bindings | `@gsap/react` | 2.1.2 | `npm i @gsap/react` | Same license as GSAP |
| Lenis (smooth scroll) | `lenis` | 1.3.25 | `npm i lenis` | MIT |
| Lenis React adapter | `lenis/react` (same package, sub-export) | ships with `lenis` | — | MIT |

Renames that matter — do not use stale imports:
- `framer-motion` → still published on npm (kept in sync in version number with `motion`) but is legacy; official guidance is to migrate off it. Import from **`motion/react`**, not `framer-motion`. API is functionally identical (component/hook names unchanged), only the package and import path moved.
- `@studio-freight/lenis` → renamed to **`lenis`**. The studio-freight scope is legacy; new projects install `lenis` directly.
- GSAP plugins (`ScrollTrigger`, `SplitText`, etc.) no longer require a private npm registry token or trial watermark. Plain `npm install gsap` gives you everything.

Pick GSAP for scroll choreography, pinning, timelines, and SVG/text-splitting work. Pick Motion for React-idiomatic component-level animation (enter/exit, layout animation, gestures) where you want state-driven variants instead of imperative timelines. Most Awwwards-tier builds use both: Motion for UI-level interaction, GSAP + ScrollTrigger for the scroll narrative spine. Don't reach for both to do the same job in the same component — pick one per concern.

## Mental model

Motion is not decoration, it's the brand's voice made kinetic. Before writing a single line of animation code, decide what the motion should *say*: confident and unhurried (long expo/quint eases, generous duration) reads premium; snappy overshoot springs read playful and consumer; perfectly linear, constant-velocity motion reads mechanical and industrial — reserve it for things that are literally driven by an external signal (scroll position, drag, marquees, progress bars), never for things that "happen" on their own, because linear motion with no easing on a state change reads as broken, not intentional.

A senior treats easing curves and durations as design tokens, not per-component magic numbers. Define them once, name them by feeling not by math ("confident," "snappy," "mechanical"), and reuse them everywhere — the same discipline as a color or type scale. If two developers on the same project hand-roll their own `cubic-bezier()` values, the site will feel like it was built by two different studios, and it will.

Choreography is hierarchy made visible. A page or section gets exactly one hero moment — the thing the eye is supposed to lock onto first. Everything else either sets it up (entrance sequencing that leads the eye toward it) or supports it (subtler, faster, quieter). If five things move with equal weight at once, the viewer's attention fragments and nothing reads as important. This is the single most common failure mode in AI-generated and junior motion work: uniform stagger, uniform duration, uniform easing, applied indiscriminately to every element on the page, which produces motion that is technically present and expressively inert.

Scroll on a flagship site is a narrative device, not a scrollbar. Think in acts, not sections. And the most underused tool in the kit is stillness: a full viewport with nothing moving, right after something big just happened, is what separates a luxury brand's site from a SaaS landing page. Mercedes-Benz, Porsche, and Rolls-Royce websites move less than you'd expect, not more — the restraint is the flex.

## Easing vocabulary — what each curve communicates

| Curve family | Cubic-bezier (CSS/Motion array form) | GSAP ease string | Reads as | Use for |
|---|---|---|---|---|
| Expo out | `cubic-bezier(0.16, 1, 0.3, 1)` | `"expo.out"` | Confident, decisive, premium | Hero entrances, primary CTAs, page-transition reveals |
| Quint out | `cubic-bezier(0.22, 1, 0.36, 1)` | `"power4.out"` | Smooth, controlled, still premium but slightly softer | Element/card transitions, modal opens, image reveals |
| Quint in-out | `cubic-bezier(0.83, 0, 0.17, 1)` | `"power4.inOut"` | Deliberate, weighted | Scroll-scrubbed transforms, pinned-section internal motion |
| Circ out | `cubic-bezier(0, 0.55, 0.45, 1)` | `"circ.out"` | Crisp deceleration, slightly mechanical-premium | UI micro-interactions (toggles, chips, tabs) |
| Back out (overshoot) | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `"back.out(1.7)"` | Playful, energetic, a little cheeky | Consumer/playful brands, success states, badges — never on a luxury/enterprise brand |
| Spring (physics) | Motion `type: "spring"`, `{ stiffness, damping }` | `elastic.out()` / GSAP physics2D plugin | Organic, alive, responsive to gesture | Drag-release, hover feedback, anything the user physically touches |
| Linear | `linear` | `"none"` | Mechanical, constant-velocity, "driven by an external force" | Marquees, progress bars, scroll-scrub-tied transforms, loading spinners — never for state-change entrances/exits |

Rule of thumb: the more "out"-weighted and elongated the curve (long slow tail), the more expensive and confident it reads. The more symmetric or bouncy, the more casual/consumer it reads. Match the curve family to the brand brief before matching it to the component.

Motion's built-in named eases are limited to `"linear"`, `"easeIn"/"easeOut"/"easeInOut"`, `"circIn"/"circOut"/"circInOut"`, `"backIn"/"backOut"/"backInOut"`, `"anticipate"`. There is no built-in `"expo"` or `"quint"` — for those, pass the bezier array directly (`ease: [0.16, 1, 0.3, 1]`). GSAP ships the full named ease library (`power1`–`power4`, `expo`, `circ`, `back`, `elastic`, `bounce`, each with `.in`/`.out`/`.inOut`) — `power4` is GSAP's closest built-in analogue to a quint curve.

## Duration scale

| Tier | Range | Applies to |
|---|---|---|
| Micro-interaction | 150–250ms | Hover, focus ring, toggle, button press, tooltip, checkbox |
| Element transition | 400–700ms | Card enter/exit, modal, drawer, tab switch, image swap, nav reveal |
| Hero statement | 800–1400ms | Page-load hero sequence, section climax, pinned-chapter payoff, hero copy reveal |

Never let a micro-interaction creep past ~300ms — anything a user directly triggers and expects immediate feedback from (buttons, toggles, form fields) must resolve fast or the UI feels laggy, not premium. Conversely, never let a hero statement resolve in under ~700ms — a rushed hero reads cheap, not efficient. Duration and easing are coupled: long expo/quint-out curves need duration in the upper half of their tier to read as intentional; a 1400ms `easeOut` linear-ish curve just reads slow.

## Motion token system

Define once, consume everywhere. Two representations of the same values: CSS custom properties for anything CSS/Tailwind-driven, and a TS module for Motion/GSAP defaults.

```css
/* app/globals.css */
:root {
  /* Eases */
  --ease-confident: cubic-bezier(0.16, 1, 0.3, 1);   /* expo out — hero, CTA */
  --ease-smooth:    cubic-bezier(0.22, 1, 0.36, 1);   /* quint out — elements */
  --ease-weighted:  cubic-bezier(0.83, 0, 0.17, 1);   /* quint in-out — scrub */
  --ease-crisp:     cubic-bezier(0, 0.55, 0.45, 1);   /* circ out — micro-UI */
  --ease-playful:   cubic-bezier(0.34, 1.56, 0.64, 1); /* back out — use sparingly */
  --ease-mechanical: linear;                          /* marquees, scrub only */

  /* Durations */
  --dur-micro: 200ms;
  --dur-element: 550ms;
  --dur-hero: 1100ms;
}
```

```ts
// lib/motion-tokens.ts
// Single source of truth consumed by both Motion (arrays) and GSAP (strings).

export const ease = {
  confident: [0.16, 1, 0.3, 1] as const,   // expo out
  smooth: [0.22, 1, 0.36, 1] as const,     // quint out
  weighted: [0.83, 0, 0.17, 1] as const,   // quint in-out
  crisp: [0, 0.55, 0.45, 1] as const,      // circ out
  playful: [0.34, 1.56, 0.64, 1] as const, // back out
} as const;

export const gsapEase = {
  confident: "expo.out",
  smooth: "power4.out",
  weighted: "power4.inOut",
  crisp: "circ.out",
  playful: "back.out(1.7)",
  mechanical: "none",
} as const;

export const duration = {
  micro: 0.2,   // seconds — GSAP + Motion both take seconds when using tween syntax
  element: 0.55,
  hero: 1.1,
} as const;

export const spring = {
  // physics-based, for gesture-driven / interactive motion only
  responsive: { type: "spring", stiffness: 260, damping: 24 } as const,
  gentle: { type: "spring", stiffness: 120, damping: 20 } as const,
};
```

## Choreography principles

1. **One hero moment per viewport.** Before animating anything, name the single element the eye must land on. Everything else in that viewport is either a setup beat (leads the eye toward it) or a support beat (quieter, faster, later). If you can't name the hero moment, you're not choreographing, you're decorating.
2. **Parent-then-children.** Containers never animate at the same time as their contents at full force. Stagger from the container outward: the container's own transform/opacity leads, children follow with a delay offset. Motion's `staggerChildren` + `delayChildren` on the parent variant is the direct implementation.
3. **Stagger has a ceiling.** 6–8 items is the practical max for a visible per-item stagger (60–100ms apart). Beyond that, either batch them (reveal in groups of 3–4) or switch to a mask/clip-path sweep so the user isn't waiting through a visible queue.
4. **Emphasis is rarer than entrance.** Not every hover needs a flourish. Reserve emphasis motion (scale, glow, underline draw) for interactive elements that matter to the primary task — nav CTA, product card, purchase button — not for every list item on the page.
5. **Exit is faster than entrance.** Roughly 50–70% of the entrance duration, with an ease-in curve (accelerating away) rather than ease-out. Things should leave the stage quicker than they arrived — a slow exit reads as the UI being unsure whether the user is really done with it.

## Entrance / emphasis / exit grammar

Define the grammar once per project and apply it consistently — this is what makes disparate components feel like one system.

| Beat | Typical transform | Typical duration/ease |
|---|---|---|
| Entrance | `opacity 0→1` + `y: 16→0` (or `clip-path` reveal for hero type) | element tier, `ease-smooth` |
| Emphasis (hover/active) | `scale 1→1.02–1.05`, or underline/border draw, or subtle shadow lift | micro tier, `ease-crisp` |
| Exit | `opacity 1→0` + `y: 0→-8` (moving the *same* axis, shorter distance) | ~60% of entrance duration, ease-in variant of the same curve family |

Keep entrance and exit on the same axis/property family per component — if a card enters via `y` translate, it should exit via `y` translate too, not switch to a scale or rotate. Consistency of *which* property moves is what reads as "grammar" rather than randomness.

## Scroll narrative structures

Awwwards-tier sites treat the scroll axis like a film timeline, not a document. Structure in acts:

- **Act 1 — Curtain raiser (hero).** The one big statement. Generous hero-tier duration, `ease-confident`. This is the only place a truly slow, luxurious reveal belongs.
- **Act 2 — Build.** Context, features, proof. Faster pacing, shorter scroll-triggered reveals (`whileInView` / `ScrollTrigger` with `once: true`), no pinning yet — this is where the user covers ground.
- **Act 3 — Climax.** The pinned centerpiece: a product reveal, a data visualization scrubbing open, a 3D object rotating with scroll. This is the one section allowed to hijack scroll (pin + scrub) because it's earned narrative weight — don't pin more than one, maybe two, sections per page.
- **Act 4 — Resolution.** CTA, closing statement. Pacing settles back down, often mirrors Act 1's calm.

Two structural tools do the actual narrative work:

- **Speed contrast.** Alternate sections that require a lot of scroll distance for little visual change (breathing room, reading sections) with sections that require very little scroll distance for a big visual change (pinned/scrubbed payoff). The *contrast* between the two is what creates rhythm — a page that's uniformly "a bit of animation every scroll tick" has no rhythm at all.
- **Moments of stillness.** A full viewport, after a big moment, where literally nothing animates — just typography and whitespace, held for a beat before the next section starts. This is the highest-leverage, lowest-cost technique in the entire scroll-narrative toolkit and the one juniors skip because it feels like "not doing anything."

## Restraint rules — what NOT to animate

- Don't animate body copy on scroll. Reading text that's simultaneously moving or fading is an accessibility and comprehension problem, not a delight.
- Don't run more than one parallax layer per viewport. Stacked parallax layers fight each other and tank scroll-linked frame rate, especially on mobile.
- Don't animate the primary nav on every scroll tick (shrink/hide-on-scroll is fine as a single triggered state change, not a continuous transform driven by scroll position).
- Don't give every card/list item its own scroll-triggered entrance if there are more than ~8 — batch or skip.
- Don't loop more than one idle/ambient animation per viewport (e.g., a floating shape *and* a pulsing badge *and* a marquee, all at once) — idle motion competes for attention with itself.
- Don't animate things a screen reader or keyboard user can't perceive the benefit of and hasn't opted into — respect `prefers-reduced-motion` unconditionally (see gotchas below).
- Don't apply spring/bounce easing to a premium or enterprise brand's core interactions. Overshoot reads consumer/playful; if the brief says "premium," strike every `back.out` and `elastic` from the token set entirely.

## Stillness as luxury

The instinct on a marketing site is "more motion = more impressive." Flagship premium brands (Mercedes-Benz, Porsche, Rolls-Royce, and Apple's product pages) do the opposite: they hold static, fully-composed frames far longer than feels safe, use fewer simultaneous moving elements, and let a single slow reveal do the work instead of five fast ones. The signal being sent is confidence — the brand doesn't need to keep grabbing your attention because it's not worried you'll leave. Cheap-feeling sites move constantly because they're compensating.

Practical application: after any pinned/climax section, insert a stillness beat (a static full-viewport section, no scroll-triggered motion, generous whitespace, hold for at least one full viewport height of scroll) before starting the next act. When in doubt on a premium brief, cut a motion cue rather than add one — restraint is the deliverable, not a fallback.

## Patterns

### Motion tokens consumed in a component (entrance + stagger, App Router)

```tsx
// components/feature-grid.tsx
"use client";

import { motion } from "motion/react";
import { ease, duration } from "@/lib/motion-tokens";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.element, ease: ease.smooth },
  },
};

export function FeatureGrid({ items }: { items: { id: string; title: string }[] }) {
  return (
    <motion.ul
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px" }}
      className="grid grid-cols-1 gap-6 md:grid-cols-3"
    >
      {items.slice(0, 8).map((f) => (
        <motion.li key={f.id} variants={item}>
          {f.title}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### Hero — one moment, restrained support

```tsx
// components/hero.tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import { ease, duration } from "@/lib/motion-tokens";

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="flex min-h-screen items-center justify-center">
      <motion.h1
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.hero, ease: ease.confident }}
        className="text-6xl font-medium tracking-tight"
      >
        Engineering, not decoration.
      </motion.h1>
      {/* Supporting copy: shorter duration, later delay, no independent hero-weight motion */}
      <motion.p
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration.element, ease: ease.smooth, delay: 0.4 }}
        className="mt-4 text-lg text-neutral-500"
      >
        Everything else on this page supports that one line.
      </motion.p>
    </section>
  );
}
```

### GSAP + ScrollTrigger pinned chapter (Next.js App Router, `useGSAP` cleanup)

```tsx
// components/pinned-reveal.tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { gsapEase } from "@/lib/motion-tokens";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function PinnedReveal() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scope.current,
          start: "top top",
          end: "+=150%", // scroll distance the pin lasts for
          scrub: 1,       // ties progress to scroll position — linear feel is correct here
          pin: true,
        },
      });

      tl.fromTo(
        ".reveal-panel",
        { clipPath: "inset(0 0 100% 0)" },
        { clipPath: "inset(0 0 0% 0)", ease: gsapEase.weighted, duration: 1 }
      );
    },
    { scope } // auto-reverts all ScrollTriggers/tweens created here on unmount — no manual cleanup needed
  );

  return (
    <section ref={scope} className="relative h-screen overflow-hidden">
      <div className="reveal-panel absolute inset-0 bg-black" />
    </section>
  );
}
```

### Lenis smooth scroll wired to GSAP ScrollTrigger (root layout provider)

```tsx
// components/smooth-scroll-provider.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenis = useLenis(() => {
    ScrollTrigger.update();
  });

  useEffect(() => {
    if (!lenis) return;

    // Drive Lenis from GSAP's ticker instead of its own rAF loop — keeps
    // scroll-driven ScrollTrigger tweens perfectly in sync with Lenis smoothing.
    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
    };
  }, [lenis]);

  // autoRaf must be disabled or Lenis runs its own rAF loop *in addition to*
  // the gsap.ticker-driven one below — the exact double-drive this pattern exists to avoid.
  return (
    <ReactLenis root options={{ autoRaf: false }}>
      {children}
    </ReactLenis>
  );
}
```

```tsx
// app/layout.tsx (excerpt)
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
```

### Motion spec template — drop into a creative-direction doc

```
## Motion Spec — [Project Name]

Brand voice: [premium / playful / mechanical / editorial]

### Tokens
- ease-primary   : cubic-bezier(0.16, 1, 0.3, 1)   "confident glide" — hero + primary CTA only
- ease-secondary : cubic-bezier(0.22, 1, 0.36, 1)   element transitions, default for everything else
- ease-scrub     : cubic-bezier(0.83, 0, 0.17, 1)   scroll-tied / scrubbed transforms only
- ease-micro-ui  : cubic-bezier(0, 0.55, 0.45, 1)   hover, toggle, tab
- ease-spring    : stiffness 260 / damping 24        gesture-driven only — used on: [list components]
- ease-linear    : linear                            marquees + scrub-tied progress only

- dur-micro   : 200ms   (hover, toggle, focus)
- dur-element : 550ms   (card, modal, nav, tab switch)
- dur-hero    : 1100ms  (page-load hero, act climax)

### Choreography
- Hero moment per viewport: [name it, one per section]
- Stagger: container leads, children +80ms apart, cap at [6–8] visible items
- Entrance grammar: [e.g. opacity + 16px translate-y]
- Emphasis grammar: [e.g. scale 1→1.03 + shadow lift, hover/focus only]
- Exit grammar: [same axis as entrance, ~60% duration, ease-in]

### Scroll narrative
- Act 1 (Hero):      [description] — no pin
- Act 2 (Build):     [description] — light triggered reveals, no pin
- Act 3 (Climax):    [description] — pinned, scrubbed, THE one big moment
- Act 4 (Resolution):[description] — settles back to Act-1 pacing
- Stillness beats after: [Act 3 → before Act 4, min. 1 viewport height]

### Restraint rules for this project
- Do NOT animate: [body copy, >1 parallax layer, nav on every tick, ...]
- Max simultaneous idle/ambient loops per viewport: [1]
- Reduced-motion fallback: [opacity-only, near-instant durations, no parallax/pin]
```

## Integration gotchas

- **`"use client"` boundary.** Every component using `motion`, `useGSAP`, `useLenis`, or any hook from these libraries needs the directive at the top of the file. Keep the boundary as low in the tree as possible — don't mark a whole page client just because one child animates.
- **Hydration/CLS on above-the-fold content.** Never let LCP text mount at `opacity: 0` and depend on JS to reveal it — a slow hydration or JS failure leaves critical content invisible. Prefer `initial={false}` for anything crawler/SEO-critical, or drive the reveal via CSS `@starting-style`/animation rather than gating visibility entirely on a JS mount.
- **StrictMode double-invoke (dev only).** `useGSAP` is built on `gsap.context()` and auto-reverts everything it created on unmount/re-run, so it's StrictMode-safe out of the box. If you write raw `useEffect` + GSAP instead, you must manually wrap in `gsap.context()` and call `.revert()` in the cleanup function, or dev-mode double-mounting will leave duplicate ScrollTriggers.
- **ScrollTrigger measurements after layout shift.** Web fonts and images loading after initial paint change document height. Call `ScrollTrigger.refresh()` after `next/font` swaps and after images load (or use `next/image` with explicit `width`/`height` to avoid the shift entirely). On App Router client-side navigations, kill/refresh triggers on route change — stale triggers from a previous route silently break scroll math.
- **Don't double-drive the scroll loop.** If Lenis is present, let GSAP's ticker drive Lenis's `raf` (as shown above) rather than running Lenis's own `requestAnimationFrame` loop in parallel with GSAP's — running both desyncs scrub timing.
- **Respect `prefers-reduced-motion` unconditionally**, not just as a nice-to-have:
  - Motion: `const reduceMotion = useReducedMotion()` and branch `initial`/animate values, or wrap the whole app in `<MotionConfig reducedMotion="user">`.
  - GSAP: `gsap.matchMedia().add("(prefers-reduced-motion: reduce)", () => { /* short-circuit or skip pins */ })`.
  - This is not optional for a professional build — vestibular-disorder users can be made physically ill by scroll-jacked/parallax-heavy pages that ignore this setting.
- **Bundle size.** `motion` isn't huge but isn't free either — for large component trees, import the lazy API (`LazyMotion` + `domAnimation` + the lowercase `m` component) instead of the full `motion` component when only entrance/exit is needed, deferring gesture/layout features.
- **`gsap.registerPlugin(...)` must run before use, once, at module scope** — calling it inside a component body on every render is harmless but wasteful; hoist it to module top-level as shown in the patterns above.

## Pitfalls (the tells of AI-generic or broken motion)

- **The universal `whileInView` fade-up-20px-on-everything.** Every section, every card, every heading doing the exact same `opacity + y:20` reveal with the same duration is the single most recognizable "AI built this" signature. Vary the grammar by hierarchy (see Entrance/Emphasis/Exit above), and let some things simply *be there* with no entrance at all.
- **Uniform duration and easing across unrelated components.** If the hero, the pricing card, and the footer newsletter form all animate with the same 300ms ease-out, there's no hierarchy — everything reads equally (un)important.
- **Bounce/spring on serious brands.** `back.out`/elastic easing on a fintech, legal, medical, or luxury automotive site instantly undercuts the "premium/trustworthy" read the client is paying for.
- **Parallax on text.** Text moving at a different scroll speed than its container blurs during scroll on most displays and actively hurts readability — restrict parallax to background imagery/shapes, never typography you need people to read while it's in motion.
- **Scroll-jacking without a payoff.** Pinning a section just because pinning is available, with no actual narrative reason (no reveal, no state change worth holding scroll for), frustrates users trying to get past it — especially on mobile where pin+scrub math is far more failure-prone.
- **Mobile scrub math breaks from viewport-unit resize.** Mobile browser chrome (address bar show/hide) changes `100vh` mid-scroll and desyncs `ScrollTrigger` pin distances calculated in vh. Use `100dvh`/`100svh` or recalculate on `resize` with debounce, and test on a real device, not just devtools' mobile emulation.
- **Too many simultaneous idle loops.** A floating blob, a pulsing CTA, and an auto-scrolling marquee all looping at once on the same screen is visual noise competing with itself, not "lively."
- **Missing `will-change` cleanup / memory bloat.** Leaving `will-change: transform` permanently set on many elements (rather than toggling it on right before animating and removing it after) forces the browser to maintain compositor layers for elements that aren't actively animating, tanking scroll FPS on lower-end devices.
- **No reduced-motion path at all.** Ships fine in a demo, fails an accessibility review, and is a legal exposure for enterprise clients in regulated industries.
- **Testing only on a fast desktop with devtools open.** GSAP/Lenis/scroll-heavy builds that feel buttery on a dev machine routinely drop to unusable frame rates on a mid-tier Android phone with CPU throttled — profile with throttling on and on at least one real low/mid-tier device before calling a scroll sequence done.
