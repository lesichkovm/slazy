# Slazy

Slazy provides a lightweight helper for progressively loading images and background assets once they enter the viewport. It is designed to work with standard markup as well as carousel components that hide slides with `aria-hidden` attributes.

## Requirements

- None (vanilla JavaScript only)

## Features

- Detects when an element becomes visible in the viewport, including special handling for Slick/Splide carousels that hide slides with `aria-hidden`.
- Upgrades `<img>` tags from a lightweight placeholder (`src`) to the full asset stored in `data-slazy-src` once visible.
- Replaces background images stored in `data-slazy-url`, with opt-in URL resizing driven by utility classes.
- Applies lightweight placeholders when elements opt in via `.slazy-placeholder`.
- Avoids redundant work by tracking queued and completed elements via `data-queue` and the `.slazy-image-loaded` marker class.
- Caps retry attempts after transient failures and exposes a `.slazy-load-failed` marker so you can diagnose or restyle stubborn assets.
- Supports a configurable prefetch margin so assets can load slightly before entering the viewport.

## Installation

### Script tag (CDN)

```html
<!-- Load latest Slazy from CDN -->
<script src="https://cdn.jsdelivr.net/gh/lesichkovm/slazy@latest/dist/slazy.min.js"></script>

<!-- Lock to a specific release -->
<script src="https://cdn.jsdelivr.net/gh/lesichkovm/slazy@v3.0.0/dist/slazy.min.js"></script>
```

### Bundler

Download `slazy.js`, drop it into your project, and import it from your bundle entry point. Slazy registers itself on load, so no explicit initialisation call is required.

## Quick Start

```html
<!-- Example image lazy loading -->
<img
  class="hero"
  src="/img/placeholder.jpg"
  data-slazy-src="/img/hero-1200x800.jpg"
  alt="Hero"
/>

<!-- Example background lazy loading -->
<div
  class="feature"
  style="background-image: url('/img/feature-placeholder.jpg');"
  data-slazy-url="/img/feature-1600x900.jpg"
></div>
```

Add `data-slazy-src` (for `<img>`) or `data-slazy-url` (for any element with a background) and include `slazy.js`. Slazy polls the DOM every second, and the first time an element is visible it swaps the placeholder with the real asset and marks the node with `.slazy-image-loaded`. To request responsive URL resizing, opt in with the classes described below.

## Resizing behaviour

By default Slazy now leaves URLs untouched. Resizing services can be engaged through helper classes that control how width and height tokens are rewritten:

- `.slazy-resize` – Replaces the width token/query parameter with the measured element width and propagates a height when one can be inferred (via attributes, natural dimensions, or optional `data-slazy-height`).
- `.slazy-resize-zero` – Forces the height component to `0`, mirroring the historic behaviour for services that accept “heightless” requests.
- `.slazy-no-resize` – Explicit opt-out that always keeps the original URL. This overrides the two classes above if combined.

Without any of these classes the original `data-slazy-*` URL is used verbatim.

Slazy detects proportional information in this order when `.slazy-resize` is present:

1. Explicit `width`/`height` HTML attributes.
2. Intrinsic dimensions (`naturalWidth`/`naturalHeight`).
3. Optional `data-slazy-width`/`data-slazy-height` hints.
4. The rendered box ratio (`getBoundingClientRect`).
5. Inline/computed CSS height.

Supplying `data-slazy-height` (and optionally `data-slazy-width`) is entirely optional—use it only when the element cannot expose a reliable ratio via attributes or intrinsic data. When present, the hint participates in the order above; when omitted, Slazy simply falls back to the remaining sources without failing.

## Prefetch margin

Slazy can begin loading assets before they intersect the viewport by configuring a prefetch margin (in pixels). Increase the margin for slower networks or to mask image pop-in:

```js
Slazy.setPrefetchMargin(200); // start loading when items are within 200px of the viewport
```

