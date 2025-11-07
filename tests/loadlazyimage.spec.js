describe('loadLazyImage', function() {
    let fixture;
    let originalSetInterval;
    let originalClearInterval;
    let originalImage;
    let originalCheckVisible;
    let createdImages;
    let loadLazyImage;
    let internals;

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
        const rectValue = Object.assign(defaults, rect);
        if (element.getBoundingClientRect && element.getBoundingClientRect.and && typeof element.getBoundingClientRect.and.returnValue === 'function') {
            element.getBoundingClientRect.and.returnValue(rectValue);
        } else {
            spyOn(element, 'getBoundingClientRect').and.returnValue(rectValue);
        }
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

        Slazy.stop();

        loadLazyImage = Slazy.loadLazyImage;
        internals = Slazy._internals;

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

        originalCheckVisible = Slazy.checkVisible;
        spyOn(Slazy, 'checkVisible').and.returnValue(true);

        internals.imageInterval = null;
        internals.urlInterval = null;
    });

    afterEach(function() {
        if (fixture && fixture.parentNode) {
            fixture.parentNode.removeChild(fixture);
        }

        window.setInterval = originalSetInterval;
        window.clearInterval = originalClearInterval;
        window.Image = originalImage;

        Slazy.checkVisible = originalCheckVisible;
        originalCheckVisible = undefined;
        Slazy.stop();
        createdImages = [];
    });

    it('should do nothing if no lazy images found', function() {
        internals.imageInterval = 'lazy-images-handle';
        loadLazyImage();
        expect(window.clearInterval).toHaveBeenCalledWith('lazy-images-handle');
        expect(internals.imageInterval).toBeNull();
        expect(createdImages.length).toBe(0);
    });

    it('should skip elements without real width', function() {
        const parent = createParent(0);
        parent.style.width = '0px';
        createImageElement({ widthStyle: '100%', parent: parent, rectWidth: 0 });

        loadLazyImage();

        expect(createdImages.length).toBe(0);
    });

    it('should skip elements without slazy-src data attribute', function() {
        createImageElement({ dataset: {}, widthStyle: '150px', rectWidth: 150 });

        loadLazyImage();

        expect(createdImages.length).toBe(0);
    });

    it('should load visible images without resizing by default', function() {
        const img = createImageElement();

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(img.dataset.queue).toBe('loading');
        expect(mock.src).toBe('image-640x480.jpg');

        mock.width = 150;
        mock.height = 75;
        mock.onload();

        expect(img.dataset.queue).toBeUndefined();
        expect(img.getAttribute('width')).toBe('150');
        expect(img.getAttribute('height')).toBe('75');
        expect(img.classList.contains('slazy-image-loaded')).toBe(true);
    });

    it('should reset queue markers when image load fails once', function() {
        const img = createImageElement();

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(img.dataset.queue).toBe('loading');

        mock.onerror();

        expect(img.dataset.queue).toBeUndefined();
        expect(img.dataset.retryCount).toBe('1');
        expect(img.classList.contains('slazy-load-failed')).toBe(false);
    });

    it('should mark element as failed after exceeding retry attempts', function() {
        const img = createImageElement();

        Slazy.checkVisible.and.returnValue(true);

        loadLazyImage();
        expect(createdImages.length).toBe(1);
        createdImages[0].onerror();

        // retry #2
        loadLazyImage();
        expect(createdImages.length).toBe(2);
        createdImages[1].onerror();

        // retry #3
        loadLazyImage();
        expect(createdImages.length).toBe(3);
        createdImages[2].onerror();

        expect(img.dataset.queue).toBe('failed');
        expect(img.dataset.retryCount).toBe('3');
        expect(img.classList.contains('slazy-load-failed')).toBe(true);

        loadLazyImage();
        expect(createdImages.length).toBe(3);
    });

    it('should clear retry state after successful load', function() {
        const img = createImageElement();

        loadLazyImage();
        createdImages[0].onerror();

        loadLazyImage();
        const retryMock = createdImages[1];
        retryMock.width = 320;
        retryMock.height = 160;
        retryMock.onload();

        expect(img.dataset.queue).toBeUndefined();
        expect(img.dataset.retryCount).toBeUndefined();
        expect(img.classList.contains('slazy-load-failed')).toBe(false);
        expect(img.classList.contains('slazy-image-loaded')).toBe(true);
    });

    it('should allow reloading when slazy-src changes after successful load', function() {
        const img = createImageElement();

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        const firstMock = createdImages[0];

        firstMock.width = 200;
        firstMock.onload();

        expect(img.dataset.queue).toBeUndefined();

        img.classList.remove('slazy-image-loaded');
        img.setAttribute('data-slazy-src', 'image-320x240.jpg');
        stubRect(img, { width: 320 });

        loadLazyImage();

        expect(createdImages.length).toBe(2);
        const secondMock = createdImages[1];
        expect(secondMock.src).toBe('image-320x240.jpg');
    });

    it('should use parent width when element width is percentage based', function() {
        const parent = createParent(250);
        const img = createImageElement({ widthStyle: '100%', parent: parent });

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(mock.src).toBe('image-640x480.jpg');

        mock.width = 250;
        mock.onload();

        expect(img.getAttribute('width')).toBe('250');
    });

    it('should not process images when checkVisible returns false', function() {
        Slazy.checkVisible.and.returnValue(false);
        createImageElement();

        loadLazyImage();

        expect(createdImages.length).toBe(0);
    });

    it('should skip already queued images', function() {
        createImageElement({ queue: 'loading' });

        loadLazyImage();

        expect(createdImages.length).toBe(0);
    });

    it('should skip already processed images', function() {
        const absoluteUrl = new URL('image-120x0.jpg', window.location.href).href;
        const element = createImageElement({ dataset: { 'slazy-src': absoluteUrl }, rectWidth: 120, widthStyle: '120px' });
        element.src = absoluteUrl;
        element.setAttribute('src', absoluteUrl);

        loadLazyImage();

        expect(createdImages.length).toBe(0);
        expect(element.dataset.queue).toBeUndefined();
        expect(element.classList.contains('slazy-image-loaded')).toBe(false);
    });

    it('should skip carousel images', function() {
        createImageElement({ classList: ['carousel_item_image'] });

        loadLazyImage();

        expect(createdImages.length).toBe(0);
    });

    it('should resize URLs when slazy-resize class is present', function() {
        const element = createImageElement({ dataset: { 'slazy-src': 'image-640x480.jpg' }, classList: ['slazy-resize'] });
        element.setAttribute('width', '400');
        element.setAttribute('height', '200');

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        expect(createdImages[0].src).toBe('image-100x50.jpg');
    });

    it('should resize Unsplash-style query parameters for images', function() {
        const element = createImageElement({
            dataset: {
                'slazy-src': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&h=1000&q=80',
            },
            rectWidth: 240,
            widthStyle: '240px',
            classList: ['slazy-resize']
        });
        element.setAttribute('width', '1600');
        element.setAttribute('height', '1000');

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        expect(createdImages[0].src).toContain('w=240');
        expect(createdImages[0].src).toContain('h=150');
    });

    it('should not resize URLs when no-resize class is present', function() {
        createImageElement({ dataset: { 'slazy-src': 'image-640x480.jpg' }, classList: ['slazy-resize', 'slazy-no-resize'] });

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        expect(createdImages[0].src).toBe('image-640x480.jpg');
    });

    it('should force zero-height parameters when slazy-resize-zero class is present', function() {
        createImageElement({ dataset: { 'slazy-src': 'image-640x480.jpg' }, classList: ['slazy-resize-zero'] });

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        expect(createdImages[0].src).toBe('image-100x0.jpg');
    });

    it('should propagate measured height when available in slazy-resize mode', function() {
        const img = createImageElement({
            dataset: { 'slazy-src': 'image-640x480.jpg' },
            classList: ['slazy-resize'],
            rectWidth: 200,
            widthStyle: '200px'
        });
        img.setAttribute('width', '400');
        img.setAttribute('height', '200');

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        expect(createdImages[0].src).toBe('image-200x100.jpg');
    });

    it('should apply and clear placeholder styling when slazy-placeholder is present', function() {
        const img = createImageElement({ classList: ['slazy-placeholder'], rectWidth: 180, widthStyle: '180px' });

        expect(img.style.backgroundColor).toBe('');

        loadLazyImage();

        expect(createdImages.length).toBe(1);
        expect(img.dataset.placeholderActive).toBe('true');
        expect(img.classList.contains('slazy-placeholder-active')).toBe(true);
        expect(img.style.backgroundColor).not.toBe('');

        const mock = createdImages[0];
        mock.width = 180;
        mock.height = 90;
        mock.onload();

        expect(img.dataset.placeholderActive).toBeUndefined();
        expect(img.classList.contains('slazy-placeholder-active')).toBe(false);
        expect(img.style.backgroundColor).toBe('');
    });
});
