describe('checkVisible', function() {
    let testElement;
    let mockRect;
    let elementStub;

    beforeEach(function() {
        // Create a mock element
        testElement = document.createElement('div');

        // Mock getBoundingClientRect
        mockRect = {
            top: 100,
            bottom: 200,
            left: 0,
            right: 100
        };
        testElement.getBoundingClientRect = jasmine.createSpy('getBoundingClientRect').and.returnValue(mockRect);

        // Mock window and document dimensions
        Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
        Object.defineProperty(document.documentElement, 'clientHeight', { value: 800, writable: true });

        // Mock jQuery
        elementStub = {
            hasClass: jasmine.createSpy('hasClass').and.returnValue(false),
            closest: jasmine
                .createSpy('closest')
                .and.callFake(function() {
                    return {
                        attr: jasmine.createSpy('attr').and.returnValue(null)
                    };
                })
        };

        window.$ = jasmine.createSpy('$').and.callFake(function(selector) {
            if (selector === testElement) {
                return elementStub;
            }
            return jasmine.createSpyObj('$', ['hasClass', 'closest']);
        });
    });

    afterEach(function() {
        // Reset mocks
        delete window.$;
    });

    it('should return true for elements within viewport', function() {
        // Element is visible
        expect(checkVisible(testElement)).toBe(true);
    });

    it('should return false for elements above viewport', function() {
        mockRect.top = -120;
        mockRect.bottom = -20;
        expect(checkVisible(testElement)).toBe(false);
    });

    it('should return false for elements below viewport', function() {
        mockRect.top = 1000000;
        mockRect.bottom = 1000100;
        expect(checkVisible(testElement)).toBe(false);
    });

    it('should handle carousel items correctly', function() {
        // Mock carousel item
        const $mock = window.$(testElement);
        $mock.hasClass.and.returnValue(true); // carousel_item_image
        $mock.closest.and.callFake(function(selector) {
            if (selector === '.carousel_item') {
                return {
                    attr: jasmine.createSpy('attr').and.returnValue('true')
                };
            }
            return {
                attr: jasmine.createSpy('attr').and.returnValue(null)
            };
        });

        expect(checkVisible(testElement)).toBe(false);

        $mock.closest.and.callFake(function() {
            return {
                attr: jasmine.createSpy('attr').and.returnValue(null) // not hidden
            };
        });

        expect(checkVisible(testElement)).toBe(true);
    });

    it('should handle splide slides correctly', function() {
        const $mock = window.$(testElement);
        $mock.hasClass.and.returnValue(true); // carousel_item_image so splide check runs
        $mock.closest.and.callFake(function(selector) {
            if (selector === '.carousel_item') {
                return {
                    attr: jasmine.createSpy('attr').and.returnValue(null)
                };
            }
            if (selector === 'div.splide__slide') {
                return {
                    attr: jasmine.createSpy('attr').and.returnValue('true')
                };
            }
            return {
                attr: jasmine.createSpy('attr').and.returnValue(null)
            };
        });

        expect(checkVisible(testElement)).toBe(false);
    });
});
