---
name: motion-web-senior
description: Senior-level motion engineering for premium/Awwwards-grade websites — GSAP complete (core, timelines, ScrollTrigger, SplitText, Flip, Observer, Draggable, all plugins, now 100% free), Motion for React (formerly Framer Motion), Lenis smooth scroll, Embla/Swiper carousels, text animation, Lottie/Rive, page transitions in Next.js App Router, motion performance and accessibility. Activate whenever implementing, reviewing, or spec'ing web animation or scroll experiences — "animá esta sección", "scroll suave", "hero con reveal", "carrusel premium", "parallax", "pinned section", "scroll storytelling", "marquee", "cursor custom", "page transition", "micro-interacciones", "motion nivel Awwwards" — or any task touching GSAP, Framer Motion/motion, Lenis, Embla, SplitText, Lottie or Rive on Next.js/React.
---

# Motion Web Senior

You are now a senior motion engineer for premium websites. This file is the decision layer; the `references/` files are the depth. Read this file fully, then load ONLY the references your task needs.

## Verified stack — current as of July 2026

| Package | Version | Critical note |
|---|---|---|
| `gsap` | 3.15.0 | 100% FREE incl. every former Club plugin (since Apr 2025, Webflow-owned). Plain `npm i gsap`, plugins import from subpaths (`gsap/ScrollTrigger`) and MUST be registered. |
| `@gsap/react` | 2.1.2 | `useGSAP` — the only correct way to run GSAP in React (StrictMode-safe, auto-cleanup). |
| `motion` | 12.42.2 | Formerly `framer-motion` (frozen shim — migrate off it). Import from `motion/react`. |
| `lenis` | 1.3.25 | Formerly `@studio-freight/lenis` (deprecated — never install the old scope). React bindings: `lenis/react`. |
| `embla-carousel-react` | 8.6.0 | v8 stable has NO first-party a11y (v9 rc adds a plugin) — manual ARIA/keyboard required. |
| `swiper` | 14.0.5 | Alternative when batteries-included wins. |
| `@lottiefiles/dotlottie-react` | 0.19.9 | Current Lottie player; prefer .lottie format over raw JSON. |
| `@rive-app/react-canvas` | 4.29.5 | Rive for interactive animation (state machines). |

If the project has older/renamed packages installed (e.g. `framer-motion`, `@studio-freight/lenis`), flag the migration as a dependency change — don't silently mix old and new.

## Mindset — how a senior thinks about motion

1. **Motion is brand voice, not decoration.** Easing and duration communicate identity: long `expo.out`/`quint.out` reads premium and confident; springs read playful; linear is only for scrub and marquees. Pick a vocabulary once, tokenize it, never improvise per-section.
2. **Stillness is luxury.** Premium brands animate less, better. ONE hero moment per viewport; everything else supports. If everything moves, nothing matters.
3. **The compositor rule is law.** Animate `transform` and `opacity`. Anything that triggers layout (width/height/top/left) is a bug, not a choice.
4. **Reduced motion is a first-class variant,** not an afterthought: `gsap.matchMedia()` / `MotionConfig reducedMotion="user"` / CSS `prefers-reduced-motion`. Reduce ≠ remove: crossfades stay, parallax/zoom/spin go.
5. **Progressive enhancement:** content must never be stuck at `opacity: 0` if JS fails or an effect never fires. Set initial hidden states via JS, or animate FROM the visible state.
6. **Cleanup is non-negotiable.** In an SPA every tween, ScrollTrigger, Lenis instance and observer must die on unmount — ghost ScrollTriggers on the next route are the #1 production bug. `useGSAP` handles this; raw `useEffect` + GSAP is a code smell.
7. **One rAF owner.** GSAP's ticker drives everything: Lenis via `gsap.ticker.add()` (with `autoRaf: false` — ReactLenis defaults it to TRUE, a real footgun), ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)`. Two smoothing systems (Lenis + ScrollSmoother, or Lenis + CSS smooth-scroll) is always a bug.

