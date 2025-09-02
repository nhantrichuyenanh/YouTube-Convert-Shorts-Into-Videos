(function() {
    'use strict';

    function convertShortsToWatch(url) {
        if (url && url.includes('https://www.youtube.com/shorts/')) {
            // extract ID from shorts
            const match = url.match(/https:\/\/www\.youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                const videoId = match[1];
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        }
        return url;
    }

    // NEW: for hamburger menu/left sidebar
    function handleDirectShortsNavigation() {
        if (window.location.href.includes('/shorts/')) {
            const convertedUrl = convertShortsToWatch(window.location.href);
            if (convertedUrl !== window.location.href) {
                window.location.replace(convertedUrl);
                return;
            }
        }

        let lastUrl = window.location.href;

        const checkUrlChange = () => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;

                if (currentUrl.includes('/shorts/')) {
                    const convertedUrl = convertShortsToWatch(currentUrl);
                    if (convertedUrl !== currentUrl) {
                        window.location.replace(convertedUrl);
                        return;
                    }
                }
            }
        };

        const originalPushState = history.pushState;
        history.pushState = function(state, title, url) {
            const result = originalPushState.apply(this, arguments);
            setTimeout(checkUrlChange, 0);
            return result;
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = function(state, title, url) {
            const result = originalReplaceState.apply(this, arguments);
            setTimeout(checkUrlChange, 0);
            return result;
        };

        window.addEventListener('yt-navigate-start', checkUrlChange);
        window.addEventListener('yt-navigate-finish', checkUrlChange);
        window.addEventListener('popstate', checkUrlChange);

    }

    // must have or extension won't work
    function interceptYouTubeNavigation() {
        const originalPushState = history.pushState;
        history.pushState = function(state, title, url) {
            const convertedUrl = convertShortsToWatch(url);
            return originalPushState.call(history, state, title, convertedUrl);
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = function(state, title, url) {
            const convertedUrl = convertShortsToWatch(url);
            return originalReplaceState.call(history, state, title, convertedUrl);
        };
    }

    function processLinks() {
        const links = document.querySelectorAll('a[href*="/shorts/"]');

        links.forEach(link => {
            if (link.hasAttribute('data-shorts-converted')) {
                return;
            }

            link.setAttribute('data-shorts-converted', 'true');

            const originalHref = link.href;
            const convertedHref = convertShortsToWatch(originalHref);

            Object.defineProperty(link, 'href', {
                get: function() {
                    return convertedHref;
                },
                set: function(value) {
                    const converted = convertShortsToWatch(value);
                    this.setAttribute('href', converted);
                },
                configurable: true
            });

            // when user hovers over a short it should show the converted URL
            link.setAttribute('href', convertedHref);

            // all clicks
            link.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    window.open(convertedHref, '_blank', 'noopener,noreferrer');
                } else {
                    window.open(convertedHref, "_self");
                }
                return false;
            }, true);

            // middle click and ctrl/cmd + left click
            link.addEventListener('mousedown', function(e) {
              if (e.button === 0 || e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
                  link.setAttribute('href', convertedHref);
                  link.href = convertedHref;
              }
            }, true);

            // context menu
            link.addEventListener('contextmenu', function(e) {
                link.setAttribute('href', convertedHref);
                link.href = convertedHref;
            }, true);

        });
    }

    function observeChanges() {
        interceptYouTubeNavigation();
        processLinks();

        let processingTimeout;
        function debouncedProcessLinks() {
            clearTimeout(processingTimeout);
            processingTimeout = setTimeout(processLinks, 100);
        }

        const observer = new MutationObserver(function(mutations) {
            let hasRelevantChanges = false;

            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName !== 'href') {
                    continue;
                }

                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if ((node.tagName === 'A' && node.href && node.href.includes('/shorts/')) ||
                                (node.innerHTML && node.innerHTML.includes('/shorts/'))) {
                                hasRelevantChanges = true;
                                break;
                            }
                        }
                    }
                    if (hasRelevantChanges) break;
                }
            }

            if (hasRelevantChanges) {
                debouncedProcessLinks();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href']
        });

        window.addEventListener('yt-navigate-finish', debouncedProcessLinks);
        window.addEventListener('popstate', debouncedProcessLinks);
        window.addEventListener('yt-page-data-updated', debouncedProcessLinks);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            handleDirectShortsNavigation();
            observeChanges();
        });
    } else {
        handleDirectShortsNavigation();
        observeChanges();
    }
})();