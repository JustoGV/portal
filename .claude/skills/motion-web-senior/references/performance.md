# Motion Performance

Engineering discipline for keeping animated, scroll-driven, and pointer-reactive UI at 60fps (or 120fps on ProMotion/high-refresh) without wrecking INP, CLS, or low-end mobile battery.

## Current as of July 2026

| Library | Package | Version | Install | License |
|---|---|---|---|---|
| Motion (formerly Framer Motion) | `motion` | 12.42.2 | `npm i motion` | MIT |
| GSAP + all plugins (ScrollTrigger, SplitText, MorphSVG, DrawSVG, etc.) | `gsap` | 3.15.0 | `npm i gsap` | Free "no charge" standard license (Webflow-sponsored since Apr 2025) — no Club, no paid tier, commercial use included |
| GSAP React bindings | `@gsap/react` | 2.1.2 | `npm i @gsap/react` | Same GSAP standard "no charge" license as `gsap` core (not MIT) |
| Lenis smooth scroll | `lenis` | 1.3.25 | `npm i lenis` | MIT |

Naming gotchas an agent must not get wrong:
- `framer-motion` still exists on npm and still installs, but it is the legacy name — frozen, not actively developed. New code imports from **`motion/react`**, not `framer-motion`.
- `@studio-freight/lenis` and `@studio-freight/react-lenis` are dead — Studio Freight became Darkroom Engineering. Install plain **`lenis`**, import the React wrapper from **`lenis/react`**.
- GSAP plugins that used to require a paid Club GreenSock membership (SplitText, MorphSVGPlugin, DrawSVGPlugin, Physics2DPlugin, InertiaPlugin, ScrollSmoother, CustomBounce/CustomWiggle, etc. — **not** ScrollTrigger or Draggable, which were already part of the free "no charge" plugin set before the change) are now bundled in the public `gsap` npm package. Do not gate a recommendation behind "but that plugin is paid" — it isn't, as of GSAP 3.13+ (April 2025).

## Mental model

A senior does not ask "is this animation smooth on my dev machine." They ask three questions in order: **what does this animation cost the browser per frame, does it cost anything when nobody is looking at it, and does it cost React a re-render.** Every animation decision traces back to the render pipeline: Style → Layout → Paint → Composite. Layout and Paint are expensive and block the main thread; Composite is cheap and runs on the GPU thread, decoupled from JS. The entire performance strategy is: push animated properties to Composite, and keep Layout/Paint out of the hot path entirely.

The second axis is who owns the value being animated. If React state owns it (`useState` + inline style, or a CSS class toggled by a render), every tick is a component re-render, a reconciliation pass, possibly a re-layout of children — all for a value the DOM could have mutated directly. Motion's `MotionValue`s and GSAP's tweens write directly to the DOM/style outside React's render cycle. That's not a micro-optimization, it's the difference between an animation that costs 0.1ms/frame and one that costs 4-8ms/frame and starves INP.

The third axis is triage: not every animation deserves a JS library. A hover state, a loading spinner, a fade-in that doesn't need to be interrupted or sequenced dynamically — that's CSS `transition`/`@keyframes`, zero JS bytes, zero main-thread scheduling, browser-optimized. Reach for GSAP/Motion only when you need orchestration, scroll-linking, physics, gesture interruption, or values driven by runtime data. Using a JS animation library for a button hover is a tell that the code was AI-generated, not senior-authored.

## Compositor-only rule

**Only `transform` and `opacity` are guaranteed cheap (Composite-only, no Layout, no Paint) across all browsers.**

| Property | Pipeline stage triggered | Verdict |
|---|---|---|
| `transform` (translate/scale/rotate/skew) | Composite only | Always safe to animate |
| `opacity` | Composite only | Always safe to animate |
| `filter` (blur, brightness, etc.) | Composite (own render surface) but forces a separate GPU pass; `blur()` in particular is costly at large radii | Animate sparingly, small elements only, avoid animating blur radius on full-viewport elements |
| `backdrop-filter` | Composite (own render surface), expensive to rasterize every frame | Avoid animating; set once, don't tween |
| `width` / `height` / `top` / `left` / `margin` / `padding` | Layout → Paint → Composite | Never animate. Use `transform: scale()` or `translate()` instead |
| `box-shadow` | Paint → Composite | Never animate directly; fake it with a pseudo-element opacity crossfade of two pre-rendered shadows |
| `background-color` / `color` | Paint → Composite | Cheap-ish but still repaints; fine for slow crossfades, avoid on every scroll tick |
| `clip-path` | Composite in modern Chromium/Safari (GPU rasterized), Paint in older engines | Safe to animate in current evergreen browsers, test on target Safari version |

