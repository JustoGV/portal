# Carousels: Embla First
How to build production carousels in Next.js/React with Embla Carousel as the default choice, Swiper as the batteries-included escape hatch, and CSS scroll-snap as the zero-JS baseline.

## Current as of July 2026

| Package | Version | Notes |
|---|---|---|
| `embla-carousel` | 8.6.0 (npm `latest`) | Core engine, framework-agnostic |
| `embla-carousel-react` | 8.6.0 | React bindings, peer `react: ^16.8.0 \|\| ^17.0.1 \|\| ^18.0.0 \|\| ^19.0.0 \|\| ^19.0.0-rc` |
| `embla-carousel-autoplay` | 8.6.0 | Official plugin |
| `embla-carousel-auto-scroll` | 8.6.0 | Official plugin, continuous marquee |
| `embla-carousel-class-names` | 8.6.0 | Official plugin |
| `embla-carousel-fade` | 8.6.0 | Official plugin, crossfade instead of translate |
| `embla-carousel-wheel-gestures` | 8.1.0 | **Third-party** (maintained by xiel, not the Embla org). Trackpad/wheel-to-slide. |
| `swiper` | 14.0.5 | MIT, zero peer deps, ships its own React components |

All Embla packages: MIT license, zero dependencies, tree-shakeable.

```bash
npm install embla-carousel-react embla-carousel-autoplay embla-carousel-class-names
npm install embla-carousel-auto-scroll      # marquee pattern
npm install embla-carousel-wheel-gestures   # trackpad support, optional/third-party
npm install swiper                          # alternative
```

**Forward-looking note** (verified against npm dist-tags and GitHub): `9.0.0-rc02` sits under the npm `next` tag and the public docs site already reflects v9's API, but it has **not** shipped to `latest`. v9 renames a chunk of the surface: `scrollNext/scrollPrev` → `goToNext/goToPrev`, `scrollTo` → `goTo`, `canScrollNext/canScrollPrev` → `canGoToNext/canGoToPrev`, `selectedScrollSnap` → `selectedSnap`, `scrollSnapList` → `snapList`, `startIndex` → `startSnap`, `watchDrag` → `draggable`, `watchResize` → `resize`, `watchSlides` → `slideChanges`, `watchFocus` → `focus`, events go lowercase and the `init` event is removed (`pointerDown` → `pointerdown`, `slideFocusStart` → `slidefocus`). Everything below is v8.6.0 — what `npm install` actually gives you. If a project pins `@next`/`^9`, translate names using this table first.

## Mental model

Embla is not a carousel — it's a scroll-snap physics engine with a DOM-agnostic core and a thin React hook on top. It owns nothing about styling, arrows, dots, or slide markup: you build the UI, Embla computes snap points, drag physics, and loop math. That's why it's the senior default over Swiper for anything bespoke — Swiper hands you a finished component with its own CSS and DOM structure to fight against; Embla hands you a `ref` and an event emitter, so a designed-to-spec automotive gallery or synced-thumbnail view never requires overriding someone else's opinions. Reach for Swiper when the ask is "pagination, three effects, and a lightbox by Friday" — its built-in `EffectCoverflow`, `EffectCards`, `Zoom`, and `Thumbs` modules save real days versus hand-rolling the same in Embla. Reach for plain CSS `scroll-snap` when there's no drag-state UI (no dots, no arrows, no autoplay) — it's free, ships zero JS, and native momentum scrolling already feels right on iOS/Android. Never reach for a carousel library at all for a single hero image or a 2-item toggle — that's conditional rendering with a transition.

## API essentials

### Hook signature

```ts
import useEmblaCarousel from 'embla-carousel-react'
import type { EmblaOptionsType, EmblaPluginType } from 'embla-carousel'

const [emblaRef, emblaApi] = useEmblaCarousel(
  options?: EmblaOptionsType,
  plugins?: EmblaPluginType[]
)
// emblaRef: (node: HTMLElement | null) => void  — attach to the VIEWPORT div
// emblaApi: EmblaCarouselType | undefined         — undefined until mount; always guard it
```

`useEmblaCarousel` is the **default export**. Don't destructure it as a named import.

