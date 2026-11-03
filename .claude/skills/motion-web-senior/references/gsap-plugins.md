# GSAP Plugin Toolbox

Reference for using GSAP's non-ScrollTrigger plugins correctly inside Next.js 16 / React 19 / TypeScript / Tailwind 4 App Router projects.

## Current as of July 2026

| Package | Version | Notes |
|---|---|---|
| `gsap` | **3.15.0** | Core engine + every plugin ships inside this single package. |
| `@gsap/react` | **2.1.2** | Official `useGSAP()` hook. Peer deps: `gsap@^3.12.5`, `react>=17`. |

```bash
npm install gsap @gsap/react
```

**License: 100% free, including every plugin.** Webflow acquired GreenSock in late 2024, and as of April 30, 2025 all formerly paid "Club GreenSock" plugins — SplitText, MorphSVGPlugin, DrawSVGPlugin, InertiaPlugin, ScrollTrigger, ScrollSmoother — are free for everyone, commercial use included, under GSAP's Standard "no-charge" license (https://gsap.com/standard-license). There is no more private/paid npm registry, no shop login, no `gsap-trial` shim. Everything installs from the public `gsap` package on npm. Do not tell an implementer to add a Club GreenSock auth token to `.npmrc` — that requirement no longer exists and the file that used to need it should not be reintroduced.

Every plugin is a named export reachable as a deep import from `gsap/<PluginName>` (e.g. `gsap/SplitText`, `gsap/Flip`). `@gsap/react` exports `useGSAP`.

## Mental model

GSAP plugins fall into three families, and conflating them is the most common mistake:

1. **DOM-mutating plugins** (SplitText, Flip) — they read layout, then rewrite the DOM (wrapping text in spans, reparenting elements). They must run after the DOM they target exists and fonts/layout have settled. They are inherently client-only and produce content search engines and screen readers must still be able to read — accessibility is not optional polish here, it's correctness.
2. **Input-normalization plugins** (Observer, Draggable, InertiaPlugin) — they don't animate anything by themselves; they turn wheel/touch/pointer/drag input into consistent deltas and velocities you feed into your own tweens. Treat them as event systems, not visual effects.
3. **Property-extension plugins** (Flip's `props`, MotionPathPlugin, DrawSVGPlugin, MorphSVGPlugin, ScrambleTextPlugin) — they add new tweenable properties (`motionPath`, `drawSVG`, `morphSVG`, `scrambleText`) to the core `gsap.to/from/fromTo` API. They compose with everything else in GSAP (timelines, stagger, ease) rather than being separate systems.

`ScrollSmoother` is a different animal: it's a scroll-position *replacement* layer built on top of ScrollTrigger, not an additive plugin. Only one thing may own the scroll position at a time.

Every plugin needs `gsap.registerPlugin(...)` once per module graph before use — calling it more than once is harmless (GSAP dedupes internally), but registering plugins inside a render function on every render is wasted work; do it at module scope in a `"use client"` file or inside `useGSAP`'s setup.

## SplitText

**What it's for:** splitting text into lines/words/chars for staggered reveal animations. Rewritten in GSAP 3.13 — half the old bundle size, built-in accessibility, `mask` for clip-reveal effects, and `autoSplit`/`onSplit` for responsive re-splitting on resize/font-load instead of manual `ResizeObserver` plumbing.

### API essentials

```ts
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(SplitText);

const split = SplitText.create(target, vars);
```

| Option | Type | Default | Purpose |
|---|---|---|---|
| `type` | string | `"chars,words,lines"` | comma-delimited subset to split into |
| `mask` | `"lines" \| "words" \| "chars"` | — | wraps that unit in an extra element with `visibility: clip` for clip-reveal (pick exactly one) |
| `autoSplit` | boolean | `false` | re-splits on font load / container width change |
| `onSplit` | `(self) => Tween\|Timeline\|void` | — | fires after every split/re-split; **build your animation in here** when using `autoSplit` |
| `aria` | `"auto" \| "hidden" \| "none"` | `"auto"` | `"auto"` puts `aria-label` on the original text and `aria-hidden` on generated chars/words/lines |
| `tag` | string | `"div"` | wrapper element tag |
| `wordDelimiter` | string/RegExp/object | space | custom word-boundary rule |
| `charsClass` / `wordsClass` / `linesClass` | string | — | append `"++"` for auto-incrementing class names (`word++` → `word0`, `word1`...) |
| `propIndex` | boolean | `false` | writes `--word`/`--char` CSS custom properties for CSS-driven stagger |
| `deepSlice` | boolean | `true` | correctly slices nested inline elements (`<b>`, `<a>`) that span a line break |
| `smartWrap` | boolean | `false` | avoids orphan characters at line-wrap points |
| `ignore` | selector/element | — | descendants excluded from splitting (icons, badges) |

Instance: `.chars`, `.words`, `.lines`, `.masks` (arrays of elements), `.isSplit`. Methods: `.split()`, `.revert()`, `.kill()`.

### Production pattern (Next.js App Router)

```tsx
// components/hero-heading.tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText, useGSAP);

export function HeroHeading({ children }: { children: string }) {
  const scope = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const split = SplitText.create(scope.current, {
        type: "words,lines",
        mask: "lines",
        autoSplit: true, // re-splits when fonts finish loading / width changes
        onSplit(self) {
          // return the tween so useGSAP/SplitText can sync + revert it together
          return gsap.from(self.words, {
            yPercent: 110,
            duration: 0.9,
            ease: "power4.out",
            stagger: 0.045,
          });
        },
      });
      return () => split.revert();
    },
    { scope }
  );

  return <h1 ref={scope}>{children}</h1>;
}
```

### When to avoid

- Static SEO-critical body copy where the reveal adds no communicative value — splitting fragments text nodes and is pure animation overhead.
- Any text whose content changes on a fast interval (live counters, chat text) — constant split/revert churn is wasted work; animate opacity/transform on the container instead.
- If you skip `autoSplit`, you **must** wait for `document.fonts.ready` before splitting or GSAP will `console.warn()` and your line breaks will be wrong on first paint.

## Flip

**What it's for:** FLIP (First-Last-Invert-Play) layout transitions — animate an element smoothly between two DOM states (position, size, rotation) including across a **reparent** (moving a node to a different parent container), without manually computing deltas.

### API essentials

```ts
import { Flip } from "gsap/Flip";
gsap.registerPlugin(Flip);

const state = Flip.getState(targets, vars); // capture BEFORE the DOM change
// ...mutate the DOM (reorder, reparent, resize, add/remove classes)...
Flip.from(state, options); // returns a Timeline
```

| Option | Purpose |
|---|---|
| `duration`, `ease` | standard tween timing |
| `absolute` | temporarily `position: absolute` targets during the flip so document flow doesn't fight the animation |
| `scale` | use `scaleX/scaleY` instead of animating `width/height` (cheaper, avoids reflow/text-reflow jumps) |
| `nested` | prevents compounding offsets when both a parent and child are flipping targets |
| `simple` | skips rotation/skew math — use when you know only x/y/size changed, for perf |
| `targets` | animate a subset of the captured state |
| `onEnter` / `onLeave` | callbacks for elements that appeared/disappeared between states — animate them in/out explicitly |
| `toggleClass` | class applied only for the duration of the flip (e.g. disable pointer events while animating) |
| `props` | extra comma-delimited CSS props to interpolate (e.g. `"backgroundColor,borderRadius"`) |
| `zIndex` | pin z-index for the duration so flipped elements don't get clipped mid-transition |

Flip auto-assigns `data-flip-id` when targets lack one, which is how it correlates "before" elements to "after" elements across a reparent.

### Production pattern (grid ↔ list view toggle with reparenting)

```tsx
// components/view-toggle-grid.tsx
"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(Flip, useGSAP);

export function ProductGrid({ items }: { items: { id: string; name: string }[] }) {
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const container = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: container });

  const toggleLayout = contextSafe(() => {
    const state = Flip.getState("[data-flip-id]", { props: "borderRadius" });
    setLayout((prev) => (prev === "grid" ? "list" : "grid"));
    // DOM hasn't updated yet (state is async) — Flip.from runs after React commits.
    requestAnimationFrame(() => {
      Flip.from(state, {
        duration: 0.5,
        ease: "power2.inOut",
        absolute: true,
        nested: true,
      });
    });
  });

  return (
    <div ref={container}>
      <button onClick={toggleLayout}>Toggle layout</button>
      <div className={layout === "grid" ? "grid grid-cols-3 gap-4" : "flex flex-col gap-2"}>
        {items.map((item) => (
          <div key={item.id} data-flip-id={item.id} className="rounded-lg border p-4">
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

The `requestAnimationFrame` deferral matters: `Flip.getState` must run **before** the React state update triggers a re-render, and `Flip.from` must run **after** that re-render has committed to the DOM — React's commit is async relative to the event handler, `requestAnimationFrame` guarantees you're past paint scheduling.

### When to avoid

- Simple show/hide toggles with no position change — a plain opacity/scale tween is cheaper and clearer than capturing Flip state for nothing.
- High-frequency layout changes (every keystroke) — Flip is for discrete user-triggered transitions, not continuous ones.

## Observer

**What it's for:** a single normalized event source for wheel, touch, and pointer input, so you stop hand-rolling separate `wheel`/`touchmove`/`pointermove` listeners with inconsistent deltas across browsers/trackpads/phones. Most commonly used for full-viewport "one input gesture = one section" navigation.

### API essentials

```ts
import { Observer } from "gsap/Observer";
gsap.registerPlugin(Observer);

const observer = Observer.create({ ...config });
observer.disable(); // pause, instance still retrievable via Observer.getById()
observer.enable();
observer.kill();    // permanent, removes from internal registry
```

| Option | Purpose |
|---|---|
| `target` | element or window (default: window) |
| `type` | comma-delimited: `"wheel,touch,pointer,scroll"` |
| `onUp` / `onDown` / `onLeft` / `onRight` | fire once per normalized gesture, direction-resolved across input types |
| `onChange` | fires on any movement, either axis |
| `wheelSpeed` | multiplier on wheel delta; negative inverts |
| `tolerance` | minimum px distance before a direction callback fires (filters trackpad micro-jitter) |
| `dragMinimum` | px threshold before drag-type callbacks fire |
| `preventDefault` | block native scroll while the Observer owns the gesture |

### Production pattern (full-viewport section navigation, done right)

The senior detail here is the **lock flag** — without it, one physical wheel gesture fires `onDown` multiple times and skips two sections.

```tsx
// components/section-pager.tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(Observer, useGSAP);

export function SectionPager({ sectionCount }: { sectionCount: number }) {
  const container = useRef<HTMLDivElement>(null);
  const current = useRef(0);
  const animating = useRef(false);

  useGSAP(
    () => {
      const goTo = (index: number) => {
        if (animating.current || index < 0 || index >= sectionCount) return;
        animating.current = true;
        current.current = index;
        gsap.to(container.current, {
          yPercent: -100 * index,
          duration: 0.9,
          ease: "power3.inOut",
          onComplete: () => {
            animating.current = false;
          },
        });
      };

      const observer = Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        wheelSpeed: -1,
        tolerance: 10,
        preventDefault: true,
        onDown: () => goTo(current.current + 1),
        onUp: () => goTo(current.current - 1),
      });

      return () => observer.kill();
    },
    { scope: container }
  );

  return <div ref={container} className="fixed inset-0" />;
}
```

### When to avoid

- Regular scrollable content pages — hijacking wheel input for full-viewport paging is a deliberate, disorientation-risking UX choice (breaks scrollbar drag, breaks find-in-page anchors, breaks assistive scroll). Reserve it for portfolio/story-driven sites where the client explicitly wants the "slides" feel, and always ship a visible progress indicator + keyboard support alongside it.
- Don't use Observer as a substitute for ScrollTrigger's own `onEnter`/`onLeave` when you just need scroll-position-based triggers — that's ScrollTrigger's job and it already handles it with less code.

## Draggable + InertiaPlugin

**What it's for:** Draggable turns an element into a pointer-draggable object (mouse + touch unified) with bounds, snapping, and class toggling. InertiaPlugin (renamed from the old paid `ThrowPropsPlugin`) adds physically-plausible momentum: release velocity carries into a decelerating tween instead of stopping dead.

### API essentials

```ts
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
gsap.registerPlugin(Draggable, InertiaPlugin); // InertiaPlugin must be registered explicitly — Draggable does not auto-pull it in
```

**Draggable.create(target, vars)** key options:

| Option | Purpose |
|---|---|
| `type` | `"x,y"` (default), `"x"`, `"y"`, `"rotation"`, `"top,left"` |
| `bounds` | element, selector, or `{top,left,width,height}` clamp |
| `inertia` | `true`, or an object of per-property inertia config — requires InertiaPlugin registered |
| `edgeResistance` | 0–1 friction when dragging past bounds |
| `snap` | array of stops, or a function `(value) => nearestValue` |
| `onDrag` / `onDragEnd` | `this` inside is the Draggable instance (`this.x`, `this.y`, `this.target`) |

**InertiaPlugin** standalone (not just via Draggable): `gsap.to(target, { inertia: { x: velocity, resistance: 400, end: [0, 200, 400] } })`. Use `InertiaPlugin.getVelocity(target, prop)` to read tracked velocity outside a drag context.

### Production pattern (snap-to-card draggable carousel)

```tsx
// components/drag-carousel.tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(Draggable, InertiaPlugin, useGSAP);

