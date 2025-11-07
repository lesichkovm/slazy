# Slazy

Slazy provides a lightweight helper for progressively loading images and background assets once they enter the viewport. It is designed to work with standard markup as well as carousel components that hide slides with `aria-hidden` attributes.

## Requirements

- None (vanilla JavaScript only)

## Features

- Detects when an element becomes visible in the viewport, including special handling for Slick/Splide carousels that hide slides with `aria-hidden`.
- Upgrades `<img>` tags from a lightweight placeholder (`src`) to the full asset stored in `data-slazy-src` once visible.
- Replaces background images stored in `data-slazy-url` while optionally resizing the URL to match the element width.
- Avoids redundant work by tracking queued and completed elements via `data-queue` and the `.slazy-image-loaded` marker class.

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

Add `data-slazy-src` (for `<img>`) or `data-slazy-url` (for any element with a background) and include `slazy.js`. Slazy polls the DOM every second, and the first time an element is visible it swaps the placeholder with the real asset and marks the node with `.slazy-image-loaded`.

## Resizing behaviour

When Slazy upgrades an asset it optionally rewrites any `WxH` token in the URL with the measured element width: `640x480` becomes `250x0` if the element is 250 px wide. This lets you serve responsive variants via URL-driven resizing services.

- **Images**: the width is derived from the element itself, falling back to the parent width when the image uses percentage-based sizing.
- **Backgrounds**: the width is taken from the element or its parent using the same logic.

If your URLs do not contain a `WxH` component, nothing is replaced—the original URL is used as-is.

## Opting out with `slazy-no-resize`

Add the `slazy-no-resize` class when you need to keep the original URL untouched—for example when your asset pipeline does not support width substitution.

```html
<img
  class="product slazy-no-resize"
  src="/img/placeholder.jpg"
  data-slazy-src="/img/product-original.jpg"
  alt="Product"
/>

<div
  class="hero-banner slazy-no-resize"
  style="background-image: url('/img/placeholder-bg.jpg');"
  data-slazy-url="/img/hero-original.jpg"
></div>
```

The element will still lazy load, but the `data-slazy-*` URL is used verbatim.

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
- The `no-resize` modifier for both images and backgrounds.
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
