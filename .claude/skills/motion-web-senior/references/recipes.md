# Production Recipes

Copy-adaptable patterns for Awwwards-grade motion on Next.js App Router. Each recipe: when to use, complexity weight, complete TSX, perf note.

## Current as of July 2026

| Library | Package | Version | Install | License / notes |
|---|---|---|---|---|
| GSAP | `gsap` (+ `@gsap/react` for the `useGSAP` hook) | 3.15.0 / 2.1.2 | `npm i gsap @gsap/react` | 100% free since Webflow acquired GreenSock (2024) and made every plugin free in April 2025 — ScrollTrigger, SplitText, MorphSVG, DrawSVG, Flip, Draggable, all of it. No Club GreenSock, no license key, no private registry. Plugins import from `gsap/PluginName` and must be registered once via `gsap.registerPlugin(...)`. |
| Motion | `motion` | 12.42.2 | `npm i motion` | Formerly `framer-motion`. Renamed in 2025 when it went independent of Framer. Import from `motion/react`, not `framer-motion` — the old package still resolves but is frozen. MIT. |
| Lenis | `lenis` | 1.3.25 | `npm i lenis` | Formerly `@studio-freight/lenis` / `@studio-freight/react-lenis` — both deprecated and unmaintained, do not install them. React wrapper ships inside the main package at `lenis/react`. MIT. |

