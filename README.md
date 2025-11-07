# Slazy

Slazy provides a lightweight helper for progressively loading images and background assets once they enter the viewport. It is designed to work with standard markup as well as carousel components that hide slides with `aria-hidden` attributes.

## Requirements

- None (vanilla JavaScript only)

## Features

- Detects whether an element is currently visible in the viewport, including special handling for Slick and Splide carousels.
- Upgrades `<img>` tags from a placeholder `data-slazy-src` to the real image once visible.
- Replaces background images stored in `data-slazy-url` with the correct asset when the element scrolls into view.
- Avoids redundant processing by tracking queued and loaded elements via `data-queue` and `.image-loaded` markers.

## Getting Started

1. Include `slazy.js` in your bundle or load it with a `<script>` tag.
2. Add the `data-slazy-src` attribute to any `<img>` that should lazy-load, or `data-slazy-url` to elements that should swap their background images.

## Slazy CDN

If you need to include the Slazy helper from a CDN, you can either pull
the latest build or lock to a specific version:

```html
<!-- Load latest Slazy from CDN -->
<script src="https://cdn.jsdelivr.net/gh/lesichkovm/slazy@latest/dist/slazy.min.js"></script>

<!-- Load specific version of Slazy from CDN -->
<script src="https://cdn.jsdelivr.net/gh/lesichkovm/slazy@v2.9.0/dist/slazy.min.js"></script>
```

## Usage

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

The library scans matching elements at a one-second interval. When an element becomes visible, Slazy swaps the placeholder with the real asset and marks it as loaded, preventing duplicate work.

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