### Options (`EmblaOptionsType`, all optional, shown with v8.6.0 defaults)

| Option | Default | Use for |
|---|---|---|
| `loop` | `false` | Infinite carousels. Adds clone slides — see Pitfalls. |
| `align` | `'center'` | `'start' \| 'center' \| 'end'` or `(viewSize, snapSize, index) => number`. Product galleries: `'start'`. Feature carousels: `'center'`. |
| `axis` | `'x'` | `'y'` for vertical (testimonial stacks, story-style feeds). |
| `containScroll` | `'trimSnaps'` | `'trimSnaps'` removes empty space at the edges; `'keepSnaps'` preserves them (needed for thumb rails); `false` disables containment (needed for `loop`). |
| `dragFree` | `false` | `true` = momentum scroll without snapping to nearest slide first (galleries, tag lists). Combine with `dragThreshold` tuning. |
| `slidesToScroll` | `1` | `'auto'` scrolls by the number of slides in view. |
| `startIndex` | `0` | Initial slide. |
| `dragThreshold` | `10` | Px of pointer movement before a drag starts registering — raise on carousels that sit inside another scrollable area. |
| `duration` | `25` | Scroll animation duration in frames (~ms at 60fps), not ms. Lower = snappier. |
| `skipSnaps` | `false` | `true` lets a fast flick skip multiple slides in one gesture. |
| `watchDrag` | `true` | Set `false` to disable pointer dragging (arrows/dots-only carousels). |
| `watchResize` | `true` | Auto reInit on container resize. |
| `inViewThreshold` | `0` | Fraction of a slide visible before it counts in `slidesInView()`. |
| `breakpoints` | `{}` | Media-query-keyed partial-option overrides, see pattern below. |

### `emblaApi` methods actually used in implementation

| Method | Returns | Notes |
|---|---|---|
| `scrollNext()` / `scrollPrev()` | `void` | |
| `scrollTo(index, jump?)` | `void` | `jump: true` skips the animation (thumb sync, resize correction). |
| `canScrollNext()` / `canScrollPrev()` | `boolean` | Drive disabled state on arrows — always check this, don't just hide/show. |
| `selectedScrollSnap()` | `number` | Current snap index, for dots/counter. |
| `previousScrollSnap()` | `number` | For directional animation (was this a "next" or "prev" transition). |
| `scrollSnapList()` | `number[]` | One entry per snap point — length = dot count (not slide count, when `slidesToScroll > 1`). |
| `scrollProgress()` | `number` | `0–1` across the whole track — drives progress bars and tween effects. |
| `slidesInView()` | `number[]` | Slide indexes currently visible — drives lazy-loading and `aria-hidden`. |
| `slideNodes()` | `HTMLElement[]` | Raw slide DOM nodes, for tween effects. |
| `plugins()` | object keyed by plugin name | e.g. `emblaApi.plugins().autoplay?.play()`. |
| `on(event, cb)` / `off(event, cb)` | `EmblaCarouselType` | Always pair with cleanup — see gotchas. |
| `reInit(options?)` | `void` | Call after mutating slide count/content dynamically. |
| `destroy()` | `void` | Called automatically by the React hook on unmount — don't call it yourself. |

### Events (`emblaApi.on(...)`)

`init`, `select`, `scroll`, `settle`, `resize`, `reInit`, `destroy`, `pointerDown`, `pointerUp`, `slidesChanged`, `slidesInView`, `slideFocusStart`, `slideFocus`.

`select` fires on snap change (drive dots/counter). `scroll` fires every frame during motion (drive progress bars/tween effects — throttle expensive work here). `settle` fires once motion fully stops (good place for analytics events, not `select`).

## Patterns

### Base carousel (Next.js App Router, client component)

```tsx
// components/carousel.tsx
'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'

type CarouselProps = {
  slides: { id: string; content: React.ReactNode }[]
}

export function Carousel({ slides }: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y -ml-4">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="min-w-0 shrink-0 grow-0 basis-full pl-4 sm:basis-1/2 lg:basis-1/3"
            >
              {slide.content}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => emblaApi?.scrollPrev()}
        disabled={!canPrev}
        aria-label="Previous slide"
        className="absolute left-2 top-1/2 -translate-y-1/2 disabled:opacity-30"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        disabled={!canNext}
        aria-label="Next slide"
        className="absolute right-2 top-1/2 -translate-y-1/2 disabled:opacity-30"
      >
        ›
      </button>
    </div>
  )
}
```

