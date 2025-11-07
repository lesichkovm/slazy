// Legacy helper kept for reference.
// function preloadLazyImage(imageElement) {
//     const self = imageElement;
//
//     if (!imageElement) {
//         return false;
//     }
//
//     const realWidth = $(imageElement).css("width").includes("%") ? 0 : parseInt($(imageElement).width());
//     // DEBUG: console.log("real width:" + realWidth);
//
//     const parentWidth = parseInt($(imageElement).parent().width());
//     if (realWidth === 0) {
//         realWidth = parentWidth;
//     }
//
//     // DEBUG: console.log("parent width:" + parentWidth);
//
//     const url = $(imageElement).data('slazy-src');
//     if (typeof url === "undefined") {
//         return;
//     }
//
//     // DEBUG: console.log('Preload Lazy URL: ' + url);
//
//     var resizedUrl = url.replace(/\d+x\d+/i, realWidth + 'x0');
//     if (imageElement.src === resizedUrl) {
//         // DEBUG: console.log('Already processed. Exit');
//         return; //already processed
//     }
//
//     if (typeof $(imageElement).data('queue') !== 'undefined') {
//         // DEBUG: console.log('Already queued. Exit');
//         return; //already processed
//     }
//
//     //console.log('Pre-Loading: ' + resizedUrl);
//
//     $(this).data('queue', 'loading');
//
//     const newImg = new Image;
//     newImg.onload = function () {
//         self.src = this.src;
//         $(self).data('queue', 'loaded');
//         $(self).css('max-height', 'inherit');
//         $(self).addClass('image-loaded');
//     };
//
//     newImg.src = resizedUrl;
// }