export function DragCarousel({ cardWidth = 320 }: { cardWidth?: number }) {
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const [draggable] = Draggable.create(track.current, {
        type: "x",
        bounds: viewport.current,
        inertia: true,
        edgeResistance: 0.85,
        snap: {
          x: (value) => Math.round(value / cardWidth) * cardWidth,
        },
      });
      return () => draggable.kill();
    },
    { scope: viewport }
  );

  return (
    <div ref={viewport} className="overflow-hidden">
      <div ref={track} className="flex gap-4 cursor-grab active:cursor-grabbing" />
    </div>
  );
}
```

### When to avoid

- Anything that must remain operable via keyboard/screen reader as a primary path (settings sliders, form controls) — Draggable has no built-in ARIA slider semantics; you'd need to hand-roll `role="slider"` + arrow-key handlers alongside it, at which point a native `<input type="range">` styled with Tailwind is usually less work and free accessibility.
- Simple carousels with a fixed small item count — CSS scroll-snap (`overflow-x: auto; scroll-snap-type`) gets you 90% of this UX with zero JS and native accessibility.

## MotionPathPlugin

**What it's for:** animating any object (DOM element or plain object) along an SVG path — the path becomes a positional interpolation curve, decoupled from stroke rendering.

### API essentials

```ts
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
gsap.registerPlugin(MotionPathPlugin);

