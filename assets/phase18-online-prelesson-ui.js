(() => {
  'use strict';

  const PRELESSON_MESSAGE = 'Only PreLesson Sheets available to download and print. Other resources will be unlocked once the lesson is marked Completed.';
  const originalFetch = window.fetch.bind(window);
  let prelessonList = new Set();
  let currentDetail = null;
  let queued = false;

  function requestUrl(input) {
    try {
      if (typeof input === 'string') return new URL(input, window.location.href);
      if (input?.url) return new URL(input.url, window.location.href);
    } catch (_) {}
    return null;
  }

  function setTextIfChanged(element, text) {
    if (!element) return;
    const next = String(text || '');
    if (element.textContent !== next) element.textContent = next;
  }

  function setHiddenIfChanged(element, hidden) {
    if (!element) return;
    const next = Boolean(hidden);
    if (element.hidden !== next) element.hidden = next;
  }

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = requestUrl(args[0]);
    if (!url) return response;

    if (/\/api\/v1\/student\/views\/[^/]+\/lessons$/.test(url.pathname)) {
      response.clone().json().then(body => {
        prelessonList = new Set(
          (Array.isArray(body?.lessons) ? body.lessons : [])
            .filter(lesson => lesson?.accessMode === 'prelesson')
            .flatMap(lesson => [lesson?.lessonId, lesson?.displayLessonId].map(String).filter(Boolean))
        );
        queueApply();
      }).catch(() => {});
    }

    if (/\/api\/v1\/student\/lessons\/[^/]+$/.test(url.pathname)) {
      response.clone().json().then(body => {
        currentDetail = body?.lesson?.accessMode === 'prelesson'
          ? {
              lessonId: String(body.lesson.lessonId || ''),
              displayLessonId: String(body.lesson.displayLessonId || ''),
              message: PRELESSON_MESSAGE
            }
          : null;
        queueApply();
      }).catch(() => {});
    }
    return response;
  };

  function applyListLabels() {
    const lessonList = document.getElementById('lesson-list');
    if (!lessonList || prelessonList.size === 0) return;

    lessonList.querySelectorAll('.phase6-lesson-row').forEach(row => {
      const code = String(row.querySelector('.phase6-lesson-code')?.textContent || '').trim();
      if (!code || !prelessonList.has(code)) return;
      const state = row.querySelector('.phase6-lesson-state');
      if (!state) return;
      if (state.classList.contains('locked')) state.classList.remove('locked');
      setTextIfChanged(state, 'PreLesson only');
    });
  }

  function applyDetailMessage() {
    if (!currentDetail) return;
    const code = String(document.getElementById('lesson-code')?.textContent || '').trim();
    if (!code || ![currentDetail.lessonId, currentDetail.displayLessonId].includes(code)) return;

    const state = document.getElementById('lesson-state');
    if (state) {
      if (state.classList.contains('locked')) state.classList.remove('locked');
      setTextIfChanged(state, 'PreLesson only');
    }

    const note = document.getElementById('lesson-locked-note');
    if (note) {
      setTextIfChanged(note, currentDetail.message || PRELESSON_MESSAGE);
      setHiddenIfChanged(note, false);
    }
  }

  function apply() {
    applyListLabels();
    applyDetailMessage();
  }

  function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }

  function observe(target, options) {
    if (!target) return;
    new MutationObserver(queueApply).observe(target, options);
  }

  observe(document.getElementById('lesson-list'), {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class']
  });

  observe(document.getElementById('screen-lesson'), {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['hidden', 'class']
  });

  queueApply();
})();
