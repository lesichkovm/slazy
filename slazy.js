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

  if ($element && $element.hasClass("carousel_item_image")) {
    const carouselItem = $element.closest(".carousel_item");
    const carouselHidden =
      carouselItem && typeof carouselItem.attr === "function"
        ? carouselItem.attr("aria-hidden")
        : null;
    if (isHidden(carouselHidden)) {
      return false;
    }

    const splideSlide = $element.closest("div.splide__slide");
    const splideHidden =
      splideSlide && typeof splideSlide.attr === "function"
        ? splideSlide.attr("aria-hidden")
        : null;
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

// function preloadLazyImage(imageElement) {
//     const self = imageElement;

//     if (!imageElement) {
//         return false;
//     }

//     const realWidth = $(imageElement).css("width").includes("%") ? 0 : parseInt($(imageElement).width());
//     // DEBUG: console.log("real width:" + realWidth);

//     const parentWidth = parseInt($(imageElement).parent().width());
//     if (realWidth === 0) {
//         realWidth = parentWidth;
//     }

//     // DEBUG: console.log("parent width:" + parentWidth);

//     const url = $(imageElement).data('slazy-src');
//     if (typeof url === "undefined") {
//         return;
//     }

//     // DEBUG: console.log('Preload Lazy URL: ' + url);

//     var resizedUrl = url.replace(/\d+x\d+/i, realWidth + 'x0');
//     if (imageElement.src === resizedUrl) {
//         // DEBUG: console.log('Already processed. Exit');
//         return; //already processed
//     }

//     if (typeof $(imageElement).data('queue') !== 'undefined') {
//         // DEBUG: console.log('Already queued. Exit');
//         return; //already processed
//     }

//     //console.log('Pre-Loading: ' + resizedUrl);

//     $(this).data('queue', 'loading');

//     const newImg = new Image;
//     newImg.onload = function () {
//         self.src = this.src;
//         $(self).data('queue', 'loaded');
//         $(self).css('max-height', 'inherit');
//         $(self).addClass('image-loaded');
//     };

//     newImg.src = resizedUrl;
// }

function loadLazyImage() {
  // Requires JQuery
  if (!window.$ && !window.jQuery) {
    return;
  }

  if ($("img[data-slazy-src]:not(.image-loaded)").length === 0) {
    clearInterval(loadingLazyImages);
    return;
  }

  $("img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)").each(
    function () {
      const widthCss = $(this).css("width");
      let realWidth = widthCss.includes("%")
        ? 0
        : parseInt($(this).width(), 10);
      const parentWidth = parseInt($(this).parent().width(), 10) || 0;

      if (realWidth === 0 && parentWidth > 0) {
        realWidth = parentWidth;
      }

      if (realWidth === 0) {
        return;
      }

      let url = $(this).data("slazy-src");

      if (typeof url === "undefined") {
        return;
      }

      const noResize = $(this).hasClass("no-resize");
      if (noResize === false) {
        const resizedUrl = url.replace(/\d+x\d+/i, realWidth + "x0");
        url = resizedUrl;
      }

      // DEBUG:  console.log('URL to process:' + url);

      if (this.src === url) {
        return; //already processed
      }

      if (typeof $(this).data("queue") !== "undefined") {
        return; //already processed
      }

      if (checkVisible(this)) {
        $(this).data("queue", "loading");
        var self = this;
        var newImg = new Image();
        newImg.onload = function () {
          self.src = this.src;
          $(self).data("queue", "loaded");
          const widthValue = Number(
            this.width || this.naturalWidth || realWidth || 0
          );
          const heightValue = Number(
            this.height || this.naturalHeight || 0
          );
          $(self).attr("width", widthValue);
          $(self).attr("height", heightValue);
        };
        newImg.src = url;
        $(this).addClass("image-loaded");
      }
    }
  );
}

let loadingLazyImages = setInterval(loadLazyImage, 1000);

function loadLazyUrl() {
  if (!window.$ && !window.jQuery) {
    return;
  }

  if ($("*[data-slazy-url]:not(.image-loaded)").length === 0) {
    clearInterval(loadingLazyUrl);
    return;
  }

  $("*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)").each(
    function () {
      const widthCss = $(this).css("width");
      let realWidth = widthCss.includes("%")
        ? 0
        : parseInt($(this).width(), 10);
      const parentWidth = parseInt($(this).parent().width(), 10) || 0;

      if (realWidth === 0 && parentWidth > 0) {
        realWidth = parentWidth;
      }

      if (realWidth === 0) {
        return;
      }

      let url = $(this).data("slazy-url");

      if (typeof url === "undefined") {
        return;
      }

      const noResize = $(this).hasClass("no-resize");
      if (noResize === false) {
        const resizedUrl = url.replace(/\d+x\d+/i, realWidth + "x0");
        url = resizedUrl;
      }

      // DEBUG:  console.log('URL to process:' + url);

      if ($(this).css("background-image") === "url(" + url + ")") {
        return; //already processed
      }

      if (typeof $(this).data("queue") !== "undefined") {
        return; //already processed
      }

      if (checkVisible(this)) {
        $(this).data("queue", "loaded");
        $(this).css("background-image", "url(" + url + ")");
        $(this).addClass("image-loaded");
      }
    }
  );
}

let loadingLazyUrl = setInterval(loadLazyUrl, 1000);

