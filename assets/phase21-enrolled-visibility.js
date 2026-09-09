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

    // Do not overwrite the genuine in-flight loading state. A Year/Level click
    // opens the lesson screen before the API response arrives, so the list is
    // legitimately empty for a moment. Treating that transient state as "no
    // lessons" is misleading and was exactly what parents/students were seeing.
    if (/^Loading\b/i.test(String(lessonEmpty.textContent || '').trim())) {
      lessonEmpty.hidden = false;
      return;
    }

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
