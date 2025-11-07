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
    prefetchMargin: 0,
  };

  const CLASS_IMAGE_LOADED = "slazy-image-loaded";
  const CLASS_NO_RESIZE = "slazy-no-resize";
  const CLASS_RESIZE = "slazy-resize";
  const CLASS_RESIZE_ZERO = "slazy-resize-zero";
  const CLASS_PLACEHOLDER = "slazy-placeholder";
  const CLASS_PLACEHOLDER_ACTIVE = "slazy-placeholder-active";

  const PLACEHOLDER_BACKGROUND_COLOR = "#e2e8f0";
  const DATA_PLACEHOLDER_ACTIVE = "placeholder-active";
  const DATA_PLACEHOLDER_ORIGINAL_BGCOLOR = "placeholder-original-bgcolor";

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

  function normaliseMargin(value) {
    if (value == null) {
      return 0;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }

    return Math.max(0, numeric);
  }

  function setPrefetchMarginInternal(value) {
    state.prefetchMargin = normaliseMargin(value);
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
    const margin = Math.max(0, Number(state.prefetchMargin) || 0);
    const viewportHeight = Math.max(
      (document.documentElement && document.documentElement.clientHeight) || 0,
      (typeof window !== "undefined" && window.innerHeight) || 0
    );

    if (viewportHeight === 0) {
      return rect.bottom >= -margin;
    }

    return rect.bottom >= -margin && rect.top < viewportHeight + margin;
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
   * Removes a `data-*` attribute value when present.
   *
   * @param {Element} element - The target DOM node.
   * @param {string} key - Attribute key without the `data-` prefix.
   */
  function removeData(element, key) {
    if (!element) {
      return;
    }

    const attrName = `data-${key}`;

    if (typeof element.removeAttribute === "function") {
      element.removeAttribute(attrName);
    }

    if (element.dataset) {
      const datasetKey = dataKeyToDatasetKey(key);
      if (Object.prototype.hasOwnProperty.call(element.dataset, datasetKey)) {
        delete element.dataset[datasetKey];
      }
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
   * Removes a CSS class from an element regardless of classList support.
   *
   * @param {Element} element - The element to mutate.
   * @param {string} className - Class token to remove.
   */
  function removeClass(element, className) {
    if (element && element.classList && typeof element.classList.remove === "function") {
      element.classList.remove(className);
      return;
    }

    if (element && typeof element.className === "string") {
      const tokens = element.className.split(/\s+/).filter(Boolean);
      const filtered = tokens.filter((token) => token !== className);
      element.className = filtered.join(" ");
    }
  }

  /**
   * Applies a lightweight placeholder background when `.slazy-placeholder` is present.
   *
   * @param {Element} element - Target element.
   */
  function activatePlaceholder(element) {
    if (!element || !hasClass(element, CLASS_PLACEHOLDER)) {
      return;
    }

    if (getData(element, DATA_PLACEHOLDER_ACTIVE) === "true") {
      return;
    }

    if (element.style) {
      const existingColor =
        typeof element.style.backgroundColor === "string" ? element.style.backgroundColor : "";

      if (!getData(element, DATA_PLACEHOLDER_ORIGINAL_BGCOLOR) && existingColor) {
        setData(element, DATA_PLACEHOLDER_ORIGINAL_BGCOLOR, existingColor);
      }

      if (!existingColor) {
        element.style.backgroundColor = PLACEHOLDER_BACKGROUND_COLOR;
      }
    }

    setData(element, DATA_PLACEHOLDER_ACTIVE, "true");
    addClass(element, CLASS_PLACEHOLDER_ACTIVE);
  }

  /**
   * Clears previously applied placeholder styling.
   *
   * @param {Element} element - Target element.
   */
  function clearPlaceholder(element) {
    if (!element) {
      return;
    }

    if (getData(element, DATA_PLACEHOLDER_ACTIVE) !== "true") {
      return;
    }

    if (element.style) {
      const originalColor = getData(element, DATA_PLACEHOLDER_ORIGINAL_BGCOLOR);
      if (originalColor) {
        element.style.backgroundColor = originalColor;
      } else if (typeof element.style.removeProperty === "function") {
        element.style.removeProperty("background-color");
      } else {
        element.style.backgroundColor = "";
      }
    }

    removeData(element, DATA_PLACEHOLDER_ORIGINAL_BGCOLOR);
    removeData(element, DATA_PLACEHOLDER_ACTIVE);
    removeClass(element, CLASS_PLACEHOLDER_ACTIVE);
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
   * Normalises asset URLs so width-oriented services receive updated dimensions when requested.
   *
   * @param {string} originalUrl - Original image/background URL.
   * @param {number} width - Target element width in pixels.
   * @param {number} height - Target element height in pixels.
   * @param {"auto"|"zero"|"none"} mode - Resize strategy requested via CSS classes.
   * @returns {string} Resized URL or the original when no changes are required.
   */
  function rewriteUrlDimensions(originalUrl, width, height, mode) {
    if (!originalUrl || width <= 0) {
      return originalUrl;
    }

    const roundedWidth = Math.round(width);
    const roundedHeight = Math.round(height);
    const shouldForceZero = mode === "zero";
    const shouldUpdateHeight = mode === "auto" && roundedHeight > 0;

    let url = originalUrl;

    url = url.replace(/(\b)(\d+)x(\d+)(\b|(?=_))/i, (match, prefix, oldWidth, oldHeight, suffix) => {
      let heightToken = oldHeight;
      if (shouldForceZero) {
        heightToken = "0";
      } else if (shouldUpdateHeight) {
        heightToken = String(roundedHeight);
      }
      return `${prefix}${roundedWidth}x${heightToken}${suffix}`;
    });

    url = url.replace(/([?&])(w|width)=\d+/gi, (match, separator, key) => `${separator}${key}=${roundedWidth}`);

    if (shouldForceZero) {
      url = url.replace(/([?&])(h|height)=\d+/gi, (match, separator, key) => `${separator}${key}=0`);
    } else if (shouldUpdateHeight) {
      url = url.replace(/([?&])(h|height)=\d+/gi, (match, separator, key) => `${separator}${key}=${roundedHeight}`);
    }

    return url;
  }

  /**
   * Determines which resizing strategy should be applied to an element.
   *
   * @param {Element} element - Target element.
   * @returns {"auto"|"zero"|"none"} Resizing mode descriptor.
   */
  function getResizeMode(element) {
    if (!element) {
      return "none";
    }

    if (hasClass(element, CLASS_NO_RESIZE)) {
      return "none";
    }

    if (hasClass(element, CLASS_RESIZE_ZERO)) {
      return "zero";
    }

    if (hasClass(element, CLASS_RESIZE)) {
      return "auto";
    }

    return "none";
  }

  /**
   * Attempts to derive a proportional height for resized assets.
   *
   * @param {Element} element - Target element.
   * @param {number} targetWidth - Intended width in pixels.
   * @returns {number} Resolved height in pixels or 0 when it cannot be determined.
   */
  function resolveResizeHeight(element, targetWidth) {
    if (!element || targetWidth <= 0) {
      return 0;
    }

    const getAttrNumber = (attr) => {
      if (typeof element.getAttribute !== "function") {
        return 0;
      }
      const value = Number(element.getAttribute(attr));
      return Number.isFinite(value) ? value : 0;
    };

    const attrWidth = getAttrNumber("width");
    const attrHeight = getAttrNumber("height");
    if (attrWidth > 0 && attrHeight > 0) {
      return Math.round((attrHeight / attrWidth) * targetWidth);
    }

    const naturalWidth = Number(element.naturalWidth || element.width || 0);
    const naturalHeight = Number(element.naturalHeight || element.height || 0);
    if (naturalWidth > 0 && naturalHeight > 0) {
      return Math.round((naturalHeight / naturalWidth) * targetWidth);
    }

    const dataWidth = Number(getData(element, "slazy-width"));
    const dataHeight = Number(getData(element, "slazy-height"));
    if (dataWidth > 0 && dataHeight > 0) {
      return Math.round((dataHeight / dataWidth) * targetWidth);
    }

    if (dataHeight > 0) {
      return Math.round(dataHeight);
    }

    const rect = typeof element.getBoundingClientRect === "function" ? element.getBoundingClientRect() : null;
    if (rect && rect.width > 0 && rect.height > 0) {
      return Math.round((rect.height / rect.width) * targetWidth);
    }

    const styleHeight = parseFloat(getStyleValue(element, "height"));
    if (!Number.isNaN(styleHeight) && styleHeight > 0) {
      return Math.round(styleHeight);
    }

    return 0;
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
    const hasLazyImages = hasMatchingElements(`img[data-slazy-src]:not(.${CLASS_IMAGE_LOADED})`);

    if (!hasLazyImages) {
      stopImageTimer();
      return;
    }

    forEachMatchingElement(
      `img[data-slazy-src]:not(.${CLASS_IMAGE_LOADED}):not(.carousel_item_image)`,
      function (element) {
        if (!element) {
          return;
        }

        activatePlaceholder(element);

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

        const resizeMode = getResizeMode(element);
        if (resizeMode !== "none") {
          const resolvedHeight = resizeMode === "zero" ? 0 : resolveResizeHeight(element, realWidth);
          url = rewriteUrlDimensions(url, realWidth, resolvedHeight, resizeMode);
        }

        if (element.src === url) {
          clearPlaceholder(element);
          return;
        }

        const queueState = getData(element, "queue");
        if (queueState === "loading") {
          return;
        }

        if (api.checkVisible(element)) {
          setData(element, "queue", "loading");
          const self = element;
          const newImg = new Image();
          newImg.onload = function () {
            self.src = this.src;
            const widthValue = Number(this.width || this.naturalWidth || realWidth || 0);
            const heightValue = Number(this.height || this.naturalHeight || 0);

            if (widthValue > 0) {
              if (typeof self.setAttribute === "function") {
                self.setAttribute("width", widthValue);
              } else {
                self.width = widthValue;
              }
            }

            if (heightValue > 0) {
              if (typeof self.setAttribute === "function") {
                self.setAttribute("height", heightValue);
              } else {
                self.height = heightValue;
              }
            }
            clearPlaceholder(self);
            addClass(self, CLASS_IMAGE_LOADED);
            removeData(self, "queue");
          };
          newImg.onerror = function () {
            removeData(self, "queue");
          };
          newImg.src = url;
        }
      }
    );
  };

  /**
   * Polling task that upgrades `data-slazy-url` background images when elements are visible.
   * Mirrors the image loader behaviour, including responsive URL adjustments and guards.
   */
  api.loadLazyUrl = function loadLazyUrl() {
    const hasLazyUrls = hasMatchingElements(`*[data-slazy-url]:not(.${CLASS_IMAGE_LOADED})`);

    if (!hasLazyUrls) {
      stopUrlTimer();
      return;
    }

    forEachMatchingElement(
      `*[data-slazy-url]:not(.${CLASS_IMAGE_LOADED}):not(.carousel_item_image)` ,
      function (element) {
        if (!element) {
          return;
        }

        activatePlaceholder(element);

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

        const resizeMode = getResizeMode(element);
        if (resizeMode !== "none") {
          const resolvedHeight = resizeMode === "zero" ? 0 : resolveResizeHeight(element, realWidth);
          url = rewriteUrlDimensions(url, realWidth, resolvedHeight, resizeMode);
        }

        const currentBackground = getBackgroundImage(element);
        const normalizedBackground = currentBackground.replace(
          /^url\(("|')?(.*?)\1\)$/i,
          "$2"
        );

        if (normalizedBackground === url || currentBackground === `url(${url})`) {
          clearPlaceholder(element);
          return;
        }

        const queueState = getData(element, "queue");
        if (queueState === "loading") {
          return;
        }

        if (api.checkVisible(element)) {
          setData(element, "queue", "loading");
          const self = element;
          const img = new Image();
          img.onload = function () {
            setBackgroundImage(self, `url(${this.src})`);
            clearPlaceholder(self);
            addClass(self, CLASS_IMAGE_LOADED);
            removeData(self, "queue");
          };
          img.onerror = function () {
            removeData(self, "queue");
          };
          img.src = url;
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
  api.setPrefetchMargin = function setPrefetchMargin(value) {
    setPrefetchMarginInternal(value);
  };
  api.getPrefetchMargin = function getPrefetchMargin() {
    return state.prefetchMargin;
  };

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
    get prefetchMargin() {
      return state.prefetchMargin;
    },
    set prefetchMargin(value) {
      setPrefetchMarginInternal(value);
    },
  };

  const hasDomAccess =
    typeof document !== "undefined" &&
    typeof document.querySelectorAll === "function" &&
    typeof window !== "undefined";

  if (hasDomAccess) {
    startPolling();
  }

  return api;
});