Rule of thumb: if it's not `transform` or `opacity`, ask "can I fake this with a transform instead" before animating it. Growing a card on hover → `transform: scale()`, not `width`/`height`. Sliding a panel in → `transform: translateX()`, not `left`. Expanding an accordion → animate `transform: scaleY()` on an inner wrapper with `transform-origin: top`, or use the FLIP technique, not `height: auto`.

## will-change discipline

`will-change` promotes an element to its own compositor layer *before* the animation starts, avoiding a layer-promotion stutter on the first frame. It is not a free performance boost — every promoted layer consumes GPU memory and, with too many layers, can *cause* jank ("layer explosion") instead of preventing it.

Rules:
1. **Apply it right before the animation starts, remove it right after it ends.** Never set it in static CSS on a class that's always applied.
2. **Never blanket-apply** `will-change: transform` to a whole section, list, or `*`. Target the specific animating element.
3. In JS-driven animation (GSAP/Motion), let the library manage this — both add the browser-equivalent hint automatically for the duration of the tween in most cases; you rarely need to hand-manage `will-change` when the animation is authored in GSAP/Motion. Hand-manage it only for pure-CSS animations/transitions where the class toggles are outside your control timing-wise.
4. Pattern for manual use:

```css
.card {
  transition: transform 0.3s ease;
}
.card:hover {
  will-change: transform;
  transform: translateY(-4px);
}
```

For a JS-driven sequence, set it on `animationstart`/before `gsap.to()` and clear on `onComplete`:

```ts
gsap.to(el, {
  x: 200,
  duration: 0.5,
  onStart: () => { el.style.willChange = "transform"; },
  onComplete: () => { el.style.willChange = "auto"; },
});
```

## Reading Chrome DevTools Performance and Layers panels

Workflow for diagnosing jank:

1. **Performance panel → record** while triggering the animation. Look at the **Frames** track: green/red bars over 16.6ms (60fps budget) or 8.3ms (120fps budget) are dropped frames.
2. Expand the **Main** thread flame chart during a janky frame. Purple blocks = Layout ("Recalculate Style" / "Layout"), green blocks = Paint, teal = Composite. A janky transform/opacity animation showing purple/green blocks means something in the animated property list is not compositor-only — go back to the compositor table above and find the offending property.
3. **Rendering tab** (Cmd/Ctrl+Shift+P → "Show Rendering") → enable **"Paint flashing"** to see green flashes over every repainted region live. Enable **"Layer borders"** to see which elements got their own compositor layer (orange/cyan outlines) — confirms `will-change`/`transform` actually promoted the element.
4. **Layers panel** (three-dot menu → More tools → Layers) shows every compositor layer, its memory cost, and *why* it was created ("has a 3D transform", "will-change: transform", "backdrop-filter", etc.). Use this to catch accidental layer explosion — dozens of small layers usually means a `will-change` or `transform` was applied to a repeated list item that shouldn't have been individually promoted.
5. **Performance Insights / "Interactions" track** shows INP breakdown per interaction: input delay, processing time, presentation delay. A pointer handler doing `setState` on every `mousemove` shows up as long "processing" segments here.
6. For scroll-linked animation specifically, check the **"Scrolling performance issues"** flag DevTools surfaces automatically in the Performance panel summary when a scroll handler is non-passive or forces synchronous layout (a Layout Thrashing pattern — reading `getBoundingClientRect()` then writing a style in the same tick, repeated every scroll event).

## fps and INP budgets

