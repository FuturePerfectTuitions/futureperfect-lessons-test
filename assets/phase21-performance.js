(() => {
  'use strict';

  // The portal begins loading /student/home immediately after login. If a student
  // clicks Maths or English before that request has finished, the legacy UI can
  // start the same expensive request a second time. Share one in-flight response
  // instead so subject clicks wait on work already in progress rather than
  // duplicating it.
  const originalFetch = window.fetch.bind(window);
  let homeInFlight = null;

  window.fetch = function fptPerformanceFetch(input, init) {
    let url;
    try {
      const raw = typeof input === 'string' || input instanceof URL ? input : input?.url;
      url = new URL(raw, window.location.href);
    } catch (_) {
      return originalFetch(input, init);
    }

    const requestMethod = String(
      init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
    ).toUpperCase();

    if (requestMethod !== 'GET' || url.pathname !== '/api/v1/student/home') {
      return originalFetch(input, init);
    }

    if (!homeInFlight) {
      homeInFlight = originalFetch(input, init)
        .finally(() => {
          // Clear only after callers queued during this request have received a
          // clone. A later genuine refresh will therefore still go to the Worker.
          setTimeout(() => { homeInFlight = null; }, 0);
        });
    }

    return homeInFlight.then(response => response.clone());
  };
})();
