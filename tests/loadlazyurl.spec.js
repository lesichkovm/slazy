describe('loadLazyUrl', function() {
    let mockElement;
    let originalSetInterval;
    let originalClearInterval;
    let selectorHandlers;
    let elementWrappers;
    let setSelectorHandler;
    let registerElementWrapper;
    let original$;
    let originaljQuery;
    let originalCheckVisible;

    function createElementWrapper(overrides = {}) {
        const dataStore = Object.assign({ 'slazy-url': 'background.jpg' }, overrides.initialData);
        const styleStore = Object.assign({ 'background-image': 'url(placeholder.jpg)', width: '100px' }, overrides.initialStyles);

        const dataSpy = jasmine.createSpy('data').and.callFake(function(key, value) {
            if (typeof value !== 'undefined') {
                dataStore[key] = value;
                return value;
            }
            return dataStore[key];
        });

        const cssSpy = jasmine.createSpy('css').and.callFake(function(property, value) {
            if (typeof value !== 'undefined') {
                styleStore[property] = value;
                return value;
            }
            return styleStore[property];
        });

        return Object.assign(
            {
                css: cssSpy,
                width: jasmine.createSpy('width').and.returnValue(100),
                parent: jasmine.createSpy('parent').and.returnValue({
                    width: jasmine.createSpy('width').and.returnValue(200)
                }),
                data: dataSpy,
                hasClass: jasmine.createSpy('hasClass').and.returnValue(false),
                addClass: jasmine.createSpy('addClass')
            },
            overrides.overrides
        );
    }

    beforeEach(function() {
        // Mock jQuery
        original$ = window.$;
        originaljQuery = window.jQuery;
        selectorHandlers = {};
        elementWrappers = new Map();

        setSelectorHandler = function(selector, factory) {
            selectorHandlers[selector] = factory;
        };

        registerElementWrapper = function(element, options = {}) {
            const wrapper = createElementWrapper(options);
            elementWrappers.set(element, wrapper);
            return wrapper;
        };

        const jquerySpy = jasmine.createSpy('$').and.callFake(function(selector) {
            if (typeof selector === 'string') {
                if (selectorHandlers[selector]) {
                    return selectorHandlers[selector]();
                }

                if (selector === '*[data-slazy-url]:not(.image-loaded)') {
                    return { length: 0 };
                }

                if (selector === '*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)') {
                    return {
                        each: jasmine.createSpy('each').and.callFake(function() {})
                    };
                }

                return jasmine.createSpyObj('$', ['each', 'length']);
            }

            if (elementWrappers.has(selector)) {
                return elementWrappers.get(selector);
            }

            return registerElementWrapper(selector);
        });

        window.$ = jquerySpy;
        window.jQuery = jquerySpy;

        // Mock checkVisible
        originalCheckVisible = window.checkVisible;
        window.checkVisible = jasmine.createSpy('checkVisible').and.returnValue(true);

        // Mock intervals
        originalSetInterval = window.setInterval;
        originalClearInterval = window.clearInterval;
        window.setInterval = jasmine.createSpy('setInterval');
        window.clearInterval = jasmine.createSpy('clearInterval');

        // Reset loadingLazyUrl
        loadingLazyUrl = undefined;
        loadingLazyImages = 'images-handle';
    });

    afterEach(function() {
        window.setInterval = originalSetInterval;
        window.clearInterval = originalClearInterval;
        window.$ = original$;
        window.jQuery = originaljQuery;
        if (typeof originalCheckVisible === 'undefined') {
            delete window.checkVisible;
        } else {
            window.checkVisible = originalCheckVisible;
        }
        originalCheckVisible = undefined;
    });

    it('should do nothing if no lazy URLs found', function() {
        loadLazyUrl();
        expect(window.clearInterval).toHaveBeenCalledWith(loadingLazyUrl);
    });

    it('should exit early when jQuery is unavailable', function() {
        window.$ = undefined;
        window.jQuery = undefined;

        expect(function() {
            loadLazyUrl();
        }).not.toThrow();
    });

    it('should skip elements without real width', function() {
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        setSelectorHandler('*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {};
                    const wrapper = registerElementWrapper(element, {
                        initialStyles: { width: '100%' }
                    });
                    wrapper.width.and.returnValue(0);
                    callback.call(element);
                }
            };
        });

        loadLazyUrl();
    });

    it('should load visible background images', function() {
        let processed = false;
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        setSelectorHandler('*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        style: {}
                    };
                    registerElementWrapper(element);
                    callback.call(element);
                    processed = true;
                }
            };
        });

        loadLazyUrl();
        expect(processed).toBe(true);
    });

    it('should use parent width when element width is percentage based', function() {
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        let wrapper;
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        style: {}
                    };
                    wrapper = registerElementWrapper(element, {
                        initialStyles: { width: '100%' }
                    });
                    wrapper.width.and.returnValue(0);
                    wrapper.parent.and.returnValue({
                        width: jasmine.createSpy('parentWidth').and.returnValue(250)
                    });
                    wrapper.data('slazy-url', 'background-640x480.jpg');
                    callback.call(element);
                }
            };
        });

        loadLazyUrl();

        expect(wrapper.addClass).toHaveBeenCalledWith('image-loaded');
    });

    it('should not process elements when checkVisible returns false', function() {
        window.checkVisible.and.returnValue(false);

        setSelectorHandler('*[data-slazy-url]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        let wrapper;
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        style: {}
                    };
                    wrapper = registerElementWrapper(element);
                    wrapper.data('slazy-url', 'background-640x480.jpg');
                    callback.call(element);
                }
            };
        });

        loadLazyUrl();

        expect(wrapper.css).not.toHaveBeenCalledWith('background-image', jasmine.any(String));
        expect(wrapper.data('queue')).not.toBe('loaded');
    });

    it('should skip already queued elements', function() {
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        setSelectorHandler('*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        style: {}
                    };
                    registerElementWrapper(element, {
                        initialData: { queue: 'loading', 'slazy-url': 'background-640x480.jpg' }
                    });
                    callback.call(element);
                }
            };
        });

        loadLazyUrl();

        expect(window.checkVisible).not.toHaveBeenCalled();
    });

    it('should skip carousel elements', function() {
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        setSelectorHandler('*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function() {
                    // simulate zero non-carousel matches
                }
            };
        });

        const element = {};
        const wrapper = registerElementWrapper(element);
        wrapper.hasClass.and.callFake(function(className) {
            if (className === 'carousel_item_image') {
                return true;
            }
            return false;
        });
        wrapper.data('slazy-url', 'background-640x480.jpg');

        loadLazyUrl();

        expect(wrapper.css).not.toHaveBeenCalledWith('background-image', jasmine.any(String));
    });

    it('should resize URLs when no-resize class is not present', function() {
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        let wrapper;
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        style: {}
                    };
                    wrapper = registerElementWrapper(element);
                    wrapper.data('slazy-url', 'background-640x480.jpg');
                    wrapper.hasClass.and.returnValue(false);
                    callback.call(element);
                }
            };
        });

        loadLazyUrl();

        expect(wrapper.css).toHaveBeenCalledWith('background-image', 'url(background-100x0.jpg)');
    });

    it('should not resize URLs when no-resize class is present', function() {
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        setSelectorHandler('*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        style: {}
                    };
                    const wrapper = registerElementWrapper(element);
                    wrapper.data('slazy-url', 'background-640x480.jpg');
                    wrapper.hasClass.and.returnValue(true);
                    callback.call(element);
                }
            };
        });

        loadLazyUrl();

        const element = Array.from(elementWrappers.keys())[0];
        const elementWrapper = elementWrappers.get(element);
        expect(elementWrapper.css).toHaveBeenCalledWith('background-image', 'url(background-640x480.jpg)');
    });

    it('should skip already processed elements', function() {
        setSelectorHandler('*[data-slazy-url]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        setSelectorHandler('*[data-slazy-url]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        style: {
                            backgroundImage: 'url(background-100x0.jpg)'
                        }
                    };
                    const wrapper = registerElementWrapper(element, {
                        initialData: { 'slazy-url': 'background-640x480.jpg' },
                        initialStyles: {
                            'background-image': 'url(background-100x0.jpg)',
                            width: '100px'
                        }
                    });
                    callback.call(element);
                }
            };
        });

        loadLazyUrl();

        const element = Array.from(elementWrappers.keys())[0];
        const wrapper = elementWrappers.get(element);
        expect(wrapper.css).not.toHaveBeenCalledWith('background-image', jasmine.any(String));
    });
});