gsap.to(target, {
  motionPath: {
    path: "#path",        // selector, element, path-data string, or [{x,y}, ...] array
    align: "#path",        // align target's coordinate space to this path ("self" = current position)
    alignOrigin: [0.5, 0.5],
    autoRotate: true,      // or a numeric degree offset
    start: 0,
    end: 1,
  },
  transformOrigin: "50% 50%",
  duration: 5,
  ease: "power1.inOut",
});
```

Utilities: `MotionPathPlugin.convertToPath(target)` turns `<circle>/<rect>/<ellipse>/<line>` into an equivalent `<path>` (required before some operations that need path data). `MotionPathPlugin.getRawPath(target)` extracts GSAP's internal point-array representation for programmatic manipulation.

### Production pattern (looping marker along a decorative path)

```tsx
useGSAP(() => {
  gsap.to(".marker", {
    motionPath: {
      path: "#travel-path",
      align: "#travel-path",
      alignOrigin: [0.5, 0.5],
      autoRotate: true,
    },
    duration: 4,
    repeat: -1,
    ease: "none",
  });
}, { scope });
// <svg ref={scope}><path id="travel-path" d="M10,100 C100,10 300,190 390,100" .../><circle className="marker" r={6} /></svg>
```

### When to avoid

- Straight-line or simple-curve motion — `motionPath` adds path-parsing overhead for a trajectory that a plain `x`/`y` tween or even a CSS `cubic-bezier` transform handles more cheaply.

## DrawSVGPlugin

**What it's for:** animating stroke reveal ("line drawing") on SVG shapes by controlling how much of the stroke is visible — independent of `stroke-dasharray` hand-tuning.

### API essentials

```ts
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
gsap.registerPlugin(DrawSVGPlugin);

