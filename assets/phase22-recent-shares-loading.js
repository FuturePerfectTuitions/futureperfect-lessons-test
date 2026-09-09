(() => {
  const portal = document.getElementById('portal-screen');
  const panel = document.getElementById('recent-shares-panel');
  const list = document.getElementById('recent-shares-list');
  const subjectsMessage = document.getElementById('phase7-message');
  const lessonsScreen = document.getElementById('screen-lessons');
  const lessonList = document.getElementById('lesson-list');
  const lessonEmpty = document.getElementById('lesson-empty');

  if (!portal || !panel || !list) return;

  const LOADING_CLASS = 'phase22-recent-shares-loading';
  const LESSON_LOADING_MESSAGE = 'Loading your knowledge bank of lessons, hang on';
  const downstreamFetch = window.fetch.bind(window);
  let lessonRequestSerial = 0;
  let lessonLoadActive = false;
  let pendingLessonEmptyText = '';
  let writingLessonLoadingMessage = false;

  function clearLoading() {
    const loading = list.querySelector(`.${LOADING_CLASS}`);
    if (!loading) return;
    loading.remove();
    if (!list.children.length) panel.hidden = true;
  }

  function showLoading() {
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
    if (portal.hidden) {
      clearLoading();
      return;
    }
    showLoading();
  }

  function requestInfo(input, init) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      const url = new URL(raw, location.href);
      const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      return { url, method };
    } catch {
      return null;
    }
  }

  function isViewLessonsRequest(info) {
    return Boolean(
      info &&
      info.method === 'GET' &&
      /^\/api\/v1\/student\/views\/[^/]+\/lessons$/.test(info.url.pathname)
    );
  }

  function writeLessonLoadingMessage() {
    if (!lessonEmpty || !lessonsScreen || lessonsScreen.hidden) return;
    if (lessonList?.children.length) {
      lessonEmpty.hidden = true;
      return;
    }

    writingLessonLoadingMessage = true;
    lessonEmpty.textContent = LESSON_LOADING_MESSAGE;
    lessonEmpty.hidden = false;
    lessonEmpty.setAttribute('role', 'status');
    lessonEmpty.setAttribute('aria-live', 'polite');
    writingLessonLoadingMessage = false;
  }

  function finishLessonLoading() {
    lessonLoadActive = false;
    if (!lessonEmpty) return;

    lessonEmpty.removeAttribute('role');
    lessonEmpty.removeAttribute('aria-live');

    if (lessonList?.children.length) {
      lessonEmpty.hidden = true;
      pendingLessonEmptyText = '';
      return;
    }

    if (pendingLessonEmptyText) {
      lessonEmpty.textContent = pendingLessonEmptyText;
      lessonEmpty.hidden = false;
      pendingLessonEmptyText = '';
      return;
    }

    if (lessonEmpty.textContent.trim() === LESSON_LOADING_MESSAGE) {
      lessonEmpty.textContent = '';
      lessonEmpty.hidden = true;
    }
  }

  window.fetch = async (input, init) => {
    const info = requestInfo(input, init);
    if (!isViewLessonsRequest(info)) return downstreamFetch(input, init);

    const serial = ++lessonRequestSerial;
    lessonLoadActive = true;
    pendingLessonEmptyText = '';
    writeLessonLoadingMessage();

    try {
      return await downstreamFetch(input, init);
    } finally {
      window.setTimeout(() => {
        if (serial !== lessonRequestSerial) return;
        finishLessonLoading();
      }, 150);
    }
  };

  const portalObserver = new MutationObserver(syncPortalVisibility);
  portalObserver.observe(portal, { attributes: true, attributeFilter: ['hidden'] });

  if (subjectsMessage) {
    const messageObserver = new MutationObserver(() => {
      if (
        subjectsMessage.hidden === false &&
        /temporarily unavailable/i.test(subjectsMessage.textContent || '')
      ) {
        clearLoading();
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

  if (lessonsScreen && lessonEmpty) {
    const lessonObserver = new MutationObserver(() => {
      if (!lessonLoadActive) return;

      const text = lessonEmpty.textContent.trim();
      if (!writingLessonLoadingMessage && text && text !== LESSON_LOADING_MESSAGE) {
        pendingLessonEmptyText = text;
      }
      writeLessonLoadingMessage();
    });

    lessonObserver.observe(lessonsScreen, {
      attributes: true,
      attributeFilter: ['hidden'],
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  syncPortalVisibility();
})();