| Target | Frame budget | Note |
|---|---|---|
| 60fps (baseline) | 16.6ms/frame | Minimum bar for any animation that runs longer than ~200ms |
| 120fps (ProMotion/high-refresh) | 8.3ms/frame | Aspirational for hero/marketing sites on modern hardware; degrade gracefully, don't chase this on mid-tier Android |
| INP good | ≤ 200ms | 75th percentile, Core Web Vital, measured per interaction across the session |
| INP needs improvement | 200-500ms | |
| INP poor | > 500ms | |

INP is killed by main-thread-blocking work triggered by an interaction: a `setState` in a `mousemove`/`scroll` handler that cascades into a big re-render, a synchronous layout read/write loop, or a heavy `onClick` handler that isn't yielding. Animation-adjacent INP killers to actively avoid:
- Driving cursor-follow/parallax effects through React state instead of `MotionValue`/GSAP `quickTo`.
- Running `ScrollTrigger` callbacks that call `setState` on every scroll tick instead of only at discrete thresholds.
- Not debouncing/throttling `resize` handlers that recompute animation targets.

## CLS caused by entrance animations

Entrance animations (fade-up, slide-in, reveal-on-scroll) are a top CLS source when done carelessly, because the element occupies zero or partial space before the animation completes, and its final layout box shifts the page as it "settles."

Rules:
1. **Reserve final layout space at initial render.** The element's box (width/height) must exist in the DOM at its final size from first paint — animate `opacity`/`transform` on content *inside* that reserved box, never animate the box itself into existence.
2. **Animate `transform: translateY()`, never `margin-top`/`top`/`height`** for a "slide up on scroll into view" effect — a translated element doesn't affect layout of siblings, so it can't shift them.
3. **Set the initial (pre-animation) state via CSS or `style` prop that matches server-rendered markup**, not via a `useEffect` that mutates after mount — the goal is zero flash-of-unstyled-then-jump. With Motion, use `initial`/`animate` props (SSR-safe, no flash). With GSAP, set `gsap.set()` in the same tick as `useGSAP`'s layout-effect timing, or better, pre-hide via CSS class + `autoAlpha` so there's no unstyled flash before JS hydrates.
4. **`content-visibility: auto`** on long offscreen sections is safe for CLS as long as you pair it with `contain-intrinsic-size` set to the section's real approximate height — without it, the browser's placeholder size differs from actual content size and causes a shift when the section enters the viewport.

```tsx
// Motion — SSR-safe entrance, box reserved, no CLS
"use client";
import { motion } from "motion/react";

export function RevealCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-[220px]" // reserved box, prevents late layout shift
    >
      {/* content */}
    </motion.div>
  );
}
```

## Avoiding React re-render-driven animation

The single most common AI-generated-code smell: `const [x, setX] = useState(0)` updated on every `mousemove`/`scroll`/`requestAnimationFrame` tick, then applied via inline `style={{ transform: \`translateX(${x}px)\` }}`. Every tick triggers reconciliation of the component (and its subtree, unless memoized) for a DOM mutation that should never have touched React at all.

**Motion fix — `MotionValue`:**

```tsx
"use client";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef } from "react";

export function MagneticButton() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const springY = useSpring(y, { stiffness: 300, damping: 30 });
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      x.set((e.clientX - rect.left - rect.width / 2) * 0.3);
      y.set((e.clientY - rect.top - rect.height / 2) * 0.3);
    };
    const handleLeave = () => { x.set(0); y.set(0); };
    el.addEventListener("pointermove", handleMove);
    el.addEventListener("pointerleave", handleLeave);
    return () => {
      el.removeEventListener("pointermove", handleMove);
      el.removeEventListener("pointerleave", handleLeave);
    };
  }, [x, y]);

  // style={{ x: springX, y: springY }} writes directly to the DOM node,
  // zero component re-renders per pointer tick
  return <motion.button ref={ref} style={{ x: springX, y: springY }}>Hover me</motion.button>;
}
```

**GSAP fix — `quickTo` (throttled pointer handler without setState):**

