(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Slazy = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const state = {
    pollDelay: 1000,
    imageInterval: null,
    urlInterval: null,
  };

  const api = {};

  function stopImageTimer() {
    if (state.imageInterval != null && typeof clearInterval === "function") {
      clearInterval(state.imageInterval);
    }
    state.imageInterval = null;
  }

  function stopUrlTimer() {
    if (state.urlInterval != null && typeof clearInterval === "function") {
      clearInterval(state.urlInterval);
    }
    state.urlInterval = null;
  }

  function ensureImageTimer() {
    if (state.imageInterval == null && typeof setInterval === "function") {
      state.imageInterval = setInterval(api.loadLazyImage, state.pollDelay);
    }
  }

  function ensureUrlTimer() {
    if (state.urlInterval == null && typeof setInterval === "function") {
      state.urlInterval = setInterval(api.loadLazyUrl, state.pollDelay);
    }
  }

  function startPolling() {
    ensureImageTimer();
    ensureUrlTimer();
  }

  function stopPolling() {
    stopImageTimer();
    stopUrlTimer();
  }

  function restartPolling() {
    stopPolling();
    startPolling();
  }

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

  function dataKeyToDatasetKey(key) {
    return key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  }

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

  function isDomElement(value) {
    return value && typeof value === "object" && value.nodeType === 1;
  }

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

  function getBackgroundImage(element) {
    const styleValue = getStyleValue(element, "background-image");
    return typeof styleValue === "string" ? styleValue : "";
  }

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

  function hasMatchingElements(selector) {
    if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") {
      return false;
    }

    const domMatches = document.querySelectorAll(selector);
    return Boolean(domMatches && domMatches.length > 0);
  }

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