Notes: `min-w-0` on every slide is not optional — flex children default to `min-width: auto`, which makes wide content (long text, images without explicit sizing) blow out the slide width and desync the snap points. `off()` in the effect cleanup matters under React 19 StrictMode's double-invoke — without it you get duplicate `select` handlers after the dev-mode remount.

Responsive options: `breakpoints: { '(min-width: 768px)': { slidesToScroll: 2 }, '(min-width: 1280px)': { slidesToScroll: 3, dragFree: true } }` — keys are real `matchMedia` query strings, not Tailwind tokens.

### Autoplay, with reduced-motion respect

```tsx
'use client'

import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useEffect, useRef, useState } from 'react'

export function AutoplayCarousel({ slides }: { slides: React.ReactNode[] }) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const autoplay = useRef(
    Autoplay({
      delay: 4000,
      stopOnInteraction: false, // resumes after a manual swipe
      stopOnMouseEnter: true,   // pauses on hover, courteous default
      playOnInit: !prefersReducedMotion,
    }),
  )

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplay.current])

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex">
        {slides.map((slide, i) => (
          <div key={i} className="min-w-0 shrink-0 grow-0 basis-full">
            {slide}
          </div>
        ))}
      </div>
    </div>
  )
}
```

`Autoplay` v8.6.0 options actually worth setting: `delay` (ms), `jump` (`true` = instant scroll on autoplay tick instead of animated), `playOnInit`, `stopOnInteraction`, `stopOnMouseEnter`, `stopOnFocusIn`, `stopOnLastSnap`, `rootNode`. Checking `prefers-reduced-motion` once at init (as above) covers first paint; if the OS setting can flip mid-session, listen for the media query's `change` event and call `emblaApi.plugins().autoplay?.stop()` / `.play()`. Never ship autoplay that ignores `prefers-reduced-motion` — it's a WCAG 2.2.2 failure, not a nice-to-have.

### AutoScroll marquee (logo strips, ticker bands)

```tsx
'use client'

import useEmblaCarousel from 'embla-carousel-react'
import AutoScroll from 'embla-carousel-auto-scroll'

export function LogoMarquee({ logos }: { logos: React.ReactNode[] }) {
  const [emblaRef] = useEmblaCarousel({ loop: true, dragFree: true, align: 'start' }, [
    AutoScroll({ speed: 1.2, stopOnInteraction: false, stopOnMouseEnter: true }),
  ])

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex">
        {[...logos, ...logos].map((logo, i) => (
          <div key={i} className="min-w-0 shrink-0 grow-0 basis-1/6 px-6">
            {logo}
          </div>
        ))}
      </div>
    </div>
  )
}
```

Duplicate the logo array yourself for a marquee with few items — `loop: true` clones slides internally for snap math, but `AutoScroll`'s continuous motion still needs enough real content that the seam isn't visible on wide viewports.

### WheelGestures (trackpad-first galleries)

```tsx
import useEmblaCarousel from 'embla-carousel-react'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'

const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, dragFree: true }, [
  WheelGesturesPlugin(), // adds .is-wheel-dragging class on the root during a gesture
])
```

Third-party (pin the version, check its issue tracker before shipping in something critical). Use for full-bleed galleries and portfolio grids where two-finger trackpad swipe should move the carousel, matching native macOS/Windows scroll conventions.

### Dots (proper state, not just active/inactive)

```tsx
const scrollSnaps = emblaApi?.scrollSnapList() ?? []

<div role="tablist" aria-label="Slides" className="flex gap-2">
  {scrollSnaps.map((_, index) => (
    <button
      key={index}
      role="tab"
      aria-selected={index === selectedIndex}
      aria-label={`Go to slide ${index + 1}`}
      onClick={() => emblaApi?.scrollTo(index)}
      className={index === selectedIndex ? 'bg-foreground' : 'bg-foreground/30'}
    />
  ))}
</div>
```