```tsx
"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function MagneticButtonGsap() {
  const ref = useRef<HTMLButtonElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    // quickTo returns a reusable tween-setter, far cheaper than
    // calling gsap.to() on every event — no new tween object per call
    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });

    const handleMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      xTo((e.clientX - rect.left - rect.width / 2) * 0.3);
      yTo((e.clientY - rect.top - rect.height / 2) * 0.3);
    };
    const handleLeave = () => { xTo(0); yTo(0); };

    el.addEventListener("pointermove", handleMove);
    el.addEventListener("pointerleave", handleLeave);
    return () => {
      el.removeEventListener("pointermove", handleMove);
      el.removeEventListener("pointerleave", handleLeave);
    };
  }, { scope: ref }); // useGSAP auto-reverts tweens on unmount

  return <button ref={ref}>Hover me</button>;
}
```

Never `setState` inside a `pointermove`/`scroll` listener to drive animation. If a value needs to also affect React-rendered content (e.g., a percentage label), read the `MotionValue` with `useMotionValueEvent` and update state only on meaningful, throttled thresholds — not every frame.

## Image-sequence vs video-scrub trade-offs

Both simulate "scrub through frames as the user scrolls" (product-reveal, 360 spins). Choose based on this table:

| | Image sequence (canvas-drawn PNG/WebP/AVIF frames) | Video with `currentTime` scrubbing |
|---|---|---|
| Scrub precision | Frame-exact, no seek latency | Seeking is async; `seeked` event lag causes stutter on fast scroll |
| File weight | Large total download (60-150 frames × per-frame size); mitigate with AVIF/WebP and aggressive compression | Single file, better compression ratio (H.264/AV1 delta frames), usually smaller total bytes |
| Decode cost | One-time image decode, then cheap canvas `drawImage` per frame | Video decoder must seek to a keyframe and decode forward — expensive per seek, worse if keyframes are sparse |
| Mobile Safari reliability | Reliable — plain canvas | Historically flaky (`requestVideoFrameCallback` support, autoplay/seek restrictions, iOS decode throttling in background tabs) |
| Alpha/transparency | Trivial (WebP/AVIF/PNG alpha) | Needs a chroma-key trick or two-video (RGB + alpha matte) hack, or WebM VP9 with alpha (inconsistent support) |
| Implementation complexity | Preload all frames, draw active frame to `<canvas>` on scroll progress | Set `video.currentTime` on scroll progress, must throttle and wait for `seeked` |
| Senior default | **Preferred for scroll-scrubbed hero sequences** — predictable, frame-exact, canvas-cheap | Use when the source is genuinely video (real footage, not a rendered spin) and total scrub range is short, so seek latency doesn't accumulate |

Minimal image-sequence scrub pattern (canvas, not DOM `<img>` swapping — swapping `<img src>` per frame causes decode jank and layout thrash at scale):

```tsx
"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 90;
const frameUrl = (i: number) => `/sequence/frame-${String(i).padStart(4, "0")}.webp`;

export function ScrubSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef<HTMLImageElement[]>([]);
  const frame = useRef({ index: 0 });

  useEffect(() => {
    images.current = Array.from({ length: FRAME_COUNT }, (_, i) => {
      const img = new Image();
      img.src = frameUrl(i);
      return img;
    });
  }, []);

  useGSAP(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const img = images.current[frame.current.index];
      if (img?.complete) ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
    };

    const st = gsap.to(frame.current, {
      index: FRAME_COUNT - 1,
      ease: "none",
      snap: "index",
      scrollTrigger: {
        trigger: canvasRef.current,
        start: "top top",
        end: "+=3000",
        scrub: 0.5,
        pin: true,
      },
      onUpdate: draw,
    });

    return () => { st.kill(); }; // extra safety on top of useGSAP's own revert
  }, { scope: canvasRef });

  return <canvas ref={canvasRef} width={1280} height={720} className="w-full h-auto" />;
}
```

## Offloading to canvas when DOM count explodes

Once a scene needs more than roughly 150-300 simultaneously animating DOM nodes (particle fields, generative backgrounds, large data-driven grids with per-item motion), the browser's per-element overhead (style recalculation, layer management, paint invalidation bookkeeping) dominates even when every individual animation is compositor-only. Symptoms: DevTools shows thousands of tiny "Recalculate Style" or "Update Layer Tree" entries, not big Layout/Paint blocks.

