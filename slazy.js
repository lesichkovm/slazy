(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Slazy = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Internal scheduler state shared by the polling helpers.
   * @type {{ pollDelay: number, imageInterval: ReturnType<typeof setInterval> | null, urlInterval: ReturnType<typeof setInterval> | null }}
   */
  const state = {
    pollDelay: 1000,
    imageInterval: null,
    urlInterval: null,
  };

  const api = {};

  /**
   * Clears the active interval responsible for image polling, if any.
   * Ensures repeated calls are safe when no timer is scheduled.
   */
  function stopImageTimer() {
    if (state.imageInterval != null && typeof clearInterval === "function") {
      clearInterval(state.imageInterval);
    }
    state.imageInterval = null;
  }

  /**
   * Clears the active interval responsible for background URL polling, if any.
   * Designed to be idempotent to simplify teardown.
   */
  function stopUrlTimer() {
    if (state.urlInterval != null && typeof clearInterval === "function") {
      clearInterval(state.urlInterval);
    }
    state.urlInterval = null;
  }

  /**
   * Schedules the polling loop that upgrades <img> elements when they become visible.
   * A timer is only created when one is not already running.
   */
  function ensureImageTimer() {
    if (state.imageInterval == null && typeof setInterval === "function") {
      state.imageInterval = setInterval(api.loadLazyImage, state.pollDelay);
    }
  }

  /**
   * Schedules the polling loop that upgrades background images when they become visible.
   * Avoids duplicate timers by checking for an existing handle first.
   */
  function ensureUrlTimer() {
    if (state.urlInterval == null && typeof setInterval === "function") {
      state.urlInterval = setInterval(api.loadLazyUrl, state.pollDelay);
    }
  }

  /**
   * Starts both image and background polling loops, creating timers as needed.
   */
  function startPolling() {
    ensureImageTimer();
    ensureUrlTimer();
  }

  /**
   * Stops all active polling loops and clears their interval handles.
   */
  function stopPolling() {
    stopImageTimer();
    stopUrlTimer();
  }

  /**
   * Restarts polling by fully stopping and then re-starting all timers.
   * Useful when external code changes the polling cadence or needs a reset.
   */
  function restartPolling() {
    stopPolling();
    startPolling();
  }

  /**
   * Determines whether an element should be considered visible for lazy loading purposes.
   * Handles carousel scenarios where ancestors manage visibility via ARIA attributes.
   *
   * @param {Element} elementInstance - The DOM element to inspect.
   * @returns {boolean} True when the element is visible enough to load assets.
   */
  api.checkVisible = function checkVisible(elementInstance) {
    const element = elementInstance;

    const isHidden = (value) => {
      if (value == null) {
        return false;
      }
      const normalized = String(value).toLowerCase();
      return normalized === "true" || normalized === "1";
    };

    const hasCarouselImageClass = Boolean(
      element &&
        element.classList &&
        typeof element.classList.contains === "function" &&
        element.classList.contains("carousel_item_image")
    );

    const getClosestHiddenState = (target, selector) => {
      if (!target || typeof target.closest !== "function") {
        return null;
      }
      const closest = target.closest(selector);
      if (closest && typeof closest.getAttribute === "function") {
        return closest.getAttribute("aria-hidden");
      }
      return null;
    };

    if (hasCarouselImageClass) {
      const carouselHidden = getClosestHiddenState(element, ".carousel_item");
      if (isHidden(carouselHidden)) {
        return false;
      }

      const splideHidden = getClosestHiddenState(element, "div.splide__slide");
      if (isHidden(splideHidden)) {
        return false;
      }
    }

    if (!element || typeof element.getBoundingClientRect !== "function") {
      return true;
    }

    const rect = element.getBoundingClientRect();
    const viewportHeight = Math.max(
      (document.documentElement && document.documentElement.clientHeight) || 0,
      (typeof window !== "undefined" && window.innerHeight) || 0
    );

    if (viewportHeight === 0) {
      return rect.bottom >= 0;
    }

    return rect.bottom >= 0 && rect.top < viewportHeight;
  };

  /**
   * Converts kebab-case data keys into their dataset camelCase counterpart.
   *
   * @param {string} key - The kebab-case attribute suffix (e.g. "slazy-src").
   * @returns {string} The camelCase version used by `element.dataset`.
   */
  function dataKeyToDatasetKey(key) {
    return key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  }

  /**
   * Reads a `data-*` attribute from an element, falling back to the dataset API when available.
   *
   * @param {Element} element - The target DOM node.
   * @param {string} key - Attribute key without the `data-` prefix.
   * @returns {string|undefined} The stored value, or undefined when absent.
   */
  function getData(element, key) {
    if (!element) {
      return undefined;
    }

    const attrName = `data-${key}`;

    if (typeof element.getAttribute === "function") {
      const attrValue = element.getAttribute(attrName);
      if (attrValue != null) {
        return attrValue;
      }
    }

    if (element.dataset) {
      const datasetKey = dataKeyToDatasetKey(key);
      if (Object.prototype.hasOwnProperty.call(element.dataset, datasetKey)) {
        return element.dataset[datasetKey];
      }
    }

    return undefined;
  }

  /**
   * Stores a `data-*` attribute value using either `setAttribute` or the dataset API.
   *
   * @param {Element} element - The target DOM node.
   * @param {string} key - Attribute key without the `data-` prefix.
   * @param {string} value - Value to persist.
   */
  function setData(element, key, value) {
    if (!element) {
      return;
    }

    const attrName = `data-${key}`;

    if (typeof element.setAttribute === "function") {
      element.setAttribute(attrName, value);
      return;
    }

    if (element.dataset) {
      const datasetKey = dataKeyToDatasetKey(key);
      element.dataset[datasetKey] = value;
    }
  }

  /**
   * Checks whether an element has a CSS class using either `classList` or legacy fallbacks.
   *
   * @param {Element} element - The element to inspect.
   * @param {string} className - Class token to look up.
   * @returns {boolean} True if the class is present.
   */
  function hasClass(element, className) {
    if (element && element.classList && typeof element.classList.contains === "function") {
      return element.classList.contains(className);
    }

    if (element && typeof element.className === "string") {
      const classNames = element.className.split(/\s+/);
      return classNames.indexOf(className) !== -1;
    }

    return false;
  }

  /**
   * Adds a CSS class to an element, supporting both `classList` and string fallbacks.
   *
   * @param {Element} element - The element to mutate.
   * @param {string} className - Class token to append.
   */
  function addClass(element, className) {
    if (element && element.classList && typeof element.classList.add === "function") {
      element.classList.add(className);
      return;
    }

    if (element) {
      const existing = typeof element.className === "string" ? element.className : "";
      const classes = existing.split(/\s+/).filter(Boolean);
      if (classes.indexOf(className) === -1) {
        classes.push(className);
        element.className = classes.join(" ");
      }
    }
  }

  /**
   * Determines whether a value is a DOM Element node.
   *
   * @param {*} value - Candidate value.
   * @returns {value is Element} True when the value is an element node.
   */
  function isDomElement(value) {
    return value && typeof value === "object" && value.nodeType === 1;
  }

  /**
   * Normalises asset URLs so width-oriented services receive the target element width.
   *
   * @param {string} originalUrl - Original image/background URL.
   * @param {number} width - Effective element width in pixels.
   * @returns {string} Resized URL or the original when no changes are required.
   */
  function resizeUrlForWidth(originalUrl, width) {
    if (!originalUrl || width <= 0) {
      return originalUrl;
    }

    let url = originalUrl;
    let widthAdjusted = false;

    if (/\d+x\d+/i.test(url)) {
      url = url.replace(/\d+x\d+/i, `${width}x0`);
      widthAdjusted = true;
    }

    if (/[?&](w|width)=\d+/i.test(url)) {
      url = url.replace(
        /([?&])(w|width)=\d+/gi,
        (match, separator, key) => `${separator}${key}=${width}`
      );
      widthAdjusted = true;
    }

    if (widthAdjusted && /[?&](h|height)=\d+/i.test(url)) {
      url = url.replace(
        /([?&])(h|height)=\d+/gi,
        (match, separator, key) => `${separator}${key}=0`
      );
    }

    return url;
  }

  /**
   * Retrieves a style value from inline styles or computed styles.
   *
   * @param {Element} element - Element to read from.
   * @param {string} property - CSS property name.
   * @returns {string} The property value or an empty string when unavailable.
   */
  function getStyleValue(element, property) {
    if (!element) {
      return "";
    }

    if (element.style && element.style[property] != null && element.style[property] !== "") {
      return element.style[property];
    }

    if (
      isDomElement(element) &&
      typeof window !== "undefined" &&
      typeof window.getComputedStyle === "function"
    ) {
      const computed = window.getComputedStyle(element);
      if (computed) {
        const value = computed.getPropertyValue(property);
        if (value != null && value !== "") {
          return value;
        }
      }
    }

    return "";
  }

  /**
   * Determines the rendered width for an element using geometry or computed styles.
   *
   * @param {Element} element - Element whose width will be measured.
   * @returns {number} Width in pixels, or 0 when it cannot be resolved.
   */
  function getElementWidth(element) {
    if (!element) {
      return 0;
    }

    if (isDomElement(element) && typeof element.getBoundingClientRect === "function") {
      const rect = element.getBoundingClientRect();
      if (rect && typeof rect.width === "number" && rect.width > 0) {
        return rect.width;
      }
    }

    if (isDomElement(element) && typeof element.offsetWidth === "number" && element.offsetWidth > 0) {
      return element.offsetWidth;
    }

    const widthValue = parseFloat(getStyleValue(element, "width"));
    if (!Number.isNaN(widthValue) && widthValue > 0) {
      return widthValue;
    }

    return 0;
  }

  /**
   * Attempts to derive the width of an element's parent for percentage-based layouts.
   *
   * @param {Element} element - Reference element whose parent width is needed.
   * @returns {number} Parent width in pixels, or 0 when unknown.
   */
  function getParentWidth(element) {
    if (!element) {
      return 0;
    }

    if (isDomElement(element) && element.parentElement) {
      const domParentWidth = Math.round(getElementWidth(element.parentElement));
      if (domParentWidth > 0) {
        return domParentWidth;
      }
    }

    return 0;
  }

  /**
   * Reads the current background-image value for an element.
   *
   * @param {Element} element - Element whose background should be inspected.
   * @returns {string} The background-image string (possibly empty).
   */
  function getBackgroundImage(element) {
    const styleValue = getStyleValue(element, "background-image");
    return typeof styleValue === "string" ? styleValue : "";
  }

  /**
   * Updates the background-image on an element, preserving unrelated inline styles.
   *
   * @param {Element} element - Element to mutate.
   * @param {string} value - New CSS background-image value (e.g. `url(...)`).
   */
  function setBackgroundImage(element, value) {
    if (!element) {
      return;
    }

    if (element.style) {
      element.style.backgroundImage = value;
    } else if (typeof element.setAttribute === "function") {
      const existingStyle = element.getAttribute("style") || "";
      const sanitized = existingStyle
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .filter((part) => !part.startsWith("background-image"));
      sanitized.push(`background-image: ${value}`);
      element.setAttribute("style", sanitized.join("; "));
    }
  }

  /**
   * Indicates whether any elements in the document match the given selector.
   *
   * @param {string} selector - CSS selector to evaluate.
   * @returns {boolean} True when at least one element matches.
   */
  function hasMatchingElements(selector) {
    if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") {
      return false;
    }

    const domMatches = document.querySelectorAll(selector);
    return Boolean(domMatches && domMatches.length > 0);
  }

  /**
   * Iterates synchronously over all elements that satisfy the selector and invokes a callback.
   *
   * @param {string} selector - CSS selector identifying elements to process.
   * @param {(element: Element) => void} iterator - Function executed for each match.
   */
  function forEachMatchingElement(selector, iterator) {
    if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") {
      return;
    }

    const domMatches = document.querySelectorAll(selector);
    if (!domMatches || domMatches.length === 0) {
      return;
    }

    domMatches.forEach(function (element) {
      iterator(element);
    });
  }

  /**
   * Polling task that promotes `<img data-slazy-src>` elements to their real source URLs.
   * Applies responsive URL rewrites, prevents duplicate work, and tracks load state.
   */
  api.loadLazyImage = function loadLazyImage() {
    const hasLazyImages = hasMatchingElements("img[data-slazy-src]:not(.image-loaded)");

    if (!hasLazyImages) {
      stopImageTimer();
      return;
    }

    forEachMatchingElement(
      "img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)",
      function (element) {
        if (!element) {
          return;
        }

        const widthCss = getStyleValue(element, "width");
        let realWidth = widthCss.includes("%")
          ? 0
          : Math.round(getElementWidth(element));
        const parentWidth = getParentWidth(element) || 0;

        if (realWidth === 0 && parentWidth > 0) {
          realWidth = parentWidth;
        }

        if (realWidth === 0) {
          return;
        }

        let url = getData(element, "slazy-src");

        if (url == null) {
          return;
        }

        const noResize = hasClass(element, "no-resize");
        if (noResize === false) {
          url = resizeUrlForWidth(url, realWidth);
        }

        if (element.src === url) {
          return;
        }

        if (getData(element, "queue") != null) {
          return;
        }

        if (api.checkVisible(element)) {
          setData(element, "queue", "loading");
          const self = element;
          const newImg = new Image();
          newImg.onload = function () {
            self.src = this.src;
            setData(self, "queue", "loaded");
            const widthValue = Number(
              this.width || this.naturalWidth || realWidth || 0
            );
            const heightValue = Number(
              this.height || this.naturalHeight || 0
            );
            if (typeof self.setAttribute === "function") {
              self.setAttribute("width", widthValue);
              self.setAttribute("height", heightValue);
            } else {
              self.width = widthValue;
              self.height = heightValue;
            }
          };
          newImg.src = url;
          addClass(element, "image-loaded");
        }
      }
    );
  };

  /**
   * Polling task that upgrades `data-slazy-url` background images when elements are visible.
   * Mirrors the image loader behaviour, including responsive URL adjustments and guards.
   */
  api.loadLazyUrl = function loadLazyUrl() {
    const hasLazyUrls = hasMatchingElements("*[data-slazy-url]:not(.image-loaded)");

    if (!hasLazyUrls) {
      stopUrlTimer();
      return;
    }

    forEachMatchingElement(
      "*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)",
      function (element) {
        if (!element) {
          return;
        }

        const widthCss = getStyleValue(element, "width");
        let realWidth = widthCss.includes("%")
          ? 0
          : Math.round(getElementWidth(element));
        const parentWidth = getParentWidth(element) || 0;

        if (realWidth === 0 && parentWidth > 0) {
          realWidth = parentWidth;
        }

        if (realWidth === 0) {
          return;
        }

        let url = getData(element, "slazy-url");

        if (url == null) {
          return;
        }

        const noResize = hasClass(element, "no-resize");
        if (noResize === false) {
          url = resizeUrlForWidth(url, realWidth);
        }

        const currentBackground = getBackgroundImage(element);
        const normalizedBackground = currentBackground.replace(
          /^url\(("|')?(.*?)\1\)$/i,
          "$2"
        );

        if (normalizedBackground === url || currentBackground === `url(${url})`) {
          return;
        }

        if (getData(element, "queue") != null) {
          return;
        }

        if (api.checkVisible(element)) {
          setData(element, "queue", "loaded");
          setBackgroundImage(element, `url(${url})`);
          addClass(element, "image-loaded");
        }
      }
    );
  };

  api.startPolling = startPolling;
  api.stopPolling = stopPolling;
  api.restartPolling = restartPolling;
  api.start = startPolling;
  api.stop = stopPolling;
  api.restart = restartPolling;

  /**
   * Exposes test-friendly hooks that support white-box assertions without public reliance.
   */
  api._internals = {
    get imageInterval() {
      return state.imageInterval;
    },
    set imageInterval(value) {
      state.imageInterval = value;
    },
    get urlInterval() {
      return state.urlInterval;
    },
    set urlInterval(value) {
      state.urlInterval = value;
    },
    ensureImageTimer,
    ensureUrlTimer,
    stopImageTimer,
    stopUrlTimer,
  };

  startPolling();

  return api;
});
