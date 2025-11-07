function checkVisible(elementInstance) {
  const jq = window.$ || window.jQuery;
  const $element = typeof jq === "function" ? jq(elementInstance) : null;

  const isHidden = (value) => {
    if (value == null) {
      return false;
    }
    const normalized = String(value).toLowerCase();
    return normalized === "true" || normalized === "1";
  };

  const hasCarouselImageClass =
    elementInstance &&
    elementInstance.classList &&
    elementInstance.classList.contains("carousel_item_image");

  const usesJQueryCarouselCheck =
    !hasCarouselImageClass &&
    $element &&
    typeof $element.hasClass === "function" &&
    $element.hasClass("carousel_item_image");

  if (hasCarouselImageClass || usesJQueryCarouselCheck) {
    let carouselHidden = null;

    if (
      elementInstance &&
      typeof elementInstance.closest === "function"
    ) {
      const carouselItem = elementInstance.closest(".carousel_item");
      if (carouselItem && typeof carouselItem.getAttribute === "function") {
        carouselHidden = carouselItem.getAttribute("aria-hidden");
      }
    }

    if (carouselHidden == null && $element && typeof $element.closest === "function") {
      const carouselItem = $element.closest(".carousel_item");
      if (carouselItem && typeof carouselItem.attr === "function") {
        carouselHidden = carouselItem.attr("aria-hidden");
      }
    }

    if (isHidden(carouselHidden)) {
      return false;
    }

    let splideHidden = null;

    if (
      elementInstance &&
      typeof elementInstance.closest === "function"
    ) {
      const splideSlide = elementInstance.closest("div.splide__slide");
      if (splideSlide && typeof splideSlide.getAttribute === "function") {
        splideHidden = splideSlide.getAttribute("aria-hidden");
      }
    }

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

  const rect = elementInstance.getBoundingClientRect();
  const viewportHeight = Math.max(
    (document.documentElement && document.documentElement.clientHeight) || 0,
    window.innerHeight || 0
  );

  if (viewportHeight === 0) {
    return rect.bottom >= 0;
  }

  return rect.bottom >= 0 && rect.top < viewportHeight;
}

function getJq() {
  const jq = window.$ || window.jQuery;
  return typeof jq === "function" ? jq : null;
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
    return jq(element).data(key);
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
    jq(element).data(key, value);
  }
}

function hasClass(element, className) {
  if (element && element.classList && typeof element.classList.contains === "function") {
    return element.classList.contains(className);
  }

  const jq = getJq();
  if (jq) {
    return jq(element).hasClass(className);
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
    jq(element).addClass(className);
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
    const fallback = jq(element).css(property);
    if (typeof fallback === "string") {
      return fallback;
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
      const parsedWidth = parseFloat(width);
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
          const parsedWidth = parseFloat(width);
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

  const jq = getJq();
  const useJq = Boolean(jq);

  if (element.style) {
    element.style.backgroundImage = value;
    if (useJq) {
      const wrapped = jq(element);
      if (wrapped && typeof wrapped.css === "function") {
        wrapped.css("background-image", value);
      }
    }
    return;
  }

  if (useJq) {
    jq(element).css("background-image", value);
  }
}

function loadLazyImage() {
  const jq = getJq();

  if (typeof jq !== "function") {
    return;
  }

  if (jq("img[data-slazy-src]:not(.image-loaded)").length === 0) {
    clearInterval(loadingLazyImages);
    return;
  }

  jq("img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)").each(
    function () {
      const widthCss = jq(this).css("width");
      let realWidth = widthCss.includes("%")
        ? 0
        : parseInt(jq(this).width(), 10);
      const parentWidth = parseInt(jq(this).parent().width(), 10) || 0;

      if (realWidth === 0 && parentWidth > 0) {
        realWidth = parentWidth;
      }

      if (realWidth === 0) {
        return;
      }

      let url = jq(this).data("slazy-src");

      if (typeof url === "undefined") {
        return;
      }

      const noResize = jq(this).hasClass("no-resize");
      if (noResize === false) {
        const resizedUrl = url.replace(/\d+x\d+/i, realWidth + "x0");
        url = resizedUrl;
      }

      // DEBUG:  console.log('URL to process:' + url);

      if (this.src === url) {
        return; //already processed
      }

      if (typeof jq(this).data("queue") !== "undefined") {
        return; //already processed
      }

      if (checkVisible(this)) {
        jq(this).data("queue", "loading");
        var self = this;
        var newImg = new Image();
        newImg.onload = function () {
          self.src = this.src;
          jq(self).data("queue", "loaded");
          const widthValue = Number(
            this.width || this.naturalWidth || realWidth || 0
          );
          const heightValue = Number(
            this.height || this.naturalHeight || 0
          );
          jq(self).attr("width", widthValue);
          jq(self).attr("height", heightValue);
        };
        newImg.src = url;
        jq(this).addClass("image-loaded");
      }
    }
  );
}

let loadingLazyImages = setInterval(loadLazyImage, 1000);

function loadLazyUrl() {
  const jq = getJq();

  if (typeof jq !== "function") {
    return;
  }

  if (jq("*[data-slazy-url]:not(.image-loaded)").length === 0) {
    clearInterval(loadingLazyUrl);
    return;
  }

  jq("*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)").each(
    function () {
      const element = this;
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

