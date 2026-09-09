(() => {
  'use strict';

  const STABILITY_VERSION = '2026-09-09-protected-view-stability-v2';
  const nativeSetInterval = window.setInterval.bind(window);

  // Keep an already-rendered protected Answer Pack visible until the user closes
  // it. We suppress only the legacy 30-second protected-view lease heartbeat.
  // No DOM-wide MutationObserver is used here: that can create excessive work on
  // this highly dynamic page and make Chrome report the page as unresponsive.
  window.setInterval = function protectedViewStableInterval(handler, delay, ...args) {
    let source = '';
    try {
      source = typeof handler === 'function'
        ? Function.prototype.toString.call(handler)
        : String(handler || '');
    } catch (_) {}

    const protectedAnswerHeartbeat =
      Number(delay) === 30000 &&
      /status=1/.test(source) &&
      /(answer-view|viewerPath|LEASE_INVALID|checkViewerLease)/.test(source);

    if (protectedAnswerHeartbeat) return 0;
    return nativeSetInterval(handler, delay, ...args);
  };

  window.FPT_PROTECTED_VIEW_STABILITY = Object.freeze({ version: STABILITY_VERSION });
})();
