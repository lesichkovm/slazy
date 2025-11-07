describe('checkVisible', function() {
    let testElement;
    let mockRect;
    let fixture;
    let originalInnerHeightDescriptor;
    let originalClientHeightDescriptor;
    let original$;
    let jQueryStub;

    beforeEach(function() {
        fixture = document.createElement('div');
        document.body.appendChild(fixture);

        testElement = document.createElement('img');
        fixture.appendChild(testElement);

        mockRect = {
            top: 100,
            bottom: 200,
            left: 0,
            right: 100
        };

        spyOn(testElement, 'getBoundingClientRect').and.callFake(function() {
            return mockRect;
        });

        originalInnerHeightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            writable: true,
            value: 800
        });

        originalClientHeightDescriptor = Object.getOwnPropertyDescriptor(document.documentElement, 'clientHeight');
        Object.defineProperty(document.documentElement, 'clientHeight', {
            configurable: true,
            writable: true,
            value: 800
        });

        original$ = window.$;
        jQueryStub = {
            hasClass: jasmine.createSpy('hasClass').and.returnValue(false),
            closest: jasmine.createSpy('closest').and.returnValue({
                attr: jasmine.createSpy('attr').and.returnValue(null)
            }),
            addClass: function(cls) {
                testElement.className = (testElement.className + ' ' + cls).trim();
                return this;
            }
        };

        window.$ = jasmine.createSpy('$').and.callFake(function(el) {
            if (el === testElement) {
                return jQueryStub;
            }
            return typeof original$ === 'function' ? original$(el) : undefined;
        });
    });

    afterEach(function() {
        if (fixture && fixture.parentNode) {
            fixture.parentNode.removeChild(fixture);
        }

        if (originalInnerHeightDescriptor) {
            Object.defineProperty(window, 'innerHeight', originalInnerHeightDescriptor);
        } else {
            delete window.innerHeight;
        }

        if (originalClientHeightDescriptor) {
            Object.defineProperty(document.documentElement, 'clientHeight', originalClientHeightDescriptor);
        } else {
            delete document.documentElement.clientHeight;
        }

        if (typeof original$ === 'undefined') {
            delete window.$;
        } else {
            window.$ = original$;
        }
        jQueryStub = null;
    });

    it('should return true for elements within viewport', function() {
        expect(checkVisible(testElement)).toBe(true);
    });

    it('should return false for elements above viewport', function() {
        mockRect.top = -120;
        mockRect.bottom = -20;
        expect(checkVisible(testElement)).toBe(false);
    });

    it('should return false for elements below viewport', function() {
        const viewHeight = Math.max(
            document.documentElement.clientHeight,
            window.innerHeight
        );
        mockRect.top = viewHeight + 50;
        mockRect.bottom = viewHeight + 150;
        expect(checkVisible(testElement)).toBe(false);
    });

    it('should handle carousel items correctly', function() {
        jQueryStub.hasClass = jasmine.createSpy('hasClass').and.returnValue(true);
        jQueryStub.closest = jasmine.createSpy('closest').and.callFake(function(selector) {
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

        jQueryStub.closest = jasmine.createSpy('closest').and.callFake(function() {
            return {
                attr: jasmine.createSpy('attr').and.returnValue(null)
            };
        });

        expect(checkVisible(testElement)).toBe(true);
    });

    it('should handle splide slides correctly', function() {
        jQueryStub.hasClass = jasmine.createSpy('hasClass').and.returnValue(true);
        jQueryStub.closest = jasmine.createSpy('closest').and.callFake(function(selector) {
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
