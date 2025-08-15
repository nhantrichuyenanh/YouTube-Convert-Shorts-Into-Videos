(function () {
  'use strict';

  try {
    const path = location.pathname || '';
    const m = path.match(/^\/shorts\/([^\/?#]+)/i); // capture everything after /shorts/
    if (!m) return;

    const rawIdAndMaybeParams = m[1];

    const parts = rawIdAndMaybeParams.split('&');
    const id = parts.shift();
    if (!id) return;

    const combined = new URLSearchParams(location.search || '');

    if (parts.length) {
      const paramsFromPath = new URLSearchParams(parts.join('&'));
      for (const [k, v] of paramsFromPath) {
        if (!combined.has(k)) combined.set(k, v);
      }
    }

    if (location.hash) {
      const rawHash = location.hash.replace(/^#?!?/, '');
      try {
        const hashParams = new URLSearchParams(rawHash);
        for (const [k, v] of hashParams) {
          if (!combined.has(k)) combined.set(k, v);
        }
      } catch (e) {
      }
    }

    const newUrl = new URL('/watch', location.origin);
    newUrl.searchParams.set('v', id);

    // params cause why not even tho shorts don't use them
    const commonKeys = ['t', 'list', 'index'];
    for (const key of commonKeys) {
      if (combined.has(key)) newUrl.searchParams.set(key, combined.get(key));
    }

    for (const [k, v] of combined) {
      if (k === 'v') continue;
      if (!newUrl.searchParams.has(k)) newUrl.searchParams.set(k, v);
    }

    if (location.href !== newUrl.href) {
      location.replace(newUrl.href);
    }
  } catch (err) {
  }
})();