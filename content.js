(function () {
	"use strict";

	function convertShortsToWatch(url) {
		if (url && url.includes("https://www.youtube.com/shorts/")) {
			const match = url.match(
				/https:\/\/www\.youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
			);
			if (match && match[1]) {
				const videoId = match[1];
				return `https://www.youtube.com/watch?v=${videoId}`;
			}
		}
		return url;
	}

	function handleDirectShortsNavigation() {
		if (window.location.href.includes("/shorts/")) {
			const convertedUrl = convertShortsToWatch(window.location.href);
			if (convertedUrl !== window.location.href) {
				window.location.replace(convertedUrl);
				return;
			}
		}
	}

	function processLinks() {
		const links = document.querySelectorAll('a[href*="/shorts/"]');

		links.forEach((link) => {
			if (link.hasAttribute("data-shorts-converted")) {
				return;
			}

			link.setAttribute("data-shorts-converted", "true");

			const originalHref = link.href;
			const convertedHref = convertShortsToWatch(originalHref);

			Object.defineProperty(link, "href", {
				get: function () {
					return convertedHref;
				},
				set: function (value) {
					const converted = convertShortsToWatch(value);
					this.setAttribute("href", converted);
				},
				configurable: true,
			});

			// when user hovers over a short it should show the converted URL
			link.setAttribute("href", convertedHref);

			// all clicks
			link.addEventListener(
				"click",
				function (e) {
					e.preventDefault();
					e.stopPropagation();
					if (e.ctrlKey || e.metaKey || e.shiftKey) {
						window.open(convertedHref, "_blank", "noopener,noreferrer");
					} else {
						window.location.assign(convertedHref);
					}
					return false;
				},
				true,
			);

			// middle click and ctrl/cmd + left click
			link.addEventListener(
				"mousedown",
				function (e) {
					if (
						e.button === 0 ||
						e.button === 1 ||
						(e.button === 0 && (e.ctrlKey || e.metaKey))
					) {
						link.href = convertedHref;
					}
				},
				true,
			);

			// context menu
			link.addEventListener(
				"contextmenu",
				function (e) {
					link.href = convertedHref;
				},
				true,
			);
		});
	}

	function observeChanges() {
		processLinks();

		let pending = false;

		function debouncedProcessLinks() {
			if (pending) return;
			pending = true;
			queueMicrotask(() => {
				pending = false;
				processLinks();
			});
		}

		const observer = new MutationObserver((mutations) => {
			for (const m of mutations) {
				for (const node of m.addedNodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						if (
							node.tagName === "A" &&
							node.href &&
							node.href.includes("/shorts/")
						) {
							debouncedProcessLinks();
							return;
						}

						const a = node.querySelector("a[href*='/shorts/']");
						if (a) {
							debouncedProcessLinks();
							return;
						}
					}
				}
			}
		});

		const targetRoot = document.querySelector("ytd-app") || document.body;

		observer.observe(targetRoot, {
			childList: true,
			subtree: true,
		});

		window.addEventListener("yt-navigate-start", debouncedProcessLinks);
		window.addEventListener("yt-navigate-finish", debouncedProcessLinks);
	}

	function setupUnifiedHistoryInterceptor() {
		const convert = convertShortsToWatch;

		const originalPushState = history.pushState;
		const originalReplaceState = history.replaceState;

		history.pushState = function (state, title, url) {
			const result = originalPushState.call(
				history,
				state,
				title,
				convert(url),
			);
			queueMicrotask(() =>
				window.dispatchEvent(new Event("yt-history-updated")),
			);
			return result;
		};

		history.replaceState = function (state, title, url) {
			const result = originalReplaceState.call(
				history,
				state,
				title,
				convert(url),
			);
			queueMicrotask(() =>
				window.dispatchEvent(new Event("yt-history-updated")),
			);
			return result;
		};

		window.addEventListener("yt-history-updated", () => {
			const current = window.location.href;
			if (current.includes("/shorts/")) {
				const converted = convert(current);
				if (converted !== current) {
					window.location.replace(converted);
				}
			}
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () {
			setupUnifiedHistoryInterceptor();
			handleDirectShortsNavigation();
			observeChanges();
		});
	} else {
		setupUnifiedHistoryInterceptor();
		handleDirectShortsNavigation();
		observeChanges();
	}
})();
