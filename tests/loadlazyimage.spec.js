describe('loadLazyImage', function() {
    let fixture;
    let originalSetInterval;
    let originalClearInterval;
    let originalImage;
    let originalCheckVisible;
    let createdImages;

    function stubRect(element, rect = {}) {
        const widthValue = Object.prototype.hasOwnProperty.call(rect, 'width') ? rect.width : 100;
        const heightValue = Object.prototype.hasOwnProperty.call(rect, 'height') ? rect.height : 100;
        const defaults = {
            top: 0,
            bottom: heightValue,
            left: 0,
            right: widthValue,
            width: widthValue,
            height: heightValue
        };
        spyOn(element, 'getBoundingClientRect').and.returnValue(Object.assign(defaults, rect));
    }

    function createParent(width) {
        const parent = document.createElement('div');
        stubRect(parent, { width: width });
        fixture.appendChild(parent);
        return parent;
    }

    function createImageElement(options = {}) {
        const {
            dataset = { 'slazy-src': 'image-640x480.jpg' },
            widthStyle = '100px',
            rectWidth,
            classList = [],
            queue,
            parentWidth,
            parent
        } = options;

        const img = document.createElement('img');
        Object.keys(dataset || {}).forEach(function(key) {
            const attrSuffix = key
                .replace(/([A-Z])/g, '-$1')
                .toLowerCase();
            img.setAttribute('data-' + attrSuffix, dataset[key]);
        });
        if (queue != null) {
            img.dataset.queue = queue;
        }
        if (typeof widthStyle === 'string') {
            img.style.width = widthStyle;
        }

        const effectiveWidth = rectWidth != null
            ? rectWidth
            : (typeof widthStyle === 'string' && widthStyle.endsWith('px'))
                ? parseInt(widthStyle, 10)
                : 0;

        stubRect(img, { width: effectiveWidth });

        classList.forEach(function(cls) {
            img.classList.add(cls);
        });

        let container = parent;
        if (!container && parentWidth != null) {
            container = createParent(parentWidth);
        }

        (container || fixture).appendChild(img);
        return img;
    }

    beforeEach(function() {
        fixture = document.createElement('div');
        document.body.appendChild(fixture);

        originalSetInterval = window.setInterval;
        originalClearInterval = window.clearInterval;
        window.setInterval = jasmine.createSpy('setInterval');
        window.clearInterval = jasmine.createSpy('clearInterval');

        createdImages = [];
        originalImage = window.Image;
        window.Image = jasmine.createSpy('Image').and.callFake(function() {
            const mock = { onload: null, src: '', width: 0, height: 0 };
            createdImages.push(mock);
            return mock;
        });

        originalCheckVisible = window.checkVisible;
        window.checkVisible = jasmine.createSpy('checkVisible').and.returnValue(true);

        loadingLazyImages = undefined;
    });

    afterEach(function() {
        if (fixture && fixture.parentNode) {
            fixture.parentNode.removeChild(fixture);
        }

        window.setInterval = originalSetInterval;
        window.clearInterval = originalClearInterval;
        window.Image = originalImage;

        if (typeof originalCheckVisible === 'undefined') {
            delete window.checkVisible;
        } else {
            window.checkVisible = originalCheckVisible;
        }
        originalCheckVisible = undefined;
        createdImages = [];
    });

    it('should do nothing if no lazy images found', function() {
        loadLazyImage();
        expect(window.clearInterval).toHaveBeenCalledWith(loadingLazyImages);
        expect(createdImages.length).toBe(0);
    });

    it('should skip elements without real width', function() {
        const parent = createParent(0);
        parent.style.width = '0px';
        createImageElement({ widthStyle: '100%', parent: parent, rectWidth: 0 });

        loadLazyImage();

        expect(createdImages.length).toBe(0);
    });

    it('should load visible images', function() {
        const img = createImageElement();

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(img.dataset.queue).toBe('loading');
        expect(mock.src).toBe('image-100x0.jpg');

        mock.width = 150;
        mock.height = 75;
        mock.onload();

        expect(img.dataset.queue).toBe('loaded');
        expect(img.getAttribute('width')).toBe('150');
        expect(img.getAttribute('height')).toBe('75');
        expect(img.classList.contains('image-loaded')).toBe(true);
    });

    it('should use parent width when element width is percentage based', function() {
        const parent = createParent(250);
        const img = createImageElement({ widthStyle: '100%', parent: parent });

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(mock.src).toBe('image-250x0.jpg');

        mock.width = 250;
        mock.onload();

        expect(img.getAttribute('width')).toBe('250');
    });

    it('should not process images when checkVisible returns false', function() {
        window.checkVisible.and.returnValue(false);
        createImageElement();

        loadLazyImage();

        expect(createdImages.length).toBe(0);
    });

    it('should skip already queued images', function() {
        createImageElement({ queue: 'loading' });

        loadLazyImage();

        expect(createdImages.length).toBe(0);
    });

    it('should skip carousel images', function() {
        createImageElement({ classList: ['carousel_item_image'] });

        loadLazyImage();

        expect(createdImages.length).toBe(0);
    });

    it('should resize URLs when no-resize class is not present', function() {
        createImageElement({ dataset: { 'slazy-src': 'image-640x480.jpg' } });

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        expect(createdImages[0].src).toBe('image-100x0.jpg');
    });

    it('should not resize URLs when no-resize class is present', function() {
        createImageElement({ dataset: { 'slazy-src': 'image-640x480.jpg' }, classList: ['no-resize'] });

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        expect(createdImages[0].src).toBe('image-640x480.jpg');
    });
});
