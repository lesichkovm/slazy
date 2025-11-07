(function() {
    'use strict';

    function fetchSlazySource() {
        if (fetchSlazySource._cache) {
            return fetchSlazySource._cache;
        }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '../slazy.js', false);
        xhr.send(null);
        fetchSlazySource._cache = xhr.responseText;
        return fetchSlazySource._cache;
    }

    function instantiateSlazyInSandbox(overrides) {
        var sandbox = Object.assign({
            module: { exports: {} },
            exports: {},
            console: console,
            setInterval: jasmine.createSpy('setInterval'),
            clearInterval: jasmine.createSpy('clearInterval'),
            document: undefined,
            window: undefined,
            globalThis: undefined,
            self: undefined
        }, overrides || {});

        var source = fetchSlazySource();
        var factory = new Function('sandbox', "with (sandbox) { " + source + "\nreturn module.exports || sandbox.Slazy;\n}");
        var api = factory.call(sandbox, sandbox);
        return { api: api, sandbox: sandbox };
    }

    describe('Slazy bootstrap guard', function() {
        it('should not start polling when DOM APIs are unavailable', function() {
            var intervalSpy = jasmine.createSpy('setInterval');
            var result = instantiateSlazyInSandbox({
                setInterval: intervalSpy,
                clearInterval: jasmine.createSpy('clearInterval'),
                document: undefined,
                window: undefined,
                globalThis: undefined,
                self: undefined
            });

            expect(intervalSpy).not.toHaveBeenCalled();
            expect(result.api._internals.imageInterval).toBeNull();
            expect(result.api._internals.urlInterval).toBeNull();
        });

        it('should start polling when DOM APIs are available', function() {
            var intervalSpy = jasmine.createSpy('setInterval').and.returnValue('poll-handle');
            var clearIntervalSpy = jasmine.createSpy('clearInterval');
            var fakeDocument = {
                querySelectorAll: function() {
                    return [];
                },
                documentElement: {
                    clientHeight: 0
                }
            };
            var fakeWindow = { innerHeight: 0 };

            var result = instantiateSlazyInSandbox({
                setInterval: intervalSpy,
                clearInterval: clearIntervalSpy,
                document: fakeDocument,
                window: fakeWindow,
                globalThis: undefined,
                self: undefined
            });

            expect(intervalSpy).toHaveBeenCalledWith(jasmine.any(Function), jasmine.any(Number));

            result.api.stopPolling();
            expect(clearIntervalSpy).toHaveBeenCalledWith('poll-handle');
        });
    });
})();
