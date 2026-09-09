(() => {
  'use strict';

  const PREVIEW_FLAG = 'fpt_v2_cross_subject_preview';
  const lessonList = document.getElementById('lesson-list');
  const lessonEmpty = document.getElementById('lesson-empty');
  const lessonSearch = document.getElementById('lesson-search');
  const viewGrid = document.getElementById('view-grid');

  let queued = false;

  function previewActive() {
    return sessionStorage.getItem(PREVIEW_FLAG) === '1';
  }

  function hideUnavailableEnrolledLessons() {
    if (!lessonList || previewActive()) return;

    for (const row of [...lessonList.querySelectorAll('.phase6-lesson-row')]) {
      const locked = Boolean(row.querySelector('.phase6-lesson-state.locked'));
      const unavailablePreLesson = row.classList.contains('phase6-lesson-row-unavailable');
      if (locked || unavailablePreLesson) row.remove();
    }

    const remaining = lessonList.querySelectorAll('.phase6-lesson-row').length;
    if (remaining > 0 || !lessonEmpty) return;

    const query = String(lessonSearch?.value || '').trim();
    lessonEmpty.textContent = query
      ? 'No available lessons match your search.'
      : 'No lessons are currently available in this Year or Level.';
    lessonEmpty.hidden = false;
  }

  function hideLockedCountsForEnrolledViews() {
    if (!viewGrid) return;

    for (const card of viewGrid.querySelectorAll('.phase6-view-card')) {
      if (card.dataset.upsellPreview === 'true') continue;

      const badge = card.querySelector('.phase6-lock-badge');
      const meta = card.querySelector('.phase6-view-card-meta');
      const previewMarker = Boolean(badge) || /locked preview|cross-subject locked preview/i.test(meta?.textContent || '');
      if (previewMarker || !meta) continue;

      const match = meta.textContent.match(/^(\d+)\s+available\s*·\s*\d+\s+locked$/i);
      if (!match) continue;

      const count = Number(match[1]);
      meta.textContent = `${count} available lesson${count === 1 ? '' : 's'}`;
    }
  }

  function apply() {
    hideLockedCountsForEnrolledViews();
    hideUnavailableEnrolledLessons();
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }

  if (lessonList) {
    new MutationObserver(queue).observe(lessonList, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  if (viewGrid) {
    new MutationObserver(queue).observe(viewGrid, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'data-upsell-preview']
    });
  }

  lessonSearch?.addEventListener('input', queue);
  document.addEventListener('click', event => {
    if (event.target.closest('.phase6-view-card, #back-to-views, #back-to-subjects, #maths-choice, #english-choice')) {
      queue();
    }
  });

  queue();
})();

(() => {
  'use strict';

  const STABILITY_VERSION = '2026-09-09-protected-view-stability-v1';
  const nativeSetInterval = window.setInterval.bind(window);

  // A protected Answer Pack has already passed its password gate before it is
  // rendered. Keep the rendered document visible until the user closes it rather
  // than invalidating an open viewer because its legacy lease heartbeat ends.
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

  const replaceMisleadingExpiry = root => {
    const nodes = [];
    if (root?.matches?.('.phase8-answer-invalid')) nodes.push(root);
    if (root?.querySelectorAll) nodes.push(...root.querySelectorAll('.phase8-answer-invalid'));

    for (const node of nodes) {
      if (/This protected open expired\. Close it and enter your password again\./i.test(node.textContent || '')) {
        node.textContent = 'This protected answer could not be loaded. Close it and try opening it again.';
      }
    }
  };

  const observer = new MutationObserver(records => {
    for (const record of records) {
      replaceMisleadingExpiry(record.target);
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) replaceMisleadingExpiry(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });

  replaceMisleadingExpiry(document);
  window.FPT_PROTECTED_VIEW_STABILITY = Object.freeze({ version: STABILITY_VERSION });
})();
