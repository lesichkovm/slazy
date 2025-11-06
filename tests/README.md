# Slazy Test Suite

This directory contains Jasmine specifications that exercise the lazy‑loading helpers exposed by `slazy.js`. The specs focus on viewport detection (`checkVisible`) and the polling loaders that swap placeholder assets for real images and backgrounds.

## Contents

- `runner.html` – Loads Jasmine along with `slazy.js` and the specs in a browser.
- `checkvisible.spec.js` – Verifies visibility detection, including carousel edge cases.
- `loadlazyimage.spec.js` – Covers `<img data-slazy-src>` behavior, URL resizing, and queue guards.
- `loadlazyurl.spec.js` – Tests background-image swapping for elements with `data-slazy-url`.
- `main.go` – Lightweight web server you can run locally if you prefer not to open files directly from disk.

## Running the Specs

### Option 1: Open in a Browser
1. Serve or open `runner.html` in your browser.
2. The Jasmine runner will automatically execute the suites and render results.

### Option 2: Local HTTP Server (Recommended)
1. Start a static server from this directory:
   ```bash
   # Python
   python -m http.server 8000

   # Node.js (requires http-server)
   npx http-server -p 8000

   # Go
   go run .
   ```
2. Visit `http://localhost:8000/runner.html` to run the specs.

### Option 3: VS Code Live Server
1. Install the **Live Server** extension.
2. Right-click `runner.html` and choose **Open with Live Server**.

## Writing Additional Specs

1. Create a new `*.spec.js` file following the existing naming convention.
2. Include the script tag in `runner.html` before the closing `</body>` tag.
3. Use Jasmine primitives (`describe`, `it`, `expect`, `spyOn`, etc.).
4. Mock DOM APIs, jQuery helpers, and timers as required by the scenario under test.
5. Clean up globals in `afterEach` to keep suites isolated.

## Debugging Tips

- Use developer tools to inspect failing expectations in the browser runner.
- Drop `console.log` or `debugger;` statements inside specs during investigation.
- Confirm that `slazy.js` is loaded ahead of the specs when adjusting `runner.html`.

## Continuous Integration

For headless execution, hook the suite into a test runner that can drive a browser (e.g., Karma, Playwright, or Puppeteer). Ensure the environment provides a DOM, jQuery, and the globals expected by the specs.