gsap.from(".draw-me", { drawSVG: "0%", duration: 1.2, ease: "power2.inOut" });
```

- Value is a **range**, not a delta: `"20% 80%"` means the visible stroke segment sits between 20% and 80% of the path length. A single value (`"80%"` or `80`) is shorthand for `"0% 80%"`.
- Accepts percentages or absolute pixel lengths.
- Append `"live"` (e.g. `drawSVG: "0% 100% live"`) to recompute path length every frame — needed only if the path's geometry itself is changing during the animation.
- The value you pass describes the **end state** of the tween — `gsap.to(path, { drawSVG: "20% 80%" })` animates *to* that segment, not from it. Use `gsap.from()` when animating a reveal from nothing.
- Requires an explicit stroke: `stroke-width` + `stroke` color must be set (CSS or SVG attributes) or there's nothing to draw.
- Works on `<path>`, `<line>`, `<polyline>`, `<polygon>`, `<rect>`, `<ellipse>`.

### Production pattern (logo line-draw on load)

```tsx
useGSAP(() => {
  gsap.from(".logo-stroke", { drawSVG: "0%", duration: 1.4, ease: "power2.inOut", stagger: 0.1 });
}, { scope });
// <svg ref={scope}><path className="logo-stroke" d="..." fill="none" stroke="currentColor" strokeWidth={2} /></svg>
```

### When to avoid

- Filled shapes / logotypes without a deliberate stroke-drawing brand moment — don't add line-draw as a default "make it fancy" reflex; it reads as generic if the mark isn't originally a line-art style.

## MorphSVGPlugin

**What it's for:** morphing one SVG shape's `d` path data into another (icon-to-icon transitions, blob morphs) with automatic point-count reconciliation between shapes that have different numbers of anchor points.

### API essentials

```ts
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
gsap.registerPlugin(MorphSVGPlugin);

gsap.to("#shapeA", {
  duration: 1,
  morphSVG: {
    shape: "#shapeB",
    type: "rotational",  // "linear" (default) or "rotational" — rotational avoids mid-morph "kinks"
    shapeIndex: 0,         // offsets which point on a closed path the morph starts from
    map: "size",           // "size" (default), "position", or "complexity" — segment-matching strategy
  },
});
```

Simple form: `morphSVG: "#targetShape"` when default matching behaves well (most icon-to-icon cases). Reach for `type: "rotational"` and manual `shapeIndex` tuning only when the default morph visibly twists.

### Production pattern (icon state morph, e.g. play to pause)

```tsx
function PlayPauseIcon({ playing }: { playing: boolean }) {
  const path = useRef<SVGPathElement>(null);
  const { contextSafe } = useGSAP();
  const morph = contextSafe((toId: string) =>
    gsap.to(path.current, { duration: 0.35, morphSVG: toId, ease: "power2.inOut" })
  );
  useGSAP(() => morph(playing ? "#pause-shape" : "#play-shape"), [playing]);
  return (
    <svg viewBox="0 0 24 24" width={24} height={24}>
      <path ref={path} d="M8,5 L19,12 L8,19 Z" fill="currentColor" />
      <path id="play-shape" d="M8,5 L19,12 L8,19 Z" hidden />
      <path id="pause-shape" d="M6,5 H10 V19 H6 Z M14,5 H18 V19 H14 Z" hidden />
    </svg>
  );
}
```

### When to avoid

- Simple icon swaps where a crossfade or a set of pre-drawn CSS-animated strokes suffices — MorphSVG's point-matching is CPU work worth paying for on hero/brand moments, not on every toolbar icon toggle.

## ScrambleTextPlugin

**What it's for:** a text-scramble/decode reveal effect — randomized characters cycle in place before settling into the real text, left-to-right by default.

### API essentials

```ts
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
gsap.registerPlugin(ScrambleTextPlugin);