Decision rule: if the animated element count is data-driven and can grow unbounded (particles, node graphs, live-updating dashboards with many indicators), render it on `<canvas>` (2D context for simple cases, WebGL/`three.js`/`pixi.js` for anything with blending, thousands of sprites, or shader effects) instead of one DOM node per item. Canvas draws are a single paint call regardless of item count; DOM animation cost scales roughly linearly with node count. Keep interactive/accessible elements (buttons, links, form fields, text needing to be selectable or screen-reader-visible) as real DOM — never move interactive/semantic content to canvas for a performance win, that's an accessibility regression, not an optimization.

## Memory hygiene

Every tween, ScrollTrigger, timeline, and event listener created during a component's life must be torn down on unmount, or it keeps running against a detached DOM node (silent memory leak, and in dev with React 19 StrictMode's double-invoke, duplicate leaked instances stacking up).

**GSAP:** use `useGSAP` from `@gsap/react` — it wraps `gsap.context()` and automatically reverts every tween/ScrollTrigger/Draggable created inside its callback when the component unmounts or dependencies change. This is StrictMode-safe: context revert on the first (dev-only double) mount cleans up correctly before the second mount runs.

```tsx
useGSAP(() => {
  gsap.to(".el", { x: 100 });
  ScrollTrigger.create({ trigger: ".el", start: "top center" });
}, { scope: containerRef }); // no manual cleanup needed — auto-reverted on unmount
```

If not using the hook (e.g., inside a plain `useEffect`), kill explicitly:

```tsx
useEffect(() => {
  const tween = gsap.to(".el", { x: 100 });
  const st = ScrollTrigger.create({ trigger: ".el", start: "top center" });
  return () => {
    tween.kill();
    st.kill();
  };
}, []);
```

**Motion:** animations started via the `animate()` imperative API return a controls object with `.stop()` — call it in a cleanup function. Declarative `<motion.div animate={...}>` usage cleans itself up automatically when the component unmounts (no manual action needed) because Motion ties the animation lifecycle to the component's own mount lifecycle.

```tsx
useEffect(() => {
  const controls = animate(el, { x: 100 }, { duration: 0.5 });
  return () => controls.stop();
}, []);
```

**Tab-hidden pausing:** any `requestAnimationFrame`-driven loop (custom rAF ticker, GSAP's global ticker, particle sims) keeps burning CPU/battery in a backgrounded tab unless paused. GSAP's global ticker auto-throttles via `requestAnimationFrame` (which browsers already throttle in hidden tabs), but long-running heavy loops (WebGL render loops, canvas particle sims) should explicitly listen for visibility:

```ts
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    gsap.globalTimeline.pause();
  } else {
    gsap.globalTimeline.resume();
  }
});
```

For scroll-linked work specifically, also call `ScrollTrigger.refresh()` after any layout-affecting async content load (images, fonts, dynamically injected sections) — stale trigger positions are the most common cause of "scroll animation breaks after navigating back" bug reports.

## Low-end mobile testing protocol

A senior never ships scroll/motion-heavy work validated only on a dev laptop. Minimum verification pass before calling it done:

1. **Chrome DevTools → Performance panel → CPU throttling → 4x slowdown** (or 6x for a harder floor), record the full scroll-through of the page. Confirm no frame exceeds ~33ms (2 frames dropped) during steady-state scroll, and no long task exceeds 200ms during an interaction.
2. **Network throttling → Fast 3G / Slow 4G** in parallel with CPU throttle, to catch image-sequence/video-scrub assets that aren't preloaded/prioritized correctly and cause the first scrub to visibly stall.
3. **Real Android device test is mandatory for anything scroll-pinned or canvas/WebGL-heavy** — Chrome's CPU throttle does not model thermal throttling, GPU driver differences, or the actual compositor behavior of a mid-tier Android GPU (Mali/Adreno mid-range). A mid-tier Android device (not a flagship) from the last 2-3 years is the realistic performance floor for a public marketing site; iOS Safari's own quirks (momentum scroll interaction with `position: sticky`/pinning, `backdrop-filter` cost) also don't show up in desktop Chrome at all and need a real device or at minimum Safari's own responsive device mode plus BrowserStack/real hardware for anything pin/scrub heavy.
4. **`prefers-reduced-motion`** — test with the OS setting on. Every scroll-triggered/entrance animation must degrade to a simple opacity fade or instant appearance, never fully break layout (i.e., never rely on the animation itself to reveal content that would otherwise stay invisible).
5. Watch DevTools **Memory panel** heap snapshot before/after navigating away and back to a scroll-heavy route several times — a rising heap floor across cycles means tweens/ScrollTriggers aren't being killed on unmount (see Memory hygiene above).

## When plain CSS animation is the correct senior choice

Reaching for GSAP or Motion by default is itself a mistake. Use plain CSS `transition`/`@keyframes` when:

- The animation is a simple state response (hover, focus, active, open/closed toggle) with no need for interruption logic, sequencing across multiple elements, or scroll-linking.
- The trigger is already a CSS-expressible state (`:hover`, `:focus-visible`, `:checked`, a toggled class/data-attribute) — no JS orchestration needed.
- It's a loading/skeleton shimmer, a spinner, or any infinite decorative loop — `@keyframes` with `animation: spin 1s linear infinite` costs nothing to maintain and nothing extra in bundle size.
- The interaction is binary (open/closed, on/off) rather than continuous/scrubbed (scroll progress, drag position, pointer-follow) — continuous, data-driven values are what GSAP/Motion are actually for.

Shipping a JS animation library for a button's hover state or a modal's fade-in is 30-80kb of unnecessary JS parsed/executed for something the browser's own compositor already handles for free, and it's one of the clearest tells of AI-generated code that never went through a senior review pass. Default to CSS; escalate to GSAP/Motion only when the requirement genuinely needs runtime orchestration, physics, gestures, or scroll-scrubbing that CSS cannot express (CSS Scroll-Driven Animations — `animation-timeline: scroll()`/`view()` — cover a growing subset of scroll-linked cases natively as of 2026 in Chromium; check current Safari/Firefox support before relying on it as the only implementation, since GSAP ScrollTrigger remains the safe cross-browser fallback).

## Pitfalls

- **Animating `height`/`width` for accordions and modals** instead of `transform: scaleY()` + `transform-origin`, or FLIP. Triggers Layout every frame.
- **`useState` + `mousemove`/`scroll` listener driving inline styles.** Always the #1 INP killer in AI-generated interactive sections. Use `MotionValue`/`useSpring` or `gsap.quickTo`.
- **Blanket `will-change: transform` on a whole `.container *` selector.** Causes layer explosion; DevTools Layers panel will show dozens of unnecessary layers.
- **Not killing ScrollTriggers/tweens on unmount** in a route that mounts/unmounts repeatedly (e.g., a modal, a tab panel, client-side navigation). Leaks accumulate, and orphaned ScrollTriggers keep listening to scroll against detached elements.
- **Forgetting `ScrollTrigger.refresh()`** after async content (images, fonts, CMS content) changes document height — trigger start/end positions silently desync from actual layout.
- **Entrance animations with no reserved layout space**, causing CLS the moment the element scrolls into view and "pops" into a different final size.
- **Swapping `<img src>` per frame for a "video" effect** instead of drawing to canvas — causes decode jank and repeated network/layout cost per frame at scale.
- **Ignoring `prefers-reduced-motion`.** Also an accessibility (WCAG 2.3.3) requirement, not just a performance nicety.
- **Testing only on M-series MacBook / flagship iPhone.** The animation that feels buttery in dev is frequently unusable on a 3-year-old mid-tier Android under real network conditions — this gap is the single most common reason "looks great in the demo, users complain it's laggy" tickets happen.
- **Importing all of GSAP's plugins globally** when only `ScrollTrigger` is used — `gsap.registerPlugin()` only the plugins actually referenced, to keep the client bundle lean (tree-shaking helps, but explicit registration keeps intent clear and avoids accidental large imports like `SplitText`/`MorphSVGPlugin` when unused).
- **Using `motion/react`'s `layout` prop indiscriminately on large lists.** Layout animations are powerful but each layout-animated element requires a measurement pass (FLIP under the hood); applying it to every item in a 200-row list reintroduces the exact Layout-thrash cost the compositor-only rule exists to avoid. Scope `layout` to the specific elements whose position/size actually needs to animate, and prefer `layoutId` for shared-element transitions over blanket `layout` on containers.
