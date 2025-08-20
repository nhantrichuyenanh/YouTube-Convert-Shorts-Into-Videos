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

            link.setAttribute('data-shorts-converted', 'true'); // mark converted links

            const originalHref = link.href;
            const convertedHref = convertShortsToWatch(originalHref);

            Object.defineProperty(link, 'href', {
                get: function() {
                    return convertedHref;
                },
                set: function(value) { // YouTube may change the href dynamically
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

    // handle dynamically loaded content with enhanced interception
    function observeChanges() {
        interceptYouTubeNavigation();
        processLinks();

        // Debounce function to reduce excessive processing
        let processingTimeout;
        function debouncedProcessLinks() {
            clearTimeout(processingTimeout);
            processingTimeout = setTimeout(processLinks, 100);
        }

        // More targeted observer with reduced scope
        const observer = new MutationObserver(function(mutations) {
            let hasRelevantChanges = false;

            // Process mutations more efficiently
            for (const mutation of mutations) {
                // Skip irrelevant mutations early
                if (mutation.type === 'attributes' && mutation.attributeName !== 'href') {
                    continue;
                }

                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Quick check for shorts links without deep traversal
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
        document.addEventListener('DOMContentLoaded', observeChanges);
    } else {
        observeChanges();
    }
})();