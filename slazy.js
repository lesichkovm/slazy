function getJq() {
  if (typeof window === "undefined") {
    return null;
  }
  const jq = window.$ || window.jQuery;
  return typeof jq === "function" ? jq : null;
}

function checkVisible(elementInstance) {
  const jq = getJq();
  const $element = jq ? jq(elementInstance) : null;
  const element = elementInstance;

  const isHidden = (value) => {
    if (value == null) {
      return false;
    }
    const normalized = String(value).toLowerCase();
    return normalized === "true" || normalized === "1";
  };

  const hasCarouselImageClass = Boolean(
    (element &&
      element.classList &&
      typeof element.classList.contains === "function" &&
      element.classList.contains("carousel_item_image")) ||
      ($element && typeof $element.hasClass === "function" &&
        $element.hasClass("carousel_item_image"))
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
    let carouselHidden = getClosestHiddenState(element, ".carousel_item");
    if (carouselHidden == null && $element && typeof $element.closest === "function") {
      const carouselItem = $element.closest(".carousel_item");
      if (carouselItem && typeof carouselItem.attr === "function") {
        carouselHidden = carouselItem.attr("aria-hidden");
      }
    }
    if (isHidden(carouselHidden)) {
      return false;
    }

    let splideHidden = getClosestHiddenState(element, "div.splide__slide");
    if (splideHidden == null && $element && typeof $element.closest === "function") {
      const splideSlide = $element.closest("div.splide__slide");
      if (splideSlide && typeof splideSlide.attr === "function") {
        splideHidden = splideSlide.attr("aria-hidden");
      }
    }
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
    window.innerHeight || 0
  );

  if (viewportHeight === 0) {
    return rect.bottom >= 0;
  }

  return rect.bottom >= 0 && rect.top < viewportHeight;
}

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

  const jq = getJq();
  if (jq) {
    const wrapped = jq(element);
    if (wrapped && typeof wrapped.data === "function") {
      return wrapped.data(key);
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
    return;
  }

  const jq = getJq();
  if (jq) {
    const wrapped = jq(element);
    if (wrapped && typeof wrapped.data === "function") {
      wrapped.data(key, value);
    }
  }
}

function hasClass(element, className) {
  if (element && element.classList && typeof element.classList.contains === "function") {
    return element.classList.contains(className);
  }

  const jq = getJq();
  if (jq) {
    const wrapped = jq(element);
    if (wrapped && typeof wrapped.hasClass === "function") {
      return wrapped.hasClass(className);
    }
  }

  return false;
}

function addClass(element, className) {
  if (element && element.classList && typeof element.classList.add === "function") {
    element.classList.add(className);
    return;
  }

  const jq = getJq();
  if (jq) {
    const wrapped = jq(element);
    if (wrapped && typeof wrapped.addClass === "function") {
      wrapped.addClass(className);
    }
  }
}

function isDomElement(value) {
  return value && typeof value === "object" && value.nodeType === 1;
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

  const jq = getJq();
  if (jq) {
    const wrapped = jq(element);
    if (wrapped && typeof wrapped.css === "function") {
      const fallback = wrapped.css(property);
      if (typeof fallback === "string") {
        return fallback;
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

  const jq = getJq();
  if (jq) {
    const wrapped = jq(element);
    if (wrapped && typeof wrapped.width === "function") {
      const width = wrapped.width();
      if (typeof width === "number" && width > 0) {
        return width;
      }
      const parsedWidth = typeof width === "string" ? parseFloat(width) : NaN;
      if (!Number.isNaN(parsedWidth) && parsedWidth > 0) {
        return parsedWidth;
      }
    }
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

  const jq = getJq();
  if (jq) {
    const wrapped = jq(element);
    if (wrapped && typeof wrapped.parent === "function") {
      const parentWrapper = wrapped.parent();
      if (parentWrapper) {
        if (typeof parentWrapper.width === "function") {
          const width = parentWrapper.width();
          if (typeof width === "number" && width > 0) {
            return Math.round(width);
          }
          const parsedWidth = typeof width === "string" ? parseFloat(width) : NaN;
          if (!Number.isNaN(parsedWidth) && parsedWidth > 0) {
            return Math.round(parsedWidth);
          }
        }

        if (parentWrapper[0]) {
          const wrappedDomWidth = Math.round(getElementWidth(parentWrapper[0]));
          if (wrappedDomWidth > 0) {
            return wrappedDomWidth;
          }
        }
      }
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
    const jq = getJq();
    if (jq) {
      const wrapped = jq(element);
      if (wrapped && typeof wrapped.css === "function") {
        wrapped.css("background-image", value);
      }
    }
  } else if (typeof element.setAttribute === "function") {
    const existingStyle = element.getAttribute("style") || "";
    const sanitized = existingStyle
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !part.startsWith("background-image"));
    sanitized.push(`background-image: ${value}`);
    element.setAttribute("style", sanitized.join("; "));
  } else {
    const jq = getJq();
    if (jq) {
      const wrapped = jq(element);
      if (wrapped && typeof wrapped.css === "function") {
        wrapped.css("background-image", value);
      }
    }
  }
}

function hasMatchingElements(selector) {
  if (typeof document !== "undefined" && typeof document.querySelectorAll === "function") {
    const domMatches = document.querySelectorAll(selector);
    if (domMatches && domMatches.length > 0) {
      return true;
    }
  }

  const jq = getJq();
  if (!jq) {
    return false;
  }

  const collection = jq(selector);
  if (!collection) {
    return false;
  }

  if (typeof collection.length === "number") {
    return collection.length > 0;
  }

  if (typeof collection.toArray === "function") {
    return collection.toArray().length > 0;
  }

  if (typeof collection.each === "function") {
    let found = false;
    collection.each(function () {
      found = true;
      return false;
    });
    return found;
  }

  return false;
}

function forEachMatchingElement(selector, iterator) {
  let handled = false;

  if (typeof document !== "undefined" && typeof document.querySelectorAll === "function") {
    const domMatches = document.querySelectorAll(selector);
    if (domMatches && domMatches.length > 0) {
      handled = true;
      domMatches.forEach(function (element) {
        iterator(element);
      });
    }
  }

  if (handled) {
    return;
  }

  const jq = getJq();
  if (!jq) {
    return;
  }

  const collection = jq(selector);
  if (!collection) {
    return;
  }

  if (typeof collection.each === "function") {
    collection.each(function (_index, element) {
      const target = element || this;
      if (target) {
        iterator(target);
      }
    });
    return;
  }

  if (typeof collection.length === "number") {
    for (let i = 0; i < collection.length; i += 1) {
      const item = collection[i];
      if (item) {
        iterator(item);
      }
    }
  }
}

function loadLazyImage() {
  const hasLazyImages = hasMatchingElements("img[data-slazy-src]:not(.image-loaded)");

  if (!hasLazyImages) {
    clearInterval(loadingLazyImages);
    return;
  }

  forEachMatchingElement(
    "img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)",
    function (elementArg) {
      const element = elementArg || this;
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
        const resizedUrl = url.replace(/\d+x\d+/i, realWidth + "x0");
        url = resizedUrl;
      }

      // DEBUG:  console.log('URL to process:' + url);

      if (element.src === url) {
        return; //already processed
      }

      if (getData(element, "queue") != null) {
        return; //already processed
      }

      if (checkVisible(element)) {
        setData(element, "queue", "loading");
        var self = element;
        var newImg = new Image();
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
            const jq = getJq();
            if (jq) {
              const wrapped = jq(self);
              if (wrapped && typeof wrapped.attr === "function") {
                wrapped.attr("width", widthValue);
                wrapped.attr("height", heightValue);
              }
            }
          }
        };
        newImg.src = url;
        addClass(element, "image-loaded");
      }
    }
  );
}

let loadingLazyImages = setInterval(loadLazyImage, 1000);

function loadLazyUrl() {
  const hasLazyUrls = hasMatchingElements("*[data-slazy-url]:not(.image-loaded)");

  if (!hasLazyUrls) {
    clearInterval(loadingLazyUrl);
    return;
  }

  forEachMatchingElement(
    "*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)",
    function (elementArg) {
      const element = elementArg || this;
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
        const resizedUrl = url.replace(/\d+x\d+/i, realWidth + "x0");
        url = resizedUrl;
      }

      // DEBUG:  console.log('URL to process:' + url);

      if (getBackgroundImage(element) === "url(" + url + ")") {
        return; //already processed
      }

      if (getData(element, "queue") != null) {
        return; //already processed
      }

      if (checkVisible(element)) {
        setData(element, "queue", "loaded");
        setBackgroundImage(element, "url(" + url + ")");
        addClass(element, "image-loaded");
      }
    }
  );
}

let loadingLazyUrl = setInterval(loadLazyUrl, 1000);