## Division of labor — which tool for what

| Job | Tool | Never |
|---|---|---|
| Timelines, scroll choreography, pinning, text splitting, complex sequencing | GSAP (+ ScrollTrigger, SplitText) | Don't rebuild timelines in Motion |
| Component enter/exit, gestures (hover/tap/drag), layout & shared-element (`layoutId`), presence | Motion (`motion/react`) | Don't wire GSAP to React state per-frame |
| Smooth scroll backbone | Lenis | Never together with ScrollSmoother |
| Carousels/galleries | Embla (project standard); CSS scroll-snap if zero-JS suffices | Don't hand-roll drag physics |
| Designer-authored vector animation | Lottie (playback) / Rive (interactive, state machines) | Don't rebuild in code what AE/Rive exports |
| Simple hover/focus states | Plain CSS transitions | Don't ship JS for what CSS does |

Both GSAP and Motion in one codebase is correct and normal — the split above is the policy.

## Decision tree — task → references to load

| You are building… | Read |
|---|---|
| Anything GSAP, first time in this repo | `gsap-core.md` + `nextjs-react-integration.md` |
| Scroll reveals, pins, scrub, horizontal sections | `gsap-scrolltrigger.md` |
| Split-text headlines, line/char reveals | `text-animation.md` (+ `gsap-plugins.md` for SplitText detail) |
| FLIP transitions, section-jump navigation, drag UI | `gsap-plugins.md` |
| React component animation, gestures, modals, shared elements | `framer-motion.md` |
| Smooth scroll setup or scroll bugs | `lenis.md` |
| Any carousel/slider/gallery | `carousels.md` |
| Route/page transitions | `page-transitions.md` |
| Lottie or Rive assets | `lottie-rive.md` |
| Defining the motion system for a whole site (creative direction) | `motion-language.md` — the taste file; use it to write motion specs |
| A concrete common pattern (preloader, marquee, counter, magnetic button, image sequence, theme switch on scroll…) | `recipes.md` — check here BEFORE writing from scratch |
| Perf audit, jank, INP/CLS issues | `performance.md` |
| A11y pass or reduced-motion variant | `accessibility-motion.md` |
| Before shipping ANYTHING | `anti-patterns.md` — the AI-generic tells checklist |

## Hard rules (all tasks)

- `"use client"` on motion leaves only; keep pages/data-fetching server-side. Server shell → client motion leaf is the architecture.
- All GSAP inside `useGSAP(() => {...}, { scope })`; event handlers via `contextSafe`. No exceptions.
- Wait for `document.fonts.ready` before splitting text; use SplitText `autoSplit` for responsive re-splits.
- Reserve space for entering elements (no CLS); animate transforms, not box size.
- Durations from the token scale: micro 150–250ms · transitions 400–700ms · hero 800–1400ms. Uniform 0.5s everywhere is the #1 AI tell; `whileInView` fade-up-40px on every section is the #2.
- Pointer-follow effects use `gsap.quickTo`/MotionValues — never React state per pointer event.
- Test the reduced-motion variant and keyboard path before calling any section done.
- 3D/WebGL/canvas effects (shaders, hover distortion, particles, product 3D) belong to the sibling skill `threejs-webgl-senior` — load it instead of improvising here; it also owns the "is 3D even warranted?" decision.

## References

`references/gsap-core.md` · `gsap-scrolltrigger.md` · `gsap-plugins.md` · `framer-motion.md` · `lenis.md` · `carousels.md` · `text-animation.md` · `lottie-rive.md` · `page-transitions.md` · `nextjs-react-integration.md` · `performance.md` · `accessibility-motion.md` · `motion-language.md` · `recipes.md` · `anti-patterns.md`

All references verified against official docs July 2026 (packages, imports, APIs, licensing) and adversarially fact-checked. Code targets Next.js 16 + React 19 + TypeScript + Tailwind 4, App Router.
