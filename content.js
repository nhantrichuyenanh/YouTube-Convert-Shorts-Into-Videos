(function () {
  'use strict';

  try {
    const path = location.pathname || '';
    const m = path.match(/^\/shorts\/([^/?#]+)/i); // capture the ID part
    if (!m) return; // not a shorts URL

    const id = m[1];
    if (!id) return;

    const newUrl = new URL('/watch', location.origin);
    newUrl.searchParams.set('v', id);

    const oldParams = new URLSearchParams(location.search || '');

    // if the hash contains playtime info like t=12s, include those too
    if (location.hash) {
      const rawHash = location.hash.replace(/^#?!?/, '');
      try {
        const hashParams = new URLSearchParams(rawHash);
        for (const [k, v] of hashParams) {
          if (!oldParams.has(k)) oldParams.set(k, v);
        }
      } catch (e) {
      }
    }

    // keys to preserve from shorts to watch
    const keysToCopy = ['t', 'list', 'index'];

    for (const key of keysToCopy) {
      if (oldParams.has(key)) {
        newUrl.searchParams.set(key, oldParams.get(key));
      }
    }

    if (location.href !== newUrl.href) {
      location.replace(newUrl.href);
    }
  } catch (err) {
  }
})();