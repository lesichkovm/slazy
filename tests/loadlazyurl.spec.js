describe('loadLazyUrl', function() {
    let mockElement;
    let originalSetInterval;
    let originalClearInterval;

    beforeEach(function() {
        // Mock jQuery
        window.$ = jasmine.createSpy('$').and.callFake(function(selector) {
            if (typeof selector === 'string') {
                // Selector queries
                if (selector === '*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)') {
                    return {
                        each: jasmine.createSpy('each').and.callFake(function(callback) {
                            // Mock no elements found by default
                        })
                    };
                }
                if (selector === '*[data-slazy-url]:not(.image-loaded)') {
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
                    data: jasmine.createSpy('data').and.returnValue('background.jpg'),
                    hasClass: jasmine.createSpy('hasClass').and.returnValue(false),
                    addClass: jasmine.createSpy('addClass')
                };
            }
            return jasmine.createSpyObj('$', ['each', 'length', 'css', 'width', 'parent', 'data', 'hasClass', 'addClass']);
        });

        // Mock checkVisible
        window.checkVisible = jasmine.createSpy('checkVisible').and.returnValue(true);

        // Mock intervals
        originalSetInterval = window.setInterval;
        originalClearInterval = window.clearInterval;
        window.setInterval = jasmine.createSpy('setInterval');
        window.clearInterval = jasmine.createSpy('clearInterval');

        // Reset loadingLazyUrl
        loadingLazyUrl = undefined;
    });

    afterEach(function() {
        window.setInterval = originalSetInterval;
        window.clearInterval = originalClearInterval;
        delete window.$;
        delete window.checkVisible;
    });

    it('should do nothing if no lazy URLs found', function() {
        loadLazyUrl();
        expect(window.clearInterval).toHaveBeenCalled();
    });

    it('should skip elements without real width', function() {
        window.$(jasmine.any(String)).and.callFake(function(selector) {
            if (selector === '*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)') {
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

        loadLazyUrl();
    });

    it('should load visible background images', function() {
        let processed = false;
        window.$(jasmine.any(String)).and.callFake(function(selector) {
            if (selector === '*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)') {
                return {
                    each: function(callback) {
                        const mockEl = {
                            style: {}
                        };
                        callback.call(mockEl);
                        processed = true;
                    }
                };
            }
            return jasmine.createSpyObj('$', ['css', 'width', 'parent', 'data', 'hasClass', 'addClass']);
        });

        loadLazyUrl();
        expect(processed).toBe(true);
    });

    it('should resize URLs when no-resize class is not present', function() {
        window.$(jasmine.any(String)).and.callFake(function(selector) {
            if (selector === '*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)') {
                return {
                    each: function(callback) {
                        const mockEl = {
                            style: {}
                        };
                        callback.call(mockEl);
                    }
                };
            }
            return jasmine.createSpyObj('$', ['css', 'width', 'parent', 'data', 'hasClass', 'addClass']);
        });

        const $el = window.$({});
        $el.data.and.returnValue('background-640x480.jpg');
        $el.hasClass.and.returnValue(false); // not no-resize

        loadLazyUrl();

        expect($el.css).toHaveBeenCalledWith('background-image', 'url(background-100x0.jpg)');
    });

    it('should not resize URLs when no-resize class is present', function() {
        window.$(jasmine.any(String)).and.callFake(function(selector) {
            if (selector === '*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)') {
                return {
                    each: function(callback) {
                        const mockEl = {
                            style: {}
                        };
                        callback.call(mockEl);
                    }
                };
            }
            return jasmine.createSpyObj('$', ['css', 'width', 'parent', 'data', 'hasClass', 'addClass']);
        });

        const $el = window.$({});
        $el.data.and.returnValue('background-640x480.jpg');
        $el.hasClass.and.returnValue(true); // no-resize

        loadLazyUrl();

        expect($el.css).toHaveBeenCalledWith('background-image', 'url(background-640x480.jpg)');
    });

    it('should skip already processed elements', function() {
        window.$(jasmine.any(String)).and.callFake(function(selector) {
            if (selector === '*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)') {
                return {
                    each: function(callback) {
                        const mockEl = {
                            style: {
                                backgroundImage: 'url(already-loaded.jpg)'
                            }
                        };
                        callback.call(mockEl);
                    }
                };
            }
            return jasmine.createSpyObj('$', ['css']);
        });

        const $el = window.$({});
        $el.css.and.returnValue('url(already-loaded.jpg)'); // Already has background

        loadLazyUrl();

        expect($el.css).not.toHaveBeenCalledWith('background-image', jasmine.any(String));
    });
});
