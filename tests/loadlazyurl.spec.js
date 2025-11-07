describe('loadLazyUrl', function() {
    let fixture;
    let originalSetInterval;
    let originalClearInterval;
    let originalCheckVisible;
    let originalImage;
    let createdImages;
    let loadLazyUrl;
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
        spyOn(element, 'getBoundingClientRect').and.returnValue(Object.assign(defaults, rect));
    }

    function createParent(width) {
        const parent = document.createElement('div');
        stubRect(parent, { width: width });
        fixture.appendChild(parent);
        return parent;
    }

    function createLazyElement(options = {}) {
        const {
            dataset = { 'slazy-url': 'background-640x480.jpg' },
            widthStyle = '100px',
            rectWidth,
            classList = [],
            queue,
            parentWidth,
            parent,
            initialBackground
        } = options;

        const element = document.createElement('div');
        Object.keys(dataset || {}).forEach(function(key) {
            const attrSuffix = key
                .replace(/([A-Z])/g, '-$1')
                .toLowerCase();
            element.setAttribute('data-' + attrSuffix, dataset[key]);
        });

        if (queue != null) {
            element.dataset.queue = queue;
        }

        if (typeof widthStyle === 'string') {
            element.style.width = widthStyle;
        }

        if (typeof initialBackground === 'string') {
            element.style.backgroundImage = initialBackground;
        }

        classList.forEach(function(cls) {
            element.classList.add(cls);
        });

        let effectiveWidth;
        if (typeof rectWidth === 'number') {
            effectiveWidth = rectWidth;
        } else if (typeof widthStyle === 'string' && widthStyle.endsWith('px')) {
            effectiveWidth = parseInt(widthStyle, 10);
        } else {
            effectiveWidth = 100;
        }

        stubRect(element, { width: effectiveWidth });

        let container = parent;
        if (!container && typeof parentWidth === 'number') {
            container = createParent(parentWidth);
        }

        (container || fixture).appendChild(element);
        return element;
    }

    beforeEach(function() {
        fixture = document.createElement('div');
        document.body.appendChild(fixture);

        Slazy.stop();

        loadLazyUrl = Slazy.loadLazyUrl;
        internals = Slazy._internals;

        originalSetInterval = window.setInterval;
        originalClearInterval = window.clearInterval;
        window.setInterval = jasmine.createSpy('setInterval');
        window.clearInterval = jasmine.createSpy('clearInterval');

        originalCheckVisible = Slazy.checkVisible;
        spyOn(Slazy, 'checkVisible').and.returnValue(true);

        createdImages = [];
        originalImage = window.Image;
        window.Image = jasmine.createSpy('Image').and.callFake(function() {
            const mock = { onload: null, onerror: null, src: '' };
            createdImages.push(mock);
            return mock;
        });

        internals.imageInterval = null;
        internals.urlInterval = null;
    });

    afterEach(function() {
        if (fixture && fixture.parentNode) {
            fixture.parentNode.removeChild(fixture);
        }

        window.setInterval = originalSetInterval;
        window.clearInterval = originalClearInterval;

        Slazy.checkVisible = originalCheckVisible;
        originalCheckVisible = undefined;
        window.Image = originalImage;
        createdImages = [];
        Slazy.stop();
    });

    it('should do nothing if no lazy URLs found', function() {
        internals.urlInterval = 'lazy-url-handle';
        loadLazyUrl();
        expect(window.clearInterval).toHaveBeenCalledWith('lazy-url-handle');
        expect(internals.urlInterval).toBeNull();
    });

    it('should skip elements without real width', function() {
        const parent = createParent(0);
        parent.style.width = '0px';
        const element = createLazyElement({ widthStyle: '100%', rectWidth: 0, parent: parent });

        loadLazyUrl();

        expect(element.dataset.queue).toBeUndefined();
        expect(element.style.backgroundImage).toBe('');
        expect(element.classList.contains('slazy-image-loaded')).toBe(false);
    });

    it('should load visible background images without resizing by default', function() {
        const element = createLazyElement({ widthStyle: '150px' });

        loadLazyUrl();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(mock.src).toBe('background-640x480.jpg');

        mock.onload();

        expect(element.dataset.queue).toBeUndefined();
        expect(element.style.backgroundImage).toContain('background-640x480.jpg');
        expect(element.classList.contains('slazy-image-loaded')).toBe(true);
    });

    it('should reset queue markers when background load fails', function() {
        const element = createLazyElement({ widthStyle: '140px' });

        loadLazyUrl();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(element.dataset.queue).toBe('loading');

        mock.onerror();

        expect(element.dataset.queue).toBeUndefined();
        expect(element.style.backgroundImage).toBe('');
        expect(element.classList.contains('slazy-image-loaded')).toBe(false);
    });

    it('should use parent width when element width is percentage based', function() {
        const parent = createParent(250);
        parent.style.width = '250px';
        const element = createLazyElement({ widthStyle: '100%', rectWidth: 0, parent: parent });

        loadLazyUrl();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(mock.src).toBe('background-640x480.jpg');

        mock.onload();

        expect(element.style.backgroundImage).toContain('background-640x480.jpg');
        expect(element.dataset.queue).toBeUndefined();
    });

    it('should not process elements when checkVisible returns false', function() {
        Slazy.checkVisible.and.returnValue(false);
        const element = createLazyElement({ widthStyle: '120px' });

        loadLazyUrl();

        expect(element.dataset.queue).toBeUndefined();
        expect(element.style.backgroundImage).toBe('');
        expect(element.classList.contains('slazy-image-loaded')).toBe(false);
    });

    it('should skip already queued elements', function() {
        const element = createLazyElement({ queue: 'loading', widthStyle: '120px' });

        loadLazyUrl();

        expect(element.dataset.queue).toBe('loading');
        expect(element.style.backgroundImage).toBe('');
        expect(element.classList.contains('image-loaded')).toBe(false);
    });

    it('should skip carousel elements', function() {
        const element = createLazyElement({ classList: ['carousel_item_image'], widthStyle: '120px' });

        loadLazyUrl();

        expect(element.dataset.queue).toBeUndefined();
        expect(element.style.backgroundImage).toBe('');
    });

    it('should resize URLs when slazy-resize class is present', function() {
        const element = createLazyElement({ widthStyle: '180px', classList: ['slazy-resize'], dataset: { 'slazy-url': 'background-640x480.jpg', 'slazy-height': '480' } });

        loadLazyUrl();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(mock.src).toBe('background-180x480.jpg');

        mock.onload();

        expect(element.style.backgroundImage).toContain('background-180x480.jpg');
    });

    it('should resize Unsplash-style query parameters for backgrounds', function() {
        const element = createLazyElement({
            widthStyle: '200px',
            rectWidth: 200,
            dataset: {
                'slazy-url': 'https://images.unsplash.com/photo-1523924836160-1f772f174db9?auto=format&fit=crop&w=1600&h=1000&q=80',
                'slazy-height': '1000'
            },
            classList: ['slazy-resize']
        });
        element.setAttribute('width', '1600');
        element.setAttribute('height', '1000');

        loadLazyUrl();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(mock.src).toContain('w=200');
        expect(mock.src).toContain('h=125');

        mock.onload();

        expect(element.style.backgroundImage).toContain('w=200');
        expect(element.style.backgroundImage).toContain('h=125');
    });

    it('should not resize URLs when no-resize class is present', function() {
        const element = createLazyElement({ classList: ['slazy-resize', 'slazy-no-resize'], widthStyle: '180px' });

        loadLazyUrl();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(mock.src).toBe('background-640x480.jpg');

        mock.onload();

        expect(element.style.backgroundImage).toContain('background-640x480.jpg');
    });

    it('should force zero-height parameters when slazy-resize-zero class is present', function() {
        const element = createLazyElement({ widthStyle: '180px', classList: ['slazy-resize-zero'], dataset: { 'slazy-url': 'background-640x480.jpg' } });

        loadLazyUrl();

        expect(createdImages.length).toBe(1);
        const mock = createdImages[0];
        expect(mock.src).toBe('background-180x0.jpg');

        mock.onload();

        expect(element.style.backgroundImage).toContain('background-180x0.jpg');
    });

    it('should apply and clear placeholder styling for backgrounds with slazy-placeholder', function() {
        const element = createLazyElement({ widthStyle: '200px', classList: ['slazy-placeholder'] });

        expect(element.style.backgroundColor).toBe('');

        loadLazyUrl();

        expect(createdImages.length).toBe(1);
        expect(element.dataset.placeholderActive).toBe('true');
        expect(element.classList.contains('slazy-placeholder-active')).toBe(true);
        expect(element.style.backgroundColor).not.toBe('');

        const mock = createdImages[0];
        mock.onload();

        expect(element.dataset.placeholderActive).toBeUndefined();
        expect(element.classList.contains('slazy-placeholder-active')).toBe(false);
        expect(element.style.backgroundColor).toBe('');
    });

    it('should skip already processed elements', function() {
        const url = 'background-150x0.jpg';
        const element = createLazyElement({ initialBackground: 'url("' + url + '")', dataset: { 'slazy-url': url }, widthStyle: '150px' });

        loadLazyUrl();

        expect(element.dataset.queue).toBeUndefined();
        expect(element.style.backgroundImage).toBe('url("' + url + '")');
        expect(element.classList.contains('image-loaded')).toBe(false);
    });
});