Dot count = `scrollSnapList().length`, which is **not** `slides.length` once `slidesToScroll > 1` or `align` groups multiple slides per snap. Counting slides for dots is the single most common Embla bug in AI-generated carousels.

### Progress bar

```tsx
const [progress, setProgress] = useState(0)

useEffect(() => {
  if (!emblaApi) return
  const onScroll = () => setProgress(Math.max(0, Math.min(1, emblaApi.scrollProgress())) * 100)
  onScroll()
  emblaApi.on('scroll', onScroll)
  emblaApi.on('reInit', onScroll)
  return () => {
    emblaApi.off('scroll', onScroll)
    emblaApi.off('reInit', onScroll)
  }
}, [emblaApi])

// <div className="h-px bg-foreground/20"><div style={{ width: `${progress}%` }} className="h-full bg-foreground" /></div>
```

`scroll` fires every animation frame during motion — fine for a CSS `width` update, too hot for anything triggering React re-render of a big subtree. Keep the listener's state update this small, or move it to a ref + `requestAnimationFrame`-throttled DOM write.

### Slides-in-view lazy loading

```tsx
const [inView, setInView] = useState<number[]>([])

useEffect(() => {
  if (!emblaApi) return
  const update = () => setInView(emblaApi.slidesInView())
  update()
  emblaApi.on('slidesInView', update)
  emblaApi.on('reInit', update)
  return () => {
    emblaApi.off('slidesInView', update)
    emblaApi.off('reInit', update)
  }
}, [emblaApi])

// per slide: <img loading={inView.includes(index) ? 'eager' : 'lazy'} decoding="async" ... />
```

For `next/image`, pass `priority` only to the first 1–2 slides — never blanket `priority` across a whole carousel, it defeats LCP optimization.

### Tween effects — scale and opacity (public API, loop-safe)

