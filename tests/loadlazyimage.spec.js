describe('loadLazyImage', function() {
    let mockImage;
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
        const dataStore = Object.assign({ 'slazy-src': 'test.jpg' }, overrides.initialData);
        const styleStore = Object.assign({ width: '100px', 'background-image': 'url(placeholder.jpg)' }, overrides.initialStyles);
        const attrStore = Object.assign({}, overrides.initialAttrs);

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

        const attrSpy = jasmine.createSpy('attr').and.callFake(function(property, value) {
            if (typeof value !== 'undefined') {
                attrStore[property] = value;
                return value;
            }
            return attrStore[property];
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
                attr: attrSpy,
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

                if (selector === 'img[data-slazy-src]:not(.image-loaded)') {
                    return { length: 0 };
                }

                if (selector === 'img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)') {
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

        // Mock Image constructor
        mockImage = jasmine.createSpyObj('Image', ['onload']);
        window.Image = jasmine.createSpy('Image').and.returnValue(mockImage);

        // Mock checkVisible
        originalCheckVisible = window.checkVisible;
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
        window.$ = original$;
        window.jQuery = originaljQuery;
        delete window.Image;
        if (typeof originalCheckVisible === 'undefined') {
            delete window.checkVisible;
        } else {
            window.checkVisible = originalCheckVisible;
        }
        originalCheckVisible = undefined;
    });

    it('should do nothing if no lazy images found', function() {
        loadLazyImage();
        expect(window.clearInterval).toHaveBeenCalled();
    });

    it('should exit early when jQuery is unavailable', function() {
        window.$ = undefined;
        window.jQuery = undefined;

        expect(function() {
            loadLazyImage();
        }).not.toThrow();
    });

    it('should skip elements without real width', function() {
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        setSelectorHandler('img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)', function() {
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

        loadLazyImage();
    });

    it('should load visible images', function() {
        let processed = false;
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        setSelectorHandler('img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        src: '',
                        style: {}
                    };
                    registerElementWrapper(element);
                    callback.call(element);
                    processed = true;
                }
            };
        });

        loadLazyImage();
        expect(processed).toBe(true);
    });

    it('should use parent width when element width is percentage based', function() {
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        let wrapper;
        let createdImage;
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        src: '',
                        style: {}
                    };
                    wrapper = registerElementWrapper(element, {
                        initialStyles: { width: '100%' }
                    });
                    wrapper.width.and.returnValue(0);
                    wrapper.parent.and.returnValue({
                        width: jasmine.createSpy('parentWidth').and.returnValue(250)
                    });
                    wrapper.data('slazy-src', 'image-640x480.jpg');
                    window.Image.and.callFake(function() {
                        createdImage = {
                            onload: null,
                            src: '',
                            width: 0,
                            height: 0
                        };
                        return createdImage;
                    });
                    callback.call(element);
                    createdImage.width = 250;
                    createdImage.height = 0;
                    createdImage.src = 'image-250x0.jpg';
                    if (createdImage.onload) {
                        createdImage.onload.call(createdImage);
                    }
                }
            };
        });

        loadLazyImage();

        expect(wrapper.data('queue')).toBe('loaded');
        expect(wrapper.attr).toHaveBeenCalledWith('width', 250);
        expect(wrapper.addClass).toHaveBeenCalledWith('image-loaded');
    });

    it('should not process images when checkVisible returns false', function() {
        window.checkVisible.and.returnValue(false);

        setSelectorHandler('img[data-slazy-src]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        let wrapper;
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        src: '',
                        style: {}
                    };
                    wrapper = registerElementWrapper(element);
                    wrapper.data('slazy-src', 'image-640x480.jpg');
                    callback.call(element);
                }
            };
        });

        loadLazyImage();

        expect(window.Image).not.toHaveBeenCalled();
        expect(wrapper.data('queue')).not.toBe('loading');
    });

    it('should skip already queued images', function() {
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        setSelectorHandler('img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        src: '',
                        style: {}
                    };
                    const wrapper = registerElementWrapper(element, {
                        initialData: { queue: 'loading', 'slazy-src': 'image-640x480.jpg' }
                    });
                    callback.call(element);
                }
            };
        });

        loadLazyImage();

        expect(window.Image).not.toHaveBeenCalled();
    });

    it('should skip carousel images', function() {
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        let wrapper;
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function() {
                    // simulate zero elements matched
                }
            };
        });

        const element = {
            src: '',
            style: {}
        };
        wrapper = registerElementWrapper(element);
        wrapper.hasClass.and.callFake(function(className) {
            if (className === 'carousel_item_image') {
                return true;
            }
            return false;
        });
        wrapper.data('slazy-src', 'image-640x480.jpg');

        loadLazyImage();

        expect(window.Image).not.toHaveBeenCalled();
        expect(wrapper.addClass).not.toHaveBeenCalledWith('image-loaded');
    });

    it('should resize URLs when no-resize class is not present', function() {
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        let wrapper;
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        src: '',
                        style: {}
                    };
                    wrapper = registerElementWrapper(element);
                    wrapper.data('slazy-src', 'image-640x480.jpg');
                    wrapper.hasClass.and.returnValue(false);
                    callback.call(element);
                }
            };
        });

        loadLazyImage();

        expect(mockImage.src).toBe('image-100x0.jpg');
    });

    it('should not resize URLs when no-resize class is present', function() {
        setSelectorHandler('img[data-slazy-src]:not(.image-loaded)', function() {
            return { length: 1 };
        });

        setSelectorHandler('img[data-slazy-src]:not(.image-loaded):not(.carousel_item_image)', function() {
            return {
                each: function(callback) {
                    const element = {
                        src: '',
                        style: {}
                    };
                    const wrapper = registerElementWrapper(element);
                    wrapper.data('slazy-src', 'image-640x480.jpg');
                    wrapper.hasClass.and.returnValue(true);
                    callback.call(element);
                }
            };
        });

        loadLazyImage();

        expect(mockImage.src).toBe('image-640x480.jpg');
    });
});