gsap.to(".target", {
  duration: 1.5,
  scrambleText: {
    text: "NEW TEXT",             // omit to scramble/restore the element's existing text
    chars: "upperCase",            // "upperCase" | "lowerCase" | "upperAndLowerCase" | custom string
    revealDelay: 0.3,              // seconds of fully-scrambled hold before reveal begins
    speed: 0.3,                    // how fast the scrambled characters cycle
    newClass: "revealed-char",     // class applied to newly-revealed characters
  },
});
```

### Production pattern (data-decode label on scroll into view)

```tsx
function DecodeLabel({ text }: { text: string }) {
  const scope = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    gsap.to(scope.current, { duration: 1, scrambleText: { text, chars: "upperCase", speed: 0.4 } });
  }, { scope });
  return <span ref={scope} aria-label={text} />; // aria-label = final text; screen readers must not hear scramble frames
}
```

### When to avoid

- Body copy or anything users need to read immediately (nav labels, CTAs above the fold on first load) — scramble adds real perceived-latency before the message is legible. Reserve it for secondary/decorative data readouts (stats, tickers, terminal-aesthetic sections).

## ScrollSmoother

**What it's for:** replacing native scroll with a smoothed, GPU-transformed scroll position that ScrollTrigger reads from, plus built-in parallax/lag via `data-speed`/`data-lag` attributes. It's not an additive plugin — it's an alternative scroll engine.

### API essentials

Required structure (exact IDs, `ScrollSmoother` auto-detects them):

```html
<body>
  <div id="smooth-wrapper">
    <div id="smooth-content">
      <!-- all scrollable content -->
    </div>
  </div>
  <!-- position:fixed elements (nav, modals) go OUTSIDE the wrapper —
       the wrapper/content pair becomes a new transform containing block,
       which breaks fixed positioning inside it -->
</body>
```

```ts
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
gsap.registerPlugin(ScrollTrigger, ScrollSmoother); // order matters: ScrollTrigger first