Baseline assumed throughout: Next.js 16 (App Router only — Pages Router is still supported in v16, these recipes just don't target it), React 19.2, Turbopack (stable, default bundler as of v16). Every snippet below is a Client Component (`'use client'`) — none of this belongs in a Server Component.

## Mental model

GSAP timelines are the source of truth for choreography; ScrollTrigger is a declarative adapter that maps a scroll position onto a timeline's `progress()` — think of it as wiring, not the animation itself. Reach for GSAP/ScrollTrigger for anything scroll-driven, pinned, or timeline-sequenced. Reach for Motion for React-idiomatic component lifecycle motion — mount/unmount (`AnimatePresence`), gesture states (`whileHover`, `whileTap`), and shared-layout transitions (`layout`) — where fighting React's render cycle with manual GSAP refs is more work than it's worth. Lenis normalizes scroll input (wheel/touch deltas vary wildly across devices) into a single virtual scroll position; it's a prerequisite for any scrub-quality effect, not a cosmetic add-on.

Only animate `transform` and `opacity` — everything else forces layout or paint on every scrub frame. Measure once, animate many: batch `getBoundingClientRect()` reads before a scroll session starts, not inside `onUpdate`. Every GSAP context (timelines, ScrollTriggers, quickTo setters) created in a component must be reverted on unmount — `useGSAP` does this for you; a raw `useEffect` does not. Respect `prefers-reduced-motion` at the entry points that matter most: preloaders, parallax, marquee velocity, autoplaying scrub video. Design each pinned or scrubbed section as isolated and independently killable — nothing should depend on a previous section's ScrollTrigger still existing.

## API essentials

**GSAP core**

| API | Use |
|---|---|
| `gsap.to/from/fromTo/set(target, vars)` | tween toward, from, or between explicit values |
| `gsap.timeline(vars)` | sequence tweens with position parameters (`"<"`, `"+=0.2"`, labels) |
| `gsap.quickTo(target, prop, vars)` | pre-compiled setter for high-frequency updates (pointermove) — create once, call many times |
| `gsap.utils.toArray/clamp/interpolate` | selector → array; clamp a number; map a value between two |
| `gsap.context()` / `useGSAP()` | scope tween/trigger creation for automatic `revert()` on cleanup |
| `gsap.matchMedia()` | breakpoint- or media-query-conditional animation setup with automatic cleanup on match change |
| `ScrollTrigger.create(vars)` | standalone trigger with no attached tween (e.g. theme switching) |
| `scrollTrigger: { trigger, start, end, scrub, pin, pinSpacing, containerAnimation, toggleActions, once, anticipatePin, invalidateOnRefresh, onEnter, onUpdate }` | the config keys used in practice |
| `ScrollTrigger.refresh()` | force re-measurement after layout changes (images/fonts settling, Suspense flush) |
| `SplitText.create(el, { type, mask, autoSplit, onSplit })` | split text into lines/words/chars; `autoSplit` re-splits on resize/font swap |
| `Flip.getState(targets)` / `Flip.from(state, vars)` | animate a DOM mutation's layout delta (position swaps, reflow-affecting toggles) |

**Lenis**

| Option / API | Use |
|---|---|
| `duration` | scroll "weight" in seconds, 0.9–1.2 typical |
| `smoothWheel` | enable smoothing on wheel input |
| `syncTouch` | leave `false` — native touch scroll feels better than simulated smoothing on mobile |
| `wheelMultiplier` | tune perceived scroll speed |
| `lenis.on('scroll', cb)` | subscribe to virtual scroll updates |
| `lenis.raf(time)` | advance the instance — drive this from GSAP's own ticker, not a separate `requestAnimationFrame` |
| `lenis.scrollTo(target)` | the only correct way to jump to an anchor/element once Lenis owns the scroll |
| `lenis.destroy()` | required cleanup |

**Motion**

| API | Use |
|---|---|
| `motion.div` / `motion[el]` | animatable primitive, drop-in for any DOM tag |
| `AnimatePresence` | exit animations on unmount |
| `useScroll` / `useTransform` | scroll-linked motion values without ScrollTrigger, for simple cases |
| `useSpring` | physics-smoothed motion value |
| `whileHover` / `whileTap` / `layout` | gesture and auto-layout animation shorthand |
| `useReducedMotion` | read `prefers-reduced-motion` reactively |

## Shared setup: Lenis driven by GSAP's ticker

Mount once in the root layout's client tree. Every scroll-driven recipe below assumes this is running — `ScrollTrigger.update` must fire on Lenis's virtual scroll, not the native `scroll` event, or scrub timing drifts.

```tsx
// components/smooth-scroll-provider.tsx
'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false });
    const raf = (time: number) => lenis.raf(time * 1000);

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
```

Anchor links and any `window.scrollTo` call in the app must switch to `lenis.scrollTo(...)` once this is mounted, or they silently no-op against Lenis's virtual position.

## Patterns

### 1. Preloader with real progress + hero handoff

**When:** heavy above-the-fold assets (hero video, canvas sequence, large images) where masking load time and choreographing the entrance matters more than time-to-first-paint.
**Weight:** High — coordinates async loading with animation state; the top source of "preloader stuck at 87%" bugs if you skip the timeout.

```tsx
// components/preloader.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export function Preloader({ assets, onComplete }: { assets: string[]; onComplete: () => void }) {
  const [pct, setPct] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const total = assets.length || 1;
    let loaded = 0;
    const counter = { v: 0 };

    const bump = () => {
      loaded += 1;
      gsap.to(counter, {
        v: (loaded / total) * 100,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => {
          const v = Math.round(counter.v);
          setPct(v);
          gsap.set(bar.current, { scaleX: v / 100 });
        },
        onComplete: () => loaded >= total && !done.current && exit(),
      });
    };

    const load = (src: string) =>
      new Promise<void>((res) => {
        if (/\.(mp4|webm)$/i.test(src)) {
          const v = document.createElement('video');
          v.src = src; v.oncanplaythrough = () => res(); v.onerror = () => res(); v.load();
        } else {
          const img = new Image();
          img.src = src; img.onload = () => res(); img.onerror = () => res();
        }
      });

    Promise.all(assets.map((s) => load(s).then(bump)));
    const timeout = setTimeout(() => !done.current && exit(), 8000); // never trap the user behind a stuck preloader

    function exit() {
      done.current = true;
      gsap.timeline({ onComplete: () => { root.current?.remove(); onComplete(); } })
        .to(bar.current, { scaleX: 1, duration: 0.2 })
        .to(root.current, { yPercent: -100, duration: 0.8, ease: 'power3.inOut' }, '+=0.1');
    }
    return () => clearTimeout(timeout);
  }, [assets, onComplete]);

  return (
    <div ref={root} className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black text-white">
      <span className="font-mono text-6xl tabular-nums">{pct}</span>
      <div className="mt-6 h-px w-48 bg-white/20">
        <div ref={bar} className="h-full origin-left bg-white" style={{ transform: 'scaleX(0)' }} />
      </div>
    </div>
  );
}
```

Handoff: the parent holds `ready` state and only mounts the hero's entrance `useGSAP` once `onComplete` fires, so the two timelines never race:

```tsx
const [ready, setReady] = useState(false);
{!ready && <Preloader assets={heroAssets} onComplete={() => setReady(true)} />}
<Hero playIntro={ready} />
```

**Perf:** preload only above-the-fold assets, never the whole site. `onerror` resolves instead of rejects so one broken asset can't hang the bar forever.

### 2. Hero headline masked line reveal

**When:** any hero/section headline that should reveal as if sliding out from behind a mask rather than fading in place — the highest-leverage, lowest-cost motion moment on a page.
**Weight:** Low.

```tsx
// components/hero-headline.tsx
'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText, useGSAP);

export function HeroHeadline({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    document.fonts.ready.then(() => {
      SplitText.create(ref.current, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 0.9,
            ease: 'power4.out',
            stagger: 0.08,
            delay: 0.15,
          });
        },
      });
    });
  }, { scope: ref });

  return <h1 ref={ref} className="invisible text-6xl font-medium leading-[1.05] [&.split-ready]:visible">{text}</h1>;
}
```

`mask: 'lines'` auto-wraps each line in an overflow-hidden div — no manual markup needed. `autoSplit: true` re-splits on resize and font load, and `onSplit` is the only place to create the animation, so re-splits always animate the fresh line elements instead of stale ones.

**Perf:** wait on `document.fonts.ready` before splitting or line breaks measured against the fallback font will visibly rewrap once the webfont swaps in. Keep the heading `invisible` until split (toggle a class in `onSplit`) to avoid a one-frame flash of unmasked text.

### 3. Sticky pinned multi-step storytelling section

**When:** a scroll-controlled sequence of 3–5 narrative beats inside one pinned viewport (feature walkthroughs, "how it works" sections).
**Weight:** Medium.

```tsx
// components/story-section.tsx
'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = ['Discover', 'Design', 'Deploy'];

export function StorySection() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const panels = gsap.utils.toArray<HTMLElement>('.story-step', ref.current!);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ref.current,
        start: 'top top',
        end: () => `+=${panels.length * 100}%`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    panels.forEach((panel, i) => {
      if (i > 0) tl.to(panels[i - 1], { autoAlpha: 0, yPercent: -8, duration: 0.3 }, `step${i}`);
      tl.fromTo(panel, { autoAlpha: 0, yPercent: 8 }, { autoAlpha: 1, yPercent: 0, duration: 0.3 }, `step${i}`);
      if (i < panels.length - 1) tl.to({}, { duration: 0.4 }); // hold on this step before advancing
    });
  }, { scope: ref });

  return (
    <section ref={ref} className="relative h-screen overflow-hidden">
      {STEPS.map((step, i) => (
        <div
          key={step}
          className="story-step absolute inset-0 flex items-center justify-center"
          style={{ visibility: i === 0 ? 'visible' : 'hidden' }}
        >
          <h2 className="text-5xl">{step}</h2>
        </div>
      ))}
    </section>
  );
}
```

**Perf:** `end` is a function, not a static string — it re-evaluates on `ScrollTrigger.refresh()`, which matters the moment step count or viewport height changes. A static `end` string bakes in a stale pin distance after any resize.

### 4. Horizontal gallery via `containerAnimation`

**When:** a pinned section that scrolls horizontally while the page scrolls vertically, with per-card reveal animations keyed to horizontal position (not vertical).
**Weight:** High — nested triggers plus a driving tween is the most failure-prone pattern here.

```tsx
// components/horizontal-gallery.tsx
'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function HorizontalGallery({ images }: { images: string[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const track = trackRef.current!;
    const distance = track.scrollWidth - window.innerWidth;

    const scrollTween = gsap.to(track, {
      x: -distance,
      ease: 'none', // required: containerAnimation must be linear
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: () => `+=${distance}`,
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
      },
    });

    gsap.utils.toArray<HTMLElement>('.gallery-card', track).forEach((card) => {
      gsap.from(card, {
        scale: 0.85,
        autoAlpha: 0.4,
        duration: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          containerAnimation: scrollTween,
          start: 'left 80%',
          toggleActions: 'play none none reverse',
        },
      });
    });
  }, { scope: sectionRef, dependencies: [images.length] });

  return (
    <section ref={sectionRef} className="relative h-screen overflow-hidden">
      <div ref={trackRef} className="flex h-full w-max items-center gap-8 px-[10vw]">
        {images.map((src) => (
          <div key={src} className="gallery-card h-[70vh] w-[60vw] flex-none">
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Perf:** `containerAnimation` triggers can't be pinned or snapped themselves — only the outer driving tween pins. Card triggers use normal left/right start values as if scrolling horizontally, which `containerAnimation` translates for you.

### 5. Cheap parallax layers

**When:** depth cues on a hero or section background — the single highest ROI-to-cost motion effect available.
**Weight:** Low.

```tsx
// components/parallax-hero.tsx
'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function ParallaxHero() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.utils.toArray<HTMLElement>('[data-depth]', ref.current!).forEach((layer) => {
      const depth = Number(layer.dataset.depth ?? 0.2);
      gsap.to(layer, {
        yPercent: depth * -50,
        ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }, { scope: ref });

  return (
    <div ref={ref} className="relative h-[140vh] overflow-hidden">
      <div data-depth="0.1" className="absolute inset-0"><img src="/bg-sky.jpg" className="h-full w-full object-cover" alt="" /></div>
      <div data-depth="0.4" className="absolute inset-0 flex items-end justify-center"><img src="/bg-mountains.png" className="w-[120%]" alt="" /></div>
      <div data-depth="0.8" className="absolute inset-0 flex items-center justify-center"><h1 className="text-7xl text-white">Title</h1></div>
    </div>
  );
}
```

**Perf:** tween only `yPercent`/`xPercent` (transform, GPU-composited) — never `top` or `background-position`, both force layout/paint on every scrub frame. One composited layer per `data-depth` element is the entire cost.

### 6. Infinite marquee — CSS base, GSAP speed-on-scroll hybrid

**When:** logo strips, ticker text, scrolling credits — anything that needs to run forever cheaply and optionally react to scroll velocity.
**Weight:** Low.

```css
/* globals.css */
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
```

```tsx
// components/marquee.tsx
'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Marquee({ items }: { items: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const track = trackRef.current!;
    ScrollTrigger.create({
      onUpdate: (self) => {
        const speed = gsap.utils.clamp(0.4, 3, 1 + Math.abs(self.getVelocity()) / 2000);
        gsap.to(track, { '--marquee-speed': speed, duration: 0.4, ease: 'power2.out', overwrite: true });
      },
    });
  }, { scope: trackRef });

  return (
    <div className="overflow-hidden">
      <div
        ref={trackRef}
        className="flex w-max animate-[marquee_20s_linear_infinite] gap-12"
        style={{ animationDuration: 'calc(20s / var(--marquee-speed, 1))' } as React.CSSProperties}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="whitespace-nowrap text-4xl">{item}</span>
        ))}
      </div>
    </div>
  );
}
```

The marquee itself is a pure CSS `animation` — it runs on the compositor even before hydration and survives tab-throttling gracefully. GSAP never touches `transform` here; it only nudges a `--marquee-speed` custom property that the CSS `animation-duration` reads via `calc()`. Content is duplicated once (`[...items, ...items]`) so the `-50%` keyframe loops seamlessly.

**Perf:** this is the cheapest motion effect in the file — zero JS-driven per-frame work. Never rewrite this as a `gsap.to({x: ...}, {repeat: -1})` main-thread loop; that's strictly worse for identical output.

### 7. Magnetic button + custom cursor

**When:** primary CTAs that should feel physically attracted to the cursor; a custom cursor dot for desktop-only sites with a strong art direction.
**Weight:** Low per element, but the cursor is global state — mount it once.

```tsx
// components/magnetic-button.tsx
'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export function MagneticButton({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);

  useGSAP(() => {
    const el = ref.current!;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      xTo((e.clientX - (rect.left + rect.width / 2)) * 0.35);
      yTo((e.clientY - (rect.top + rect.height / 2)) * 0.35);
    };
    const onLeave = () => { xTo(0); yTo(0); };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, { scope: ref });

  return <button ref={ref} className="rounded-full bg-white px-8 py-4 text-black">{children}</button>;
}
```

```tsx
// components/custom-cursor.tsx
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return; // no cursor concept on touch
    const xTo = gsap.quickTo(dotRef.current, 'x', { duration: 0.15, ease: 'power3' });
    const yTo = gsap.quickTo(dotRef.current, 'y', { duration: 0.15, ease: 'power3' });
    const onMove = (e: PointerEvent) => { xTo(e.clientX); yTo(e.clientY); };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div
      ref={dotRef}
      className="pointer-events-none fixed left-0 top-0 z-[999] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white mix-blend-difference"
    />
  );
}
```

**Perf:** `quickTo` pre-compiles a setter function — create it once per element in setup, never inside the move handler. Both snippets bail out entirely on coarse pointers.

### 8. Scroll-scrubbed image sequence on canvas

**When:** cinematic product reveals (car rotate, product unbox) where you need frame-accurate scrub with no codec-seeking artifacts — the reliable alternative to video scrubbing.
**Weight:** High — asset count and preload strategy dominate the complexity.

```tsx
// components/scroll-image-sequence.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const frameUrl = (i: number) => `/sequence/frame_${String(i).padStart(4, '0')}.webp`;

