(() => {
  'use strict';

  const portal = document.getElementById('portal-screen');
  const panel = document.getElementById('recent-shares-panel');
  const list = document.getElementById('recent-shares-list');
  const subjectsMessage = document.getElementById('phase7-message');
  const lessonsScreen = document.getElementById('screen-lessons');
  const lessonEmpty = document.getElementById('lesson-empty');

  if (!portal || !panel || !list) return;

  const LOADING_CLASS = 'phase24-recent-shares-loading';
  const CORE_LESSON_LOADING = 'Loading lessons…';
  const FRIENDLY_LESSON_LOADING = 'Loading your knowledge bank of lessons, hang on';

  function clearRecentSharesLoading() {
    const loading = list.querySelector(`.${LOADING_CLASS}`);
    if (!loading) return;
    loading.remove();
    if (!list.children.length) panel.hidden = true;
  }

  function showRecentSharesLoading() {
    if (portal.hidden || list.children.length) return;

    const row = document.createElement('article');
    row.className = `phase20-recent-share-row ${LOADING_CLASS}`;
    row.setAttribute('role', 'status');
    row.setAttribute('aria-live', 'polite');

    const message = document.createElement('span');
    message.className = 'phase20-recent-share-link disabled';
    message.textContent = 'Loading your latest shares — hang on…';

    row.appendChild(message);
    list.appendChild(row);
    panel.hidden = false;
  }

  function syncPortalVisibility() {
    if (portal.hidden) clearRecentSharesLoading();
    else showRecentSharesLoading();
  }

  // No lesson-screen MutationObserver and no fetch wrapper here. The core portal
  // owns navigation and requests. We only replace its temporary loading copy once,
  // after a Year/Level card click has synchronously opened the lessons screen.
  document.addEventListener('click', event => {
    if (!event.target.closest('.phase6-view-card')) return;
    queueMicrotask(() => {
      if (!lessonsScreen || lessonsScreen.hidden || !lessonEmpty) return;
      if (lessonEmpty.textContent.trim() === CORE_LESSON_LOADING) {
        lessonEmpty.textContent = FRIENDLY_LESSON_LOADING;
      }
    });
  });

  const portalObserver = new MutationObserver(syncPortalVisibility);
  portalObserver.observe(portal, { attributes: true, attributeFilter: ['hidden'] });

  if (subjectsMessage) {
    const messageObserver = new MutationObserver(() => {
      if (
        subjectsMessage.hidden === false &&
        /temporarily unavailable/i.test(subjectsMessage.textContent || '')
      ) {
        clearRecentSharesLoading();
      }
    });
    messageObserver.observe(subjectsMessage, {
      attributes: true,
      attributeFilter: ['hidden'],
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  syncPortalVisibility();
  window.FPT_PHASE24_STABLE_LOADING = Object.freeze({ version: '2026-09-09-l3-stable-1' });
})();