ScrollSmoother.create({
  smooth: 1,             // seconds to catch up to native scroll target (default 0.8)
  effects: true,          // enables data-speed / data-lag parallax attributes
  smoothTouch: false,     // smoothing on touch is off by default — usually keep it off, native touch scroll feels better
  normalizeScroll: true,  // forces scroll onto the JS thread; fixes mobile address-bar jump bugs
  ignoreMobileResize: true,
});
```

`data-speed="0.5"` (half native speed, i.e. parallax-back), `data-speed="auto"` (calculated from element's overflow beyond viewport), `data-lag="0.5"` (element trails 0.5s behind, catching up as scroll settles). Elements sit at their natural position when vertically centered in the viewport.

### The Lenis rule

**Never run ScrollSmoother and Lenis (or any other scroll-hijacking library) on the same page.** Both libraries intercept native scroll and drive their own transform-based position — running two simultaneously means two systems fighting for the same transform, producing jitter, doubled easing, and broken `ScrollTrigger` math (ScrollTrigger can only read one authoritative scroll source). This isn't a configuration option to reconcile; it's an architectural either/or:

- **Pick ScrollSmoother** when the project already commits to the GSAP ecosystem (ScrollTrigger-heavy pinning/scrubbing) — it integrates with ScrollTrigger natively with zero adapter code, and its parallax attributes replace what you'd otherwise hand-roll with ScrollTrigger `scrub`.
- **Pick Lenis** when you need scroll-snap-adjacent native behaviors, are not otherwise deep in GSAP, or need something with a lighter footprint than pulling in ScrollTrigger + ScrollSmoother for a single smoothing effect. Pair Lenis's `scroll` event with ScrollTrigger's `scrollerProxy` if you still want ScrollTrigger's trigger math on top of Lenis's smoothing — that's the supported combination, not Lenis + ScrollSmoother together.

If you inherit a codebase with both installed, that's a bug, not a stack decision — remove one.

### When to avoid

- Pages with complex absolutely-positioned overlays anchored mid-document, or CSS `scroll-snap` requirements — ScrollSmoother's transform-based wrapper fights both. Fall back to native scroll + ScrollTrigger without smoothing, or Lenis with `scrollerProxy`.
- Any page where `prefers-reduced-motion: reduce` is set — gate `ScrollSmoother.create()` behind a `matchMedia` check and fall back to unsmoothed native scroll; don't force momentum easing on users who've opted out of motion.

## Integration gotchas (Next.js 16 / React 19)

- **Everything above is `"use client"` only.** SplitText/Flip/ScrollSmoother read `document`/layout; Observer/Draggable read pointer events; none of this can run in a Server Component. Keep the GSAP-touching component as a small client leaf, not the whole page.
- **Register plugins at module scope of the client file**, not inside the component body, so registration happens once per module load, not once per render. `gsap.registerPlugin` is idempotent, but calling it 60 times/second inside a render path is still wasted cycles.
- **`useGSAP` over raw `useEffect`.** It wraps your setup in `gsap.context()`, so all animations/ScrollTriggers/plugins created inside are automatically reverted on unmount or dependency change. Under React 18+/19 Strict Mode, effects mount→unmount→mount in dev; `useGSAP`'s context revert is what makes that safe — a bare `useEffect` with manual tween creation will leak or double-create without it.
- **Scope everything.** Always pass `{ scope: ref }` to `useGSAP` and use plain class selectors (`".word"`) inside the callback instead of manually scoped `element.querySelectorAll`. `useGSAP` scopes those selectors to the ref's subtree, which prevents cross-instance collisions when the same component renders multiple times on a page (a card grid, for example).
- **`contextSafe`** wraps event handlers (`onClick`, `onDrag`) created *outside* the `useGSAP` callback so they still get cleaned up correctly and their GSAP calls stay scoped — use it for any handler that creates tweens in response to user interaction rather than on mount.
- **No `window`/`document` access at import time.** Some plugins (ScrollSmoother, Observer) touch the DOM as soon as `.create()` runs — never call `.create()` at module scope; always inside `useGSAP`/an effect, after mount.
- **Font loading race with SplitText**: in Next.js with `next/font`, fonts are usually ready by hydration, but don't assume it — either use `autoSplit: true` or explicitly `await document.fonts.ready` before the first `SplitText.create()` call for text using a custom `next/font` family.
- **Route changes don't unmount everything you'd expect** with App Router layouts persisting across navigations — a `ScrollSmoother` or `Observer` instance created in a layout-level component will survive route transitions unless you explicitly scope it to a page-level client component that actually unmounts.

## Pitfalls (what makes it look AI-generic or breaks on mobile)

- **Stagger everything by default.** A `SplitText` char-stagger on every heading on every page is the single most recognizable "AI built this" tell. Reserve character-level stagger for a handful of hero moments; use word or line splits (cheaper, calmer) elsewhere, or no split at all.
- **Skipping `smoothTouch`/mobile testing for ScrollSmoother.** Desktop-tuned `smooth` values (1.2s+) feel laggy and disconnected on a touchscreen where users expect 1:1 finger tracking. Test on an actual device, not just DevTools throttling.
- **Draggable without `bounds`.** An unbounded draggable card that can be flung off-screen and lost is a common shipped bug — always set `bounds` unless infinite drag is the explicit design.
- **Forgetting `revert()`/`kill()` on unmount.** Orphaned SplitText wrapper spans, dangling Observer listeners, and un-killed Draggable instances accumulate across client-side navigations in an SPA-like App Router app, degrading performance the longer a session runs. `useGSAP`'s automatic context revert prevents this — don't bypass it with manual `useEffect` + `gsap.to` calls "for simplicity."
- **`drawSVG`/`morphSVG` on shapes without `vector-effect: non-scaling-stroke`** where the SVG is also being scaled responsively — stroke width and morph anchor math can visibly distort at breakpoints; test the animation at actual deployed viewport widths, not just the design-file size.
- **Running ScrollSmoother's `normalizeScroll` alongside a custom `overscroll-behavior` or another scroll-lock library** (modals, cookie banners) — both fight for scroll-thread control; test any modal/drawer open state with ScrollSmoother active before shipping.
- **Reduced motion ignored.** None of these plugins respect `prefers-reduced-motion` automatically. Wrap hero-level SplitText/MorphSVG/ScrollSmoother instantiation in a `matchMedia("(prefers-reduced-motion: reduce)")` check and ship a static/instant fallback — this is an accessibility requirement, not a nice-to-have, and its absence is an easy tell that a page was AI-generated without a real design review pass.