export function ScrollImageSequence({ frameCount = 120 }: { frameCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const images: HTMLImageElement[] = new Array(frameCount);
    let loaded = 0;
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = frameUrl(i);
      img.onload = img.onerror = () => { loaded += 1; if (loaded === frameCount && !cancelled) setReady(true); };
      images[i] = img;
    }
    imagesRef.current = images;
    return () => { cancelled = true; };
  }, [frameCount]);

  useEffect(() => {
    if (!ready || !canvasRef.current || !sectionRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const frame = { index: 0 };

    const draw = (i: number) => {
      const img = imagesRef.current[i];
      if (!img?.complete) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      draw(frame.index);
    };
    resize();
    window.addEventListener('resize', resize);

    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: '+=200%',
      scrub: 0.5,
      pin: true,
      onUpdate: (self) => {
        const i = Math.min(frameCount - 1, Math.floor(self.progress * frameCount));
        if (i !== frame.index) { frame.index = i; draw(i); }
      },
    });

    return () => { window.removeEventListener('resize', resize); st.kill(); };
  }, [ready, frameCount]);

  return (
    <div ref={sectionRef} className="relative h-screen w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
      {!ready && <div className="absolute inset-0 flex items-center justify-center text-white">Loading…</div>}
    </div>
  );
}
```

**Perf:** draw only fires when the computed frame index changes, not on every `onUpdate` tick — avoids redundant `drawImage` calls during a slow scrub. Serve WebP frames sized to the largest rendered dimension, never larger; 120 frames at ~40KB each is ~5MB, which is why this recipe lives or dies on preload strategy, not draw cost.

### 9. Scroll-scrubbed video fallback (and its pitfalls)

**When:** a lighter-weight alternative to the canvas sequence when you control the encode and can accept lower scrub fidelity — never as the default choice.
**Weight:** Medium, but fragile across devices — read the pitfalls before shipping this.

```tsx
// components/scroll-scrubbed-video.tsx
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function ScrollScrubbedVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;
    let st: ScrollTrigger | undefined;

    const setup = () => {
      st = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=200%',
        scrub: 0.5,
        pin: true,
        onUpdate: (self) => { video.currentTime = self.progress * video.duration; },
      });
    };

    if (video.readyState >= 1) setup();
    else video.addEventListener('loadedmetadata', setup, { once: true });

    return () => { st?.kill(); video.removeEventListener('loadedmetadata', setup); };
  }, []);

  return (
    <div ref={sectionRef} className="relative h-screen w-full">
      <video ref={videoRef} src={src} muted playsInline preload="auto" className="h-full w-full object-cover" />
    </div>
  );
}
```

**Pitfalls specific to this recipe:**
- Long-GOP-encoded MP4 stutters at every keyframe boundary during scrub-seeking — re-encode with a very short GOP (`-g 1` in ffmpeg) for smooth seeking, which inflates file size substantially. This is the real trade-off: smooth scrub or small file, rarely both.
- iOS Safari restricts arbitrary `currentTime` seeking on video that hasn't been user-triggered or isn't `muted + playsInline`; without both attributes, scrubbing silently does nothing on iOS.
- `currentTime` assignment is inherently async and can drop frames under fast scroll velocity — there is no frame-accuracy guarantee, unlike the canvas sequence.
- Reserve this recipe for ambient background loops or as a low-fidelity fallback for reduced-motion/low-end devices where you just autoplay natively instead of scrubbing — prefer recipe 8 for anything the design calls "frame-precise."

### 10. Animated number counters / odometer

**When:** stats sections ("$4.2M raised", "12,000 users") that should count up once when scrolled into view.
**Weight:** Low.

```tsx
// components/stat-counter.tsx
'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function StatCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const counter = { n: 0 };
    gsap.to(counter, {
      n: value,
      duration: 1.6,
      ease: 'power2.out',
      snap: { n: 1 },
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => { el.textContent = Math.round(counter.n).toLocaleString() + suffix; },
    });
  }, { scope: ref, dependencies: [value] });

  return <span ref={ref}>0{suffix}</span>;
}
```

**Perf:** `once: true` is load-bearing — without it, flicking past the trigger on scroll-up/down replays the count and reads as broken, not delightful. `snap: { n: 1 }` keeps the displayed value on whole numbers throughout the tween instead of only at the end.

### 11. Section-based color theme switching on scroll

**When:** long-scroll pages where each section declares its own light/dark or brand-accent theme and the page background/foreground should crossfade as you pass each boundary.
**Weight:** Medium.

```tsx
// components/theme-sections.tsx
'use client';
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const THEMES: Record<string, { bg: string; fg: string; accent: string }> = {
  light: { bg: '#f5f4f0', fg: '#111111', accent: '#ff4d00' },
  dark: { bg: '#0a0a0a', fg: '#f5f4f0', accent: '#7dfbff' },
};

export function ThemeSections({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const applyTheme = (name?: string) => {
      const t = THEMES[name ?? 'light'];
      if (!t) return;
      gsap.to(document.documentElement, {
        '--bg': t.bg, '--fg': t.fg, '--accent': t.accent,
        duration: 0.6, ease: 'power2.inOut', overwrite: 'auto',
      });
    };

    const triggers = gsap.utils.toArray<HTMLElement>('[data-theme]').map((section) =>
      ScrollTrigger.create({
        trigger: section,
        start: 'top 60%',
        end: 'bottom 60%',
        onEnter: () => applyTheme(section.dataset.theme),
        onEnterBack: () => applyTheme(section.dataset.theme),
      })
    );
    return () => triggers.forEach((t) => t.kill());
  }, []);

  return <>{children}</>;
}
```

Each section marks itself with `<section data-theme="dark">`; the rest of the app reads `background: var(--bg); color: var(--fg)`. GSAP's core CSSPlugin (bundled, no extra import) tweens custom properties directly.

**Perf:** don't also add a CSS `transition` on `background-color`/`color` on the same elements — GSAP is already easing the variable's value frame by frame, and stacking a CSS transition on top double-eases and introduces lag.

### 12. Footer reveal (bottom sheet uncovered by the last section)

**When:** the "footer slides up from underneath as the last section rides away" effect seen on most premium marketing sites.
**Weight:** Low for the base effect, Medium with the animated flourish.

The base effect needs zero JavaScript — it's `position: sticky` used correctly:

```tsx
// components/sticky-footer-shell.tsx
export function StickyFooterShell({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="relative">
      <main className="relative z-10 bg-[var(--bg)]">{children}</main>
      <footer className="sticky bottom-0 z-0 h-screen">{footer}</footer>
    </div>
  );
}
```

Optional flourish — scale/round the last section as it slides away to sell the "curtain lifting" feel:

```tsx
// components/curtain-section.tsx
'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function CurtainSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.to(ref.current, {
      scale: 0.92,
      borderRadius: 24,
      ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'bottom bottom', end: 'bottom top', scrub: true },
    });
  }, { scope: ref });
  return <div ref={ref} className="relative z-10 h-screen origin-top">{children}</div>;
}
```

**Perf:** `main` must have a solid background and sit above the footer in stacking order, and no ancestor between the sticky footer and its containing block may have `overflow: hidden` — that silently breaks `position: sticky` and is the single most common reason this pattern "just doesn't work."

### 13. FAQ / accordion height animation done right

**When:** any disclosure widget — FAQ, nav submenu, filter panel. The correct 2026 answer is CSS grid, not JS height measurement.
**Weight:** Low for the default case; Medium if you need the Flip variant.

```tsx
// components/accordion-item.tsx
'use client';
import { useState } from 'react';

export function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span>{question}</span>
        <span className={`transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-white/70">{answer}</p>
        </div>
      </div>
    </div>
  );
}
```

`0fr` ↔ `1fr` on a grid track animates to true content height with zero JS measurement, no `ResizeObserver`, and no `max-height: 9999px` easing-speed inconsistency between short and long panels.

Use Flip instead only when the toggle must also animate a layout shift *outside* the accordion itself (e.g. a sticky sidebar whose height depends on total page content):

```tsx
import { Flip } from 'gsap/Flip';
gsap.registerPlugin(Flip);

function toggle(setOpen: (fn: (v: boolean) => boolean) => void, scopeEl: HTMLElement) {
  const state = Flip.getState(scopeEl.querySelectorAll('[data-flip]'));
  setOpen((v) => !v);
  requestAnimationFrame(() => Flip.from(state, { duration: 0.4, ease: 'power2.inOut' }));
}
```

**Perf:** the grid technique is pure CSS — no JS animation cost at all. Reserve Flip for the specific case above; it's real work (state capture + DOM diff) that the CSS version doesn't need.

## Integration gotchas

- Never touch `ScrollTrigger`/`SplitText`/DOM APIs at module scope in a file without `'use client'` — Next.js will pull it into the Server Component graph and fail the build. `gsap.registerPlugin(...)` itself is safe at module scope (it doesn't touch `window`); the actual animation work belongs in `useEffect`/`useGSAP`.
- Always use `useGSAP`, not a raw `useEffect`, for GSAP work. React 19 Strict Mode double-invokes effects in dev; `useGSAP`'s automatic `gsap.context().revert()` prevents duplicate ScrollTriggers from accumulating. A raw `useEffect` cleanup that only calls `.kill()` on tweens you remembered to track will still leak the ones you didn't.
- Call `ScrollTrigger.refresh()` after anything that changes layout post-hydration: images finishing load (set `priority` on `next/image` inside pinned/scrubbed sections, or refresh on `onLoad`), fonts swapping, a Suspense boundary flushing content.
- Lenis owns scroll once mounted — audit every `<a href="#section">` and `window.scrollTo` call; they need `lenis.scrollTo(target)` instead or they silently no-op.
- `overflow: hidden` on any ancestor breaks `position: sticky`, which pinning, footer reveal, and Lenis all depend on. Trace ancestors first when "sticky doesn't work" shows up.
- Gate motion behind `prefers-reduced-motion` at minimum for: preloader (skip straight to `onComplete`), parallax, marquee velocity boost, autoplaying scrub video. Use `gsap.matchMedia().add('(prefers-reduced-motion: reduce)', () => { /* return cleanup */ })` for anything non-trivial to disable.
- Motion (`motion/react`) components must live inside a `'use client'` boundary; for pages with only a couple of animated elements, `LazyMotion` + the `m` component trims the bundle meaningfully — see motion.dev docs when bundle size matters more than convenience.

## Pitfalls

- Every section fading up 40px with the same `power2` ease and 0.6s duration is the single most recognizable "AI-generated" tell. Vary easing, distance, and stagger per section; let some sections cut instead of fade.
- Animating `top`/`left`/`width`/`height` instead of `transform`/`clip-path` — tanks frame rate on mid-range Android, invisible on a dev machine.
- Pinning without accounting for `pinSpacing` — content jumps or overlaps the next section on unpin if you disabled it without compensating manually.
- Shipping `markers: true` to production — instant tell of unfinished work.
- Driving an infinite marquee with a per-frame JS loop (`gsap.to({x}, {repeat:-1})`) instead of a CSS `animation` — burns main thread for a purely decorative, infinitely-loopable effect that belongs on the compositor.
- Leaving `will-change: transform` permanently set on pinned/parallax elements instead of toggling it on right before the scrub range and removing it after — forces persistent GPU layers that tank memory on low-end phones.
- Rendering a custom cursor without disabling it on `(pointer: coarse)` — a ghost dot frozen in a corner on every mobile visit.
- Counters without `once: true` on their ScrollTrigger — replays and reads as broken when a user scrolls back and forth across the trigger.
- `max-height: 9999px` accordion transitions — visibly inconsistent easing speed between a two-line and a ten-line panel; use the grid-template-rows technique.