Call `Slazy.getPrefetchMargin()` to inspect the current value. Margins are clamped to a minimum of 0.

## Controlling resize behaviour with classes

| Class | Effect |
| --- | --- |
| _none_ | Load the original URL without any substitution (default). |
| `.slazy-resize` | Substitute width tokens/queries with the element width and propagate height when available. |
| `.slazy-resize-zero` | Substitute width while forcing all height tokens/queries to `0`. |
| `.slazy-no-resize` | Always skip URL rewriting, even if combined with the classes above. |

### Example usage

```html
<img
  class="product slazy-resize"
  src="/img/placeholder.jpg"
  data-slazy-src="/img/product-1600x900.jpg"
  data-slazy-height="900" <!-- Optional hint when real dimensions are unknown -->
  alt="Product"
/>

<div
  class="hero-banner slazy-resize-zero"
  style="background-image: url('/img/placeholder-bg.jpg');"
  data-slazy-url="/img/hero-original.jpg"
></div>
```

The element will still lazy load, but the `data-slazy-*` URL is used verbatim.

## Placeholder helpers

Add the `.slazy-placeholder` class when you want Slazy to provide a neutral background colour while the real asset is loading. When the upgraded image or background finishes, the helper restores the original styling and removes the helper class.

```html
<img
  class="product slazy-resize slazy-placeholder"
  src="/img/placeholder.jpg"
  data-slazy-src="/img/product-1600x900.jpg"
  alt="Product"
/>

<div
  class="feature-card slazy-placeholder"
  data-slazy-url="/img/feature-1600x900.jpg"
  style="background-image: url('/img/feature-placeholder.png');"
></div>
```

If you use your own placeholder colour inline, Slazy will respect it and only fall back to its default when no colour is specified.

## Retry handling

Slazy retries failed requests up to three times to guard against transient network hiccups. Each attempt increments `data-retry-count` on the element. After the final retry fails, Slazy marks the node with `data-queue="failed"` and adds the `.slazy-load-failed` class. This stops further polling for that element, prevents runaway request loops, and gives you a convenient hook to surface error messaging or styling in your UI.

When a subsequent load succeeds (for example after you fix the URL and trigger `Slazy.restart()`), the retry counters and failure class are automatically cleared.

## Carousel support

If you are using Slick or Splide carousels, add the `carousel_item_image` class to the lazy element. Slazy will inspect parents with `.carousel_item` or `div.splide__slide` and defer loading until ancestors stop advertising `aria-hidden="true"`.

```html
<div class="carousel_item" aria-hidden="true">
  <img
    class="carousel_item_image"
    src="/img/placeholder.jpg"
    data-slazy-src="/img/carousel-slide.jpg"
    alt="Slide"
  />
</div>
```

## Demo & examples

Open `example/index.html` for a self-contained demo illustrating:

- Standard image and background lazy loading.
- Opt-in resizing via `.slazy-resize` and `.slazy-resize-zero`.
- Explicit opt-out using `.slazy-no-resize`.
- Carousel-specific behaviour with `aria-hidden` toggling.

## Development

Clone the repository and install any build dependencies required by your pipeline. The core library is plain ES5-compatible JavaScript and needs no bundler for direct usage.

## Testing

The Jasmine specs cover visibility helpers, image loading, background loading, and resizing edge cases. After editing the library run:

```bash
npm test
```

This executes the 30 DOM-based specs under `tests/`.

## Carousel Support

If you are using Slick or Splide carousels, add the `carousel_item_image` class to the lazy-loaded elements. Slazy will skip slides whose containers are hidden via `aria-hidden="true"`, ensuring that only the active slides load.

## Development

Clone the repository and install dependencies (if any) required by your build pipeline. Add or adjust tests under the `tests/` directory to cover new behavior.

## Testing

Run the existing test suites using your preferred test runner. For example:

```bash
npm test
```

## License

This project is licensed under the terms described in `LICENSE`.