The official Embla examples ("Parallax", "Scale", "Opacity") drive per-slide transforms off `scrollProgress()` inside the `scroll` handler. Scale/opacity only need each slide's *own* distance from the viewport center — computable from `emblaApi.scrollProgress()` and `emblaApi.scrollSnapList()` without touching internals. Drop this into the base carousel's slide refs (use `align: 'center'`, `dragFree: true`, and `overflow-visible` instead of `overflow-hidden` on the viewport so scaled neighbors aren't clipped):

```tsx
const slideRefs = useRef<HTMLDivElement[]>([])

const tween = useCallback(() => {
  if (!emblaApi) return
  const progress = emblaApi.scrollProgress()

  emblaApi.scrollSnapList().forEach((snap, index) => {
    const diff = Math.abs(snap - progress)
    const scale = Math.max(0.85, 1 - diff * 0.5)
    const opacity = Math.max(0.4, 1 - diff * 1.2)
    const node = slideRefs.current[index]
    if (node) {
      node.style.transform = `scale(${scale})`
      node.style.opacity = String(opacity)
    }
  })
}, [emblaApi])

useEffect(() => {
  if (!emblaApi) return
  tween()
  emblaApi.on('scroll', tween)
  emblaApi.on('reInit', tween)
  return () => {
    emblaApi.off('scroll', tween)
    emblaApi.off('reInit', tween)
  }
}, [emblaApi, tween])

// ref callback per slide: ref={(el) => { if (el) slideRefs.current[i] = el }}
// slide className needs will-change-transform and transition-none (JS drives the motion, not CSS)
```

**Parallax specifically** (background image shifting slower than the slide) needs loop-aware distance correction that the official example pulls from `emblaApi.internalEngine()` — a documented-but-semi-private API (`slideRegistry`, `slideLooper.loopPoints`) that exists to make the diff-to-target math correct across the clone boundary when `loop: true`. That internal shape isn't part of the stable public contract and shifts between minor versions — for a `loop: true` parallax carousel, pull the current implementation straight from `embla-carousel.com/docs/examples/predefined` at build time rather than copying it from memory. For `loop: false` carousels (the more common case for hero/feature parallax), the `scrollProgress()`-based math above is sufficient and stable.

### Synced main + thumbnail carousels

```tsx
'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'

export function GalleryWithThumbs({ images }: { images: { src: string; alt: string }[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mainRef, mainApi] = useEmblaCarousel({ loop: true })
  const [thumbRef, thumbApi] = useEmblaCarousel({
    containScroll: 'keepSnaps', // don't trim edge space — thumb rail needs stable positions
    dragFree: true,
    slidesToScroll: 1,
  })

  const onThumbClick = useCallback(
    (index: number) => mainApi?.scrollTo(index),
    [mainApi],
  )

  const onSelect = useCallback(() => {
    if (!mainApi || !thumbApi) return
    const index = mainApi.selectedScrollSnap()
    setSelectedIndex(index)
    thumbApi.scrollTo(index) // keep the rail following the main carousel
  }, [mainApi, thumbApi])

  useEffect(() => {
    if (!mainApi) return
    onSelect()
    mainApi.on('select', onSelect)
    mainApi.on('reInit', onSelect)
    return () => {
      mainApi.off('select', onSelect)
      mainApi.off('reInit', onSelect)
    }
  }, [mainApi, onSelect])

  return (
    <div>
      <div className="overflow-hidden" ref={mainRef}>
        <div className="flex">
          {images.map((img) => (
            <div key={img.src} className="min-w-0 shrink-0 grow-0 basis-full">
              <img src={img.src} alt={img.alt} className="w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden mt-3" ref={thumbRef}>
        <div className="flex gap-2">
          {images.map((img, index) => (
            <button
              key={img.src}
              onClick={() => onThumbClick(index)}
              aria-label={`View image ${index + 1}: ${img.alt}`}
              aria-current={index === selectedIndex}
              className={`min-w-0 shrink-0 grow-0 basis-1/6 ${
                index === selectedIndex ? 'opacity-100 ring-2 ring-foreground' : 'opacity-50'
              }`}
            >
              <img src={img.src} alt="" className="w-full" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

The thumb rail uses `containScroll: 'keepSnaps'`, not the main carousel's `'trimSnaps'` default — trimming makes thumb positions shift as you approach the end, which looks broken next to a fixed-position main image.

### ClassNames plugin (state-driven CSS, no React re-render)

```tsx
import ClassNames from 'embla-carousel-class-names'

const [emblaRef] = useEmblaCarousel({ loop: true }, [ClassNames()])
```

Default classes applied automatically: `is-snapped`, `is-in-view`, `is-draggable`, `is-dragging`, `is-loop` (on slides/root as appropriate). Style directly in CSS/Tailwind (`&.is-in-view { opacity: 1 }`) instead of wiring `slidesInView()` into React state when you only need visual styling — it skips a re-render round-trip entirely.

### Premium automotive gallery: full-bleed, edge-peek, counter, caption choreography

```tsx
'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'

type Slide = { id: string; image: string; caption: string; eyebrow: string }

export function AutomotiveGallery({ slides }: { slides: Slide[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'center',       // centered slide with visible neighbor edges = "edge-peek"
    dragFree: false,       // snap-per-slide, not free momentum — automotive galleries commit to one frame at a time
    skipSnaps: false,
    duration: 20,          // slightly snappier than default for a "precise" feel
  })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => emblaApi.off('select', onSelect)
  }, [emblaApi, onSelect])

  return (
    <div className="relative overflow-hidden" ref={emblaRef}>
      <div className="flex">
        {slides.map((slide) => (
          // basis < 100% on both sides of the container is what produces edge-peek;
          // px-[4vw] (not a fixed px value) keeps the peek proportional across viewport widths
          <div key={slide.id} className="min-w-0 shrink-0 grow-0 basis-[92%] px-[4vw] md:basis-[80%]">
            <div className="relative aspect-[16/9]">
              <img src={slide.image} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <p className="text-xs uppercase tracking-widest text-white/70">{slide.eyebrow}</p>
                <p className="text-lg text-white">{slide.caption}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* counter, not dots — automotive/editorial galleries read as more premium with "03 / 12" than a dot row */}
      <div className="absolute bottom-6 right-6 font-mono text-sm text-white/80">
        {String(selectedIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
      </div>
    </div>
  )
}
```

Caption choreography (staggered reveal per active slide, not a static overlay) belongs in the `select` handler as a CSS class toggle (`data-active` on the slide, `transition-delay` on the caption's own children), not as inline React-driven animation — keep the tween-frame work (scale/opacity above) and the discrete state work (captions, counter) in separate handlers so a 60fps `scroll` listener isn't also re-triggering text animations every frame.

### Swiper — when it wins

Reach for Swiper instead of Embla when the deliverable needs **out-of-the-box** pagination bullets, fraction/progress pagination, `EffectCoverflow`/`EffectCards`/`EffectFade`, `Zoom`, or a synced `Thumbs` module without hand-building any of it — Swiper ships these as importable modules, Embla makes you build the same behavior yourself (as shown above). The cost: Swiper's own CSS and DOM structure (`.swiper`, `.swiper-wrapper`, `.swiper-slide`) is more opinionated to override, and the bundle is larger even with per-module imports.

```tsx
'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, EffectCoverflow, Keyboard, A11y } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/effect-coverflow'

export function SwiperGallery({ slides }: { slides: { id: string; image: string }[] }) {
  return (
    <Swiper
      modules={[Navigation, Pagination, EffectCoverflow, Keyboard, A11y]}
      effect="coverflow"
      coverflowEffect={{ rotate: 30, stretch: 0, depth: 120, modifier: 1, slideShadows: false }}
      centeredSlides
      slidesPerView="auto"
      navigation
      pagination={{ clickable: true }}
      keyboard={{ enabled: true }}
      a11y={{ enabled: true }}
    >
      {slides.map((slide) => (
        <SwiperSlide key={slide.id} style={{ width: '70%' }}>
          <img src={slide.image} alt="" className="h-full w-full object-cover" />
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
```

Swiper's React components render their own DOM at mount, which is fine for Server Components' children boundary — but the whole `<Swiper>` tree must be inside a `'use client'` file; you cannot pass Server Component children into `SwiperSlide` and expect them to stream.

### CSS scroll-snap — zero-JS baseline

No dots, no autoplay, no drag-state UI needed (an FAQ image strip, a simple product-shot row): skip JS entirely.

```tsx
// Server Component — no 'use client' needed
export function SnapStrip({ images }: { images: { src: string; alt: string }[] }) {
  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 [scrollbar-width:none]">
      {images.map((img) => (
        <img
          key={img.src}
          src={img.src}
          alt={img.alt}
          className="h-64 w-64 shrink-0 snap-start object-cover"
        />
      ))}
    </div>
  )
}
```

Tailwind classes map to `scroll-snap-type: x mandatory`, `scroll-snap-align: start`, `scroll-padding-inline`. Add `overscroll-behavior-x: contain` (`[overscroll-behavior-x:contain]`) so an edge-of-carousel swipe doesn't bubble into browser back/forward navigation gestures. This is the correct default for anything that doesn't need programmatic control — it's faster to ship, has zero hydration cost, and native momentum scrolling on iOS/Android already beats most JS drag implementations.

## Accessibility

- Wrap the whole carousel in `role="region"` with `aria-roledescription="carousel"` and a real `aria-label` (not "carousel" — name what it contains: `aria-label="Product gallery"`).
- Each slide gets `role="group"` and `aria-roledescription="slide"`; if slides are numbered for the user (automotive counter pattern above), reflect that in `aria-label={\`Slide ${i + 1} of ${total}\`}`.
- Arrow buttons: real `<button>`, `aria-label`, and **disable** (not hide) at the ends — use `canScrollPrev()`/`canScrollNext()` as shown, don't just visually dim a still-clickable button.
- Dots: `role="tablist"` on the container, `role="tab"` + `aria-selected` per dot, as shown above — a `<div onClick>` dot is not keyboard-reachable.
- Keyboard: Embla's core doesn't bind arrow-key navigation itself — if slides are focusable (buttons/links inside), left/right arrow keys should move focus and trigger `scrollTo`; wire this on the container's `onKeyDown` for anything more than a passive image strip. Swiper's `Keyboard` module (`keyboard: { enabled: true }`) covers this for free.
- Autoplay must stop on `prefers-reduced-motion: reduce`, on focus-in (`stopOnFocusIn: true`, Embla's default), and needs a visible pause control if it runs longer than 5 seconds per WCAG 2.2.2 — don't ship silent infinite autoplay with no way to stop it.
- `aria-hidden="true"` on slides outside `slidesInView()` prevents screen readers from announcing off-screen slide content that's still technically in the DOM.

## Integration gotchas

- **SSR/hydration**: Embla's `emblaRef` is a callback ref assigned post-mount; there's no `window` access during render, so it's SSR-safe with zero special-casing. The visible risk is FOUC before JS attaches — the viewport `div` needs `overflow-hidden` and the track needs `display:flex` from CSS alone (Tailwind classes, not inline styles set by JS) so the *first* slide is correctly clipped even before hydration completes.
- **React 19 / StrictMode**: `embla-carousel-react` creates/destroys the instance in an internal effect and is StrictMode double-invoke safe out of the box — you do not need to guard `useEmblaCarousel` itself. What you do need to guard is *your own* `emblaApi.on(...)` listeners: always return the matching `.off(...)` from `useEffect`, or StrictMode's mount→unmount→remount cycle in dev leaves duplicate listeners (visible as double-firing counters/progress bars, dev-only).
- **Dynamic slide count**: adding/removing slides at runtime (filtering a product grid) requires `emblaApi.reInit()` after the DOM updates — Embla's `watchSlides` (default `true`) catches structural mutations automatically in most cases, but explicit `reInit()` after async data changes is more reliable than relying on the mutation observer's timing.
- **Next.js Image**: `next/image` requires explicit dimensions or `fill` + a sized relative parent; a bare `<Image>` inside a `flex` slide with no `basis-*` set collapses to zero width before layout — always pair `next/image` slides with an explicit `basis-*`/`aspect-*` on the slide wrapper.
- **Server Components boundary**: `useEmblaCarousel` must run in a `'use client'` file. Slide *content* can still be Server Components passed as `children`/props into the client carousel shell — don't make the whole page client just because one carousel needs it.

## Pitfalls

- **Missing `min-w-0` on slides.** The single most common break: long text or an unconstrained image inside a flex slide expands past its `basis-*`, desyncing every snap point after it. Always set it.
- **Counting `slides.length` for dots instead of `scrollSnapList().length`.** Breaks the moment `slidesToScroll > 1` or multi-per-view alignment is used — produces dots that don't match actual stopping points.
- **Autoplay with no pause control and no `prefers-reduced-motion` check.** Immediate accessibility failure and the fastest way to make a hero section feel like an ad, not a product site.
- **Centered-dot-row-of-6 generic pattern.** Counter (`03 / 12`), progress bar, or numbered tabs read as considerably more premium/Awwwards-tier than the default "row of gray dots" — the automotive pattern above is the senior default for editorial/product galleries, dots are the senior default only for short (3–5 slide) testimonial/feature carousels.
- **Symmetric `basis-full` slides with no edge-peek on image-heavy carousels.** A slide that exactly fills the viewport with no neighbor visible reads as a slideshow, not a carousel — even 5–8% of the next slide peeking in signals "there's more" and measurably increases interaction rates.
- **`duration` treated as milliseconds.** It's animation frames (~60fps), so `duration: 25` ≈ 416ms. Setting `duration: 300` "for a slow feel" produces an absurdly long ~5 second glide — a frequent AI-generated-code mistake.
- **Loop mode without `containScroll: false`.** `loop: true` needs unclamped scroll containment to clone slides correctly; leaving the default `'trimSnaps'` on a looped carousel produces visible snapping glitches at the loop boundary.
- **Building a whole custom drag/tween system when CSS `scroll-snap` would do.** If the final UI has no dots, no arrows, no autoplay, no programmatic `scrollTo` — it's a scroll-snap strip, not a carousel. Shipping Embla for that is unjustified JS weight.
- **Reusing one `emblaApi.on('scroll', ...)` handler for both a progress bar and heavy per-frame React state updates.** The `scroll` event fires every animation frame; keep frame-rate work to direct DOM/ref writes (as in the tween pattern above), and reserve `setState` for discrete events (`select`, `settle`).
