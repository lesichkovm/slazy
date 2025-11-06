describe('loadLazyImage', function() {
    let mockImage;
    let mockElement;
    let originalSetInterval;
    let originalClearInterval;

    beforeEach(function() {
        // Mock jQuery
        window.$ = jasmine.createSpy('$').and.callFake(function(selector) {
            if (typeof selector === 'string') {
                // Selector queries
                if (selector === 'img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)') {
                    return {
                        each: jasmine.createSpy('each').and.callFake(function(callback) {
                            // Mock no elements found
                        })
                    };
                }
                if (selector === 'img[data-slazy-src]:not(.image-loaded)') {
                    return { length: 0 };
                }
            } else if (typeof selector === 'object') {
                // Element wrapping
                return {
                    css: jasmine.createSpy('css').and.returnValue('100px'),
                    width: jasmine.createSpy('width').and.returnValue(100),
                    parent: jasmine.createSpy('parent').and.returnValue({
                        width: jasmine.createSpy('width').and.returnValue(200)
                    }),
                    data: jasmine.createSpy('data').and.returnValue('test.jpg'),
                    hasClass: jasmine.createSpy('hasClass').and.returnValue(false),
                    attr: jasmine.createSpy('attr'),
                    addClass: jasmine.createSpy('addClass')
                };
            }
            return jasmine.createSpyObj('$', ['each', 'length', 'css', 'width', 'parent', 'data', 'hasClass', 'attr', 'addClass']);
        });

        // Mock Image constructor
        mockImage = jasmine.createSpyObj('Image', ['onload']);
        window.Image = jasmine.createSpy('Image').and.returnValue(mockImage);

        // Mock checkVisible
        window.checkVisible = jasmine.createSpy('checkVisible').and.returnValue(true);

        // Mock intervals
        originalSetInterval = window.setInterval;
        originalClearInterval = window.clearInterval;
        window.setInterval = jasmine.createSpy('setInterval');
        window.clearInterval = jasmine.createSpy('clearInterval');

        // Reset loadingLazyImages
        loadingLazyImages = undefined;
    });

    afterEach(function() {
        window.setInterval = originalSetInterval;
        window.clearInterval = originalClearInterval;
        delete window.$;
        delete window.Image;
        delete window.checkVisible;
    });

    it('should do nothing if no lazy images found', function() {
        loadLazyImage();
        expect(window.clearInterval).toHaveBeenCalled();
    });

    it('should skip elements without real width', function() {
        window.$(jasmine.any(String)).and.callFake(function(selector) {
            if (selector === 'img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)') {
                return {
                    each: function(callback) {
                        callback.call({}); // Mock element with no width
                    }
                };
            }
            return jasmine.createSpyObj('$', ['css', 'width']);
        });

        const $el = window.$({});
        $el.css.and.returnValue('100%'); // Percentage width
        $el.width.and.returnValue(0);

        loadLazyImage();
    });

    it('should load visible images', function() {
        let processed = false;
        window.$(jasmine.any(String)).and.callFake(function(selector) {
            if (selector === 'img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)') {
                return {
                    each: function(callback) {
                        const mockEl = {
                            src: '',
                            style: {}
                        };
                        callback.call(mockEl);
                        processed = true;
                    }
                };
            }
            return jasmine.createSpyObj('$', ['css', 'width', 'parent', 'data', 'hasClass', 'attr', 'addClass']);
        });

        loadLazyImage();
        expect(processed).toBe(true);
    });

    it('should resize URLs when no-resize class is not present', function() {
        window.$(jasmine.any(String)).and.callFake(function(selector) {
            if (selector === 'img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)') {
                return {
                    each: function(callback) {
                        const mockEl = {
                            src: '',
                            style: {}
                        };
                        callback.call(mockEl);
                    }
                };
            }
            return jasmine.createSpyObj('$', ['css', 'width', 'parent', 'data', 'hasClass', 'attr', 'addClass']);
        });

        const $el = window.$({});
        $el.data.and.returnValue('image-640x480.jpg');
        $el.hasClass.and.returnValue(false); // not no-resize

        loadLazyImage();

        expect(mockImage.src).toBe('image-100x0.jpg');
    });

    it('should not resize URLs when no-resize class is present', function() {
        window.$(jasmine.any(String)).and.callFake(function(selector) {
            if (selector === 'img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)') {
                return {
                    each: function(callback) {
                        const mockEl = {
                            src: '',
                            style: {}
                        };
                        callback.call(mockEl);
                    }
                };
            }
            return jasmine.createSpyObj('$', ['css', 'width', 'parent', 'data', 'hasClass', 'attr', 'addClass']);
        });

        const $el = window.$({});
        $el.data.and.returnValue('image-640x480.jpg');
        $el.hasClass.and.returnValue(true); // no-resize

        loadLazyImage();

        expect(mockImage.src).toBe('image-640x480.jpg');
    });
});
