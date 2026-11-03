# Lottie & Rive

Reference for choosing and correctly wiring vector-animation runtimes (Lottie/dotLottie and Rive) into Next.js 16 + React 19 sites — when to reach for each, when to reach for neither, and how to mount them without tanking performance or SSR.

## Current as of July 2026

**Lottie (primary player) — dotLottie**

| Package | Version | Role |
|---|---|---|
| `@lottiefiles/dotlottie-react` | 0.19.9 | React component (`DotLottieReact`), wraps the WASM player below |
| `@lottiefiles/dotlottie-web` | 0.77.1 | Underlying vanilla WASM/canvas renderer (installed automatically as a dependency) |

```bash
npm install @lottiefiles/dotlottie-react
```

Peer deps: `react ^17 || ^18 || ^19`. License: MIT, free, no watermark, no usage cap.

This is the **recommended default** over the older alternatives:
- `lottie-react` (2.4.1) — thin wrapper around `lottie-web`, last published over a year ago as of this writing. Still works, but not where new development or perf work is happening. Don't start new projects on it.
- `lottie-web` (5.13.0) — Airbnb's original SVG/Canvas/HTML renderer. Still maintained and fine for legacy `.json`-only pipelines or when you need its DOM/SVG renderer specifically (e.g. you need to `querySelector` into rendered SVG nodes), but dotLottie's WASM renderer is smaller on the wire and faster to parse for the same content.

dotLottie (`.lottie`) is a **file format**, not just a player: a ZIP (Deflate) container bundling one or more Lottie JSON animations plus their image/font assets and a manifest, with the `.lottie` extension. Always export/ship `.lottie`, not raw `.json`, for production — same visual content, meaningfully smaller transfer size because assets are compressed once instead of inflated as base64 inside JSON.

**Rive**

| Package | Version | Renderer backing |
|---|---|---|
| `@rive-app/react-canvas` | 4.29.5 | `@rive-app/canvas` (Canvas2D + WASM) |
| `@rive-app/react-webgl2` | 4.29.5 | `@rive-app/webgl2` (WebGL2 + WASM) |
| `@rive-app/react-canvas-lite` | 4.29.5 | `@rive-app/canvas-lite` (smaller WASM build, no text/audio) |

```bash
npm install @rive-app/react-canvas
```

All three are MIT-licensed, support React 16.8–19, and are maintained by the Rive team as thin hook/component wrappers around the underlying JS/WASM runtime. Pick the package that matches your renderer need (below) — you generally install only one.

Licensing note: the **runtimes are free and open source forever**, no fee, no export limit. The **Rive editor** (the design tool where `.riv` files are authored) has a free tier plus paid tiers (Cadet ~$9/mo, Voyager ~$32/mo, Enterprise ~$120/mo) that gate editor collaboration features — this has no bearing on what you ship in the browser.

## Mental model

Lottie plays a pre-baked vector recording — think "vector video." Rive runs a small state machine you drive from code — think "a remote control wired to a design file." That distinction, not familiarity or trendiness, decides which one belongs on a given element.

Reach for Lottie when the motion is a fixed sequence someone already animated in After Effects (a loading spinner, a success checkmark, a hero illustration loop) and your only runtime need is play/pause/seek/loop. Reach for Rive when the motion needs to *react* to app state — hover, press, drag, a boolean toggling, a value streaming in from your backend — because a state machine authored in the Rive editor branches, blends, and holds intermediate states natively. Faking that with Lottie means either baking every combination of frames in advance or hacking `setFrame` jumps on every event, which looks robotic and gets unmaintainable fast.

Both are runtime-hydrated: the JSON/riv payload is inert data until JS parses it and paints something, so both are client-only islands by construction. Treat them exactly like any other heavy client bundle — dynamic import, mount on intersection, show a static poster until then.

File weight is a business decision, not an assumption: "it's vector so it's cheap" is false the moment a Lottie has embedded raster images, gradient meshes, or dozens of mask layers. Profile the exported file size before committing to Lottie for anything full-bleed or long-running; a full-viewport looping hero animation is very often cheaper as a compressed video than as JSON.

Rive interactivity lives inside the `.riv` file, not in your React code — a designer wires Number/Boolean/Trigger inputs to a State Machine in the Rive editor. Your job in React is to read the current state and push input values, not to write animation logic. If you find yourself branching animation behavior in `useEffect`, you're fighting the tool.

## API essentials

### Lottie — `@lottiefiles/dotlottie-react`

```tsx
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
```

Component props (all optional except a source):

| Prop | Type | Notes |
|---|---|---|
| `src` | `string` | URL to `.lottie` or `.json` |
| `data` | `string \| ArrayBuffer` | Inline animation data instead of a URL |
| `autoplay` | `boolean` | default `false` |
| `loop` | `boolean` | default `false` |
| `speed` | `number` | default `1` |
| `mode` | `"forward" \| "reverse" \| "bounce" \| "reverse-bounce"` | playback direction |
| `segment` | `[number, number]` | start/end frame clamp |
| `marker` | `string` | play a named AE marker instead of raw frames |
| `backgroundColor` | `string` | 6/8-digit hex |
| `renderConfig` | `{ devicePixelRatio?, autoResize? }` | `autoResize` defaults `true` |
| `useFrameInterpolation` | `boolean` | subframe smoothing, default `true` |
| `dotLottieRefCallback` | `(dotLottie: DotLottie) => void` | your hook into the imperative instance |

Imperative instance (obtained via `dotLottieRefCallback`, not a React ref object — it's a callback that fires once the WASM instance is ready):

```
dotLottie.play() / .pause() / .stop()
dotLottie.setFrame(frameNumber)
dotLottie.setSegment(start, end)
dotLottie.setSpeed(n)
dotLottie.setLoop(bool)
dotLottie.addEventListener("frame" | "play" | "pause" | "complete" | "load" | "loop", handler)
dotLottie.removeEventListener(...)
```

There is no separate `useDotLottie` hook in this package — the ref-callback pattern *is* the API surface. Verify exact event names against your installed version's TypeScript defs before relying on a less common one (`load`, `frame`, `play`, `pause`, `complete` are the ones you'll actually use).

### Rive — `@rive-app/react-canvas` (identical hook API across all three renderer packages)

```tsx
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from "@rive-app/react-canvas";

const { rive, RiveComponent } = useRive({
  src: "/animations/character.riv",
  stateMachines: "State Machine 1",
  artboard: "Main",              // optional, defaults to the .riv's default artboard
  autoplay: true,
  layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
});

const hoverInput = useStateMachineInput(rive, "State Machine 1", "isHovered", false);
const clickTrigger = useStateMachineInput(rive, "State Machine 1", "onClick");
```

| API | Shape | Use |
|---|---|---|
| `useRive(params)` | returns `{ rive, RiveComponent }` | mount + own the instance; render `<RiveComponent />` |
| `useStateMachineInput(rive, smName, inputName, initialValue?)` | returns input handle | Boolean/Number inputs: `input.value = x`. Trigger inputs: `input.fire()` |
| `rive.on(EventType.RiveEvent, cb)` | event listener | listen for Rive Events authored in the state machine (e.g. "animation reached this point") |
| `Fit` | `Contain \| Cover \| Fill \| FitWidth \| FitHeight \| None \| ScaleDown \| Layout` | how the artboard scales into the canvas |
| `Alignment` | `Center \| TopLeft \| TopCenter \| ...` | anchor point when not filling |
| `rive.cleanup()` | method | tears down the WASM instance and its render loop — required for manually constructed instances; `useRive` handles this on unmount for you |

Renderer choice matters and is a real architectural decision, not a coin flip:

- **`react-canvas`** — default pick for most sites. No browser limit on concurrent instances, so it's safe to drop several interactive Rive icons/buttons on one page (nav, cards, footer) without hitting a ceiling. Full feature set (text, audio).
- **`react-webgl2`** — best fidelity and best single-instance performance, but WebGL2 contexts are browser-limited (commonly ~8–16 concurrent). Use it for one hero-grade, high-fidelity piece per view, and set `useOffscreenRenderer: true` if you must run several.
- **`react-canvas-lite`** — smallest WASM payload, same Canvas2D API, but drops Rive Text and Rive Audio rendering. Use only for simple interactive icons where every KB is being fought for and you don't need in-file text/audio.

## Patterns

All patterns assume the App Router. Both runtimes touch `window`/`WebAssembly`/canvas at module-eval time in places, so every component below is a Client Component, and anything mounted from a Server Component goes through a small `next/dynamic` wrapper (see gotchas for why the wrapper has to be its own client file).

### 1. Lazy-mounted Lottie with intersection gate + poster

```tsx
// components/lottie-on-scroll.client.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";

interface Props {
  src: string;
  poster: string;
  className?: string;
}

export function LottieOnScroll({ src, poster, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const dotLottieRef = useRef<DotLottie | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }, // start loading before it's on screen
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pause offscreen to save battery/CPU once mounted (route stays alive, user scrolls away)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !shouldMount) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) dotLottieRef.current?.play();
      else dotLottieRef.current?.pause();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldMount]);

  return (
    <div ref={containerRef} className={className}>
      {shouldMount ? (
        <DotLottieReact
          src={src}
          loop
          autoplay
          dotLottieRefCallback={(instance) => {
            dotLottieRef.current = instance;
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" aria-hidden className="h-full w-full object-cover" />
      )}
    </div>
  );
}
```

### 2. Scroll-synced Lottie (GSAP ScrollTrigger driving the frame)

This is the canonical pattern: tween a plain object's `frame` property with `scrub`, call `setFrame` on every update. Do not autoplay — the scrollbar is the playhead.

```tsx
// components/lottie-scroll-scrub.client.tsx
"use client";

import { useEffect, useRef } from "react";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function LottieScrollScrub({ src }: { src: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const dotLottieRef = useRef<DotLottie | null>(null);

  useEffect(() => {
    const instance = dotLottieRef.current;
    const section = sectionRef.current;
    if (!instance || !section) return;

    let tween: gsap.core.Tween | undefined;

    const onLoad = () => {
      const totalFrames = instance.totalFrames ?? 0;
      const playhead = { frame: 0 };

      tween = gsap.to(playhead, {
        frame: Math.max(totalFrames - 1, 0),
        ease: "none",
        onUpdate: () => instance.setFrame(Math.round(playhead.frame)),
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=150%",
          scrub: 1,
          pin: true,
        },
      });
    };

    instance.addEventListener("load", onLoad);
    return () => {
      instance.removeEventListener("load", onLoad);
      tween?.scrollTrigger?.kill();
      tween?.kill();
    };
  }, []);

  return (
    <div ref={sectionRef} className="h-screen">
      <DotLottieReact
        src={src}
        autoplay={false}
        loop={false}
        dotLottieRefCallback={(instance) => {
          dotLottieRef.current = instance;
        }}
      />
    </div>
  );
}
```

### 3. Interactive Rive button (state machine boolean + trigger)

The `.riv` file already defines `isHovered` (boolean) and `onClick` (trigger) inputs on its state machine — this is a wiring exercise, not an animation-authoring one.

```tsx
// components/rive-button.client.tsx
"use client";

import { useRive, useStateMachineInput, Layout, Fit } from "@rive-app/react-canvas";

const STATE_MACHINE = "ButtonSM";

export function RiveButton({ onActivate }: { onActivate?: () => void }) {
  const { rive, RiveComponent } = useRive({
    src: "/animations/cta-button.riv",
    stateMachines: STATE_MACHINE,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain }),
  });

  const isHovered = useStateMachineInput(rive, STATE_MACHINE, "isHovered", false);
  const onClickTrigger = useStateMachineInput(rive, STATE_MACHINE, "onClick");

  return (
    <button
      type="button"
      aria-label="Get started"
      className="h-14 w-40"
      onMouseEnter={() => {
        if (isHovered) isHovered.value = true;
      }}
      onMouseLeave={() => {
        if (isHovered) isHovered.value = false;
      }}
      onClick={() => {
        onClickTrigger?.fire();
        onActivate?.();
      }}
    >
      <RiveComponent />
    </button>
  );
}
```

### 4. Lazy-mounted Rive via `next/dynamic`, with poster fallback

Server Components cannot pass `ssr: false` to `next/dynamic` directly — the dynamic-with-`ssr:false` call has to live inside a file that is itself a Client Component. So: build the real component as a client component (above), then wrap it once.

```tsx
// components/rive-hero.client.tsx  ("use client" wrapper — required for ssr:false)
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const RiveHeroInner = dynamic(() => import("./rive-hero-inner.client"), {
  ssr: false,
  loading: () => <HeroPoster />,
});

function HeroPoster() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/posters/hero.webp" alt="" aria-hidden className="h-full w-full object-cover" />;
}

export function RiveHero() {
  const ref = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && (setMount(true), observer.disconnect()),
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{mount ? <RiveHeroInner /> : <HeroPoster />}</div>;
}
```

```tsx
// components/rive-hero-inner.client.tsx — the actual Rive mount, only ever loaded client-side
"use client";

import { useRive, Layout, Fit, Alignment } from "@rive-app/react-webgl2";

export default function RiveHeroInner() {
  const { RiveComponent } = useRive({
    src: "/animations/hero.riv",
    stateMachines: "HeroSM",
    autoplay: true,
    layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
  });
  return <RiveComponent className="h-full w-full" />;
}
```

```tsx
// app/page.tsx — Server Component, imports the already-client wrapper directly, no ssr:false here
import { RiveHero } from "@/components/rive-hero.client";

export default function Page() {
  return (
    <section className="h-screen">
      <RiveHero />
    </section>
  );
}
```

## Integration gotchas

- **`ssr: false` placement.** `next/dynamic(..., { ssr: false })` throws/errors when the call site is a Server Component module. Always put the `dynamic()` call inside a file that starts with `"use client"` (pattern 4). A Server Component may still import that wrapper directly with a normal `import`.
- **Hydration mismatch.** Never render the Lottie/Rive canvas differently between the server-rendered HTML and the client's first paint. Server-render the poster/empty state only, and swap to the real player inside a `useEffect`/after-mount `useState` flip — exactly what patterns 1 and 4 do. Don't try to guess canvas dimensions server-side.
- **StrictMode double-invoke.** React 19 dev StrictMode mounts, unmounts, and remounts effects once. Both `useRive` and `dotLottieRefCallback` are written to tolerate this (each mount gets a fresh WASM instance, each unmount cleans up), but if you hand-roll instance creation outside these hooks, guard with a ref flag or you'll leak a duplicate WASM instance in dev.
- **Canvas needs real dimensions.** Rive's canvas sizes itself from its container. If the parent has no explicit width/height (common with a flex child that hasn't laid out yet, or a `display: none` ancestor at mount time), the canvas renders at 0×0 and the animation looks "stuck" with no error. Give the wrapper an explicit `aspect-ratio` or fixed height.
- **WASM is fetched separately, not bundled.** Both runtimes ship a `.wasm` binary loaded at runtime, not inlined into your JS bundle — good for initial JS payload, but confirm your CSP allows `wasm-unsafe-eval`/the asset origin, and that the asset isn't blocked by an overly strict `Content-Security-Policy` if self-hosting behind a CDN.
- **Route changes don't auto-kill render loops you built by hand.** `useRive`/`DotLottieReact` clean up on unmount correctly. If you instead hold a raw instance in a module-level variable or a context that outlives the route, you'll keep a `requestAnimationFrame` loop running after the user navigates away — silent battery drain, invisible in a quick dev check.
- **`.riv`/`.lottie` files are binary assets, not source.** Put them in `public/` and reference by path (or a CDN URL), same as you would a video. Don't try to import them through the JS module graph.

## Pitfalls

- **Faking interactivity in Lottie.** Baking a hover-in/hover-out/pressed/idle matrix as manually stitched frame segments produces visibly stiff transitions and balloons file size with every extra state. That's the signal to move the asset to Rive, not to add more segments.
- **Full-bleed autoplaying hero loops as raw Lottie.** Gradients, image layers, and long duration make Lottie JSON balloon past what a compressed video costs on the wire, and it also costs CPU every frame (canvas/SVG redraw) where video decode is offloaded to hardware. Profile the exported size; if a decorative background loop is pushing into the hundreds of KB, a `.webm`/`.mp4` (or `.mov` with HEVC alpha for Safari) will usually look identical and cost less on mobile.
- **Eager top-level imports.** `import { DotLottieReact } from "@lottiefiles/dotlottie-react"` at the top of a page component ships the parser/renderer to every visitor of that route even if the animation is a single small icon below the fold. Dynamic-import and gate on intersection, always.
- **Unstable React keys remounting the player.** Giving a Lottie/Rive wrapper a key that changes on every parent re-render (e.g. `key={Date.now()}`) tears down and rebuilds the WASM instance constantly, replaying "success checkmark" style animations from frame 0 on unrelated re-renders. Key it on something stable (an id), not render count.
- **Using WebGL2 for a swarm of small icons.** `@rive-app/react-webgl2` hits real, low browser context ceilings (roughly 8–16 concurrent contexts depending on browser/GPU). A nav bar with a dozen Rive-animated icons on `react-webgl2` will silently fail to render some of them. Use `react-canvas` for anything with more than a couple of simultaneous instances on one page.
- **Ignoring `prefers-reduced-motion`.** Decorative Lottie/Rive loops should pause (not just visually calm down) for users who've opted out of motion, and should already be paused when scrolled offscreen (pattern 1) — both for accessibility and for mobile battery.
- **Reaching for Lottie/Rive when three lines of CSS would do.** A button lift on hover, a fade-in, an easing curve on a card — none of that needs a runtime, a WASM fetch, or a design-tool export. This is the single most common tell that a site was assembled by an AI: reflexively wrapping trivial motion in a heavyweight player instead of writing the transition. Default to CSS/GSAP; escalate to Lottie/Rive only once the motion genuinely requires vector-frame or state-machine playback.

## Decision table

| Use case | Weight | Interactivity needed | Recommendation |
|---|---|---|---|
| Simple hover lift, fade-in, easing curve, color transition | Free (CSS) | None | Pure code — CSS transition or GSAP tween. Never Lottie/Rive. |
| Loading spinner, small success/checkmark, one-shot micro-animation | Small (~10–50 KB `.lottie`) | Play-once or simple loop | Lottie (`dotlottie-react`), lazy-mounted |
| Like-button burst, toggle icon with 2 fixed states | Small–medium | Binary state, no blending | Lottie via `segment`/`marker` jump is fine and cheaper to author than a state machine |
| Onboarding/empty-state illustration | Small–medium | None, plays once on view | Lottie, intersection-gated |
| Character/mascot with idle/hover/click/drag reactive states | Medium (WASM + `.riv`) | Multi-state, blended, branching | Rive state machine (`react-canvas`) |
| Interactive product configurator (color/part swap driven by UI) | Medium–large | Continuous Number/Boolean inputs from app state | Rive, `useStateMachineInput` wired to your existing state |
| Scroll-driven story sequence built from an After Effects export | Depends on source complexity | Playhead follows scroll position, no branching | Lottie + GSAP ScrollTrigger scrub (pattern 2) |
| Scroll-driven sequence with mid-scroll branching (e.g. hover to pause and inspect) | Medium | Playhead + branching | Rive, Number input driven by scroll progress instead of raw `setFrame` |
| Full-bleed autoplaying hero/background loop | Large if done as Lottie | None (ambient) | Pure code / compressed video (WebM/MP4, alpha via HEVC on Safari) — Lottie only if genuinely flat-vector and small after export |
| Single hero-grade animated centerpiece, one per view | Medium–large, highest fidelity | Can be either | Rive `react-webgl2` (no concurrency ceiling issue with just one instance) |
