function checkVisible(elementInstance) {
  // Check if the image element belongs to one of the carousels (Slick or Splide)
  if ($(elementInstance).hasClass("carousel_item_image")) {
    if (
      $(elementInstance).closest(".carousel_item").attr("aria-hidden") ===
      "true"
    ) {
      return false;
    }
    // If image is not visible (it is not scrolled into view) we return false
    if (
      $(elementInstance).closest("div.splide__slide").attr("aria-hidden") ===
      "true"
    ) {
      return false;
    }
  }
  const rect = elementInstance.getBoundingClientRect();
  const viewHeight = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight
  );
  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
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
  if (window.JQuery) {
    return;
  }

  if ($("img[data-slazy-src]:not(.image-loaded)").length === 0) {
    clearInterval(loadingLazyImages);
    return;
  }

  $("img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)").each(
    function () {
      const realWidth = $(this).css("width").includes("%")
        ? 0
        : parseInt($(this).width());
      const parentWidth = parseInt($(this).parent().width());
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
          $(self).attr("width", newImg.width);
          $(self).attr("height", newImg.height);
        };
        newImg.src = url;
        $(this).addClass("image-loaded");
      }
    }
  );
}

let loadingLazyImages = setInterval(loadLazyImage, 1000);

function loadLazyUrl() {
  if ($("*[data-slazy-url]:not(.image-loaded)").length === 0) {
    clearInterval(loadingLazyImages);
    return;
  }

  $("*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)").each(
    function () {
      const realWidth = $(this).css("width").includes("%")
        ? 0
        : parseInt($(this).width());
      const parentWidth = parseInt($(this).parent().width());

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

