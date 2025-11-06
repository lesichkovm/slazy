describe('checkVisible', function() {
    let testElement;
    let mockRect;

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
        window.$ = jasmine.createSpy('$').and.callFake(function(selector) {
            if (selector === testElement) {
                return {
                    hasClass: jasmine.createSpy('hasClass').and.returnValue(false),
                    closest: jasmine.createSpy('closest').and.returnValue({
                        attr: jasmine.createSpy('attr').and.returnValue(null)
                    })
                };
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
        mockRect.top = -50;
        mockRect.bottom = 50;
        expect(checkVisible(testElement)).toBe(false);
    });

    it('should return false for elements below viewport', function() {
        mockRect.top = 900;
        mockRect.bottom = 1000;
        expect(checkVisible(testElement)).toBe(false);
    });

    it('should handle carousel items correctly', function() {
        // Mock carousel item
        const $mock = window.$(testElement);
        $mock.hasClass.and.returnValue(true); // carousel_item_image
        $mock.closest.and.returnValue({
            attr: jasmine.createSpy('attr').and.returnValue('true') // aria-hidden="true"
        });

        expect(checkVisible(testElement)).toBe(false);

        $mock.closest.and.returnValue({
            attr: jasmine.createSpy('attr').and.returnValue(null) // not hidden
        });

        expect(checkVisible(testElement)).toBe(true);
    });

    it('should handle splide slides correctly', function() {
        const $mock = window.$(testElement);
        $mock.hasClass.and.returnValue(false); // not carousel_item_image
        $mock.closest.and.returnValue({
            attr: jasmine.createSpy('attr').and.returnValue('true') // aria-hidden="true"
        });

        expect(checkVisible(testElement)).toBe(false);
    });
});
