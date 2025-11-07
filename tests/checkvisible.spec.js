describe('checkVisible', function() {
    let testElement;
    let mockRect;
    let fixture;
    let originalInnerHeightDescriptor;
    let originalClientHeightDescriptor;
    let checkVisible;
    beforeEach(function() {
        fixture = document.createElement('div');
        document.body.appendChild(fixture);

        testElement = document.createElement('img');
        fixture.appendChild(testElement);

        checkVisible = Slazy.checkVisible;

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
});
