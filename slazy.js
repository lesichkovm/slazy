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

function loadLazyImage() {
  const jq = window.$ || window.jQuery;

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
  const jq = window.$ || window.jQuery;

  const dataKeyToDatasetKey = (key) =>
    key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

  const getData = (element, key) => {
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

    if (typeof jq === "function") {
      return jq(element).data(key);
    }

    return undefined;
  };

  const setData = (element, key, value) => {
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

    if (typeof jq === "function") {
      jq(element).data(key, value);
    }
  };

  const hasClass = (element, className) => {
    if (element && element.classList && typeof element.classList.contains === "function") {
      return element.classList.contains(className);
    }

    if (typeof jq === "function") {
      return jq(element).hasClass(className);
    }

    return false;
  };

  const addClass = (element, className) => {
    if (element && element.classList && typeof element.classList.add === "function") {
      element.classList.add(className);
      return;
    }

    if (typeof jq === "function") {
      jq(element).addClass(className);
    }
  };

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
      const widthCss = jq(element).css("width");
      let realWidth = widthCss.includes("%")
        ? 0
        : parseInt(jq(element).width(), 10);
      const parentWidth = parseInt(jq(element).parent().width(), 10) || 0;

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

      if (jq(element).css("background-image") === "url(" + url + ")") {
        return; //already processed
      }

      if (getData(element, "queue") != null) {
        return; //already processed
      }

      if (checkVisible(element)) {
        setData(element, "queue", "loaded");
        jq(element).css("background-image", "url(" + url + ")");
        addClass(element, "image-loaded");
      }
    }
  );
}

let loadingLazyUrl = setInterval(loadLazyUrl, 1000);

