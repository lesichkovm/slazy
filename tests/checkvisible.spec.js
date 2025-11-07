describe('checkVisible', function() {
    let testElement;
    let mockRect;
    let fixture;
    let originalInnerHeightDescriptor;
    let originalClientHeightDescriptor;
    let checkVisible;
    let originalMargin;
    beforeEach(function() {
        fixture = document.createElement('div');
        document.body.appendChild(fixture);

        testElement = document.createElement('img');
        fixture.appendChild(testElement);

        checkVisible = Slazy.checkVisible;
        originalMargin = typeof Slazy.getPrefetchMargin === 'function' ? Slazy.getPrefetchMargin() : 0;
        if (typeof Slazy.setPrefetchMargin === 'function') {
            Slazy.setPrefetchMargin(0);
        }

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

        testElement.className = '';
    });

    afterEach(function() {
        if (fixture && fixture.parentNode) {
            fixture.parentNode.removeChild(fixture);
        }

        if (typeof Slazy.setPrefetchMargin === 'function') {
            Slazy.setPrefetchMargin(originalMargin);
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
        testElement.classList.add('carousel_item_image');
        const carouselItem = document.createElement('div');
        carouselItem.classList.add('carousel_item');
        carouselItem.setAttribute('aria-hidden', 'true');
        carouselItem.appendChild(testElement);
        fixture.appendChild(carouselItem);

        expect(checkVisible(testElement)).toBe(false);

        carouselItem.setAttribute('aria-hidden', 'false');
        expect(checkVisible(testElement)).toBe(true);

        carouselItem.removeAttribute('aria-hidden');

        expect(checkVisible(testElement)).toBe(true);
    });

    it('should handle splide slides correctly', function() {
        testElement.classList.add('carousel_item_image');
        const carouselItem = document.createElement('div');
        carouselItem.classList.add('carousel_item');
        carouselItem.appendChild(testElement);

        const splideSlide = document.createElement('div');
        splideSlide.classList.add('splide__slide');
        splideSlide.setAttribute('aria-hidden', 'true');
        splideSlide.appendChild(carouselItem);
        fixture.appendChild(splideSlide);

        expect(checkVisible(testElement)).toBe(false);

        splideSlide.setAttribute('aria-hidden', 'false');
        expect(checkVisible(testElement)).toBe(true);
    });

    it('should treat elements above viewport as visible within prefetch margin', function() {
        if (typeof Slazy.setPrefetchMargin !== 'function') {
            pending('Prefetch margin API not available');
        }

        Slazy.setPrefetchMargin(150);
        mockRect.top = -120;
        mockRect.bottom = -20;

        expect(checkVisible(testElement)).toBe(true);
    });

    it('should treat elements below viewport as visible within prefetch margin', function() {
        if (typeof Slazy.setPrefetchMargin !== 'function') {
            pending('Prefetch margin API not available');
        }

        const viewHeight = Math.max(
            document.documentElement.clientHeight,
            window.innerHeight
        );
        Slazy.setPrefetchMargin(200);
        mockRect.top = viewHeight + 50;
        mockRect.bottom = viewHeight + 150;

        expect(checkVisible(testElement)).toBe(true);
    });

    it('should normalise invalid margin inputs to zero', function() {
        if (typeof Slazy.setPrefetchMargin !== 'function') {
            pending('Prefetch margin API not available');
        }

        Slazy.setPrefetchMargin(-100);
        expect(Slazy.getPrefetchMargin()).toBe(0);

        Slazy.setPrefetchMargin('42');
        expect(Slazy.getPrefetchMargin()).toBe(42);
    });
});
