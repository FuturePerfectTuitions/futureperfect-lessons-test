(() => {
  'use strict';

  const WINDOW_KEY = 'fpt_v2_window_login_v2';
  const WINDOW_HEADER = 'X-FPT-Window-Token';
  const TRIAL_ENDED_TITLE = 'Your Future Perfect trial has now ended.';
  const TRIAL_ENDED_BODY = 'To continue accessing lessons and resources, please contact us to discuss the right programme for your child.';
  const TRIAL_MESSAGE = 'Trial access includes full lesson descriptions and lesson videos only.';
  const SUBJECT_PREVIEW_MESSAGE = 'Full access available to enrolled students of the subject only';
  const originalFetch = window.fetch.bind(window);

  let listModes = new Map();
  let currentDetail = null;
  let lastLoginError = '';
  let lastLoginErrorKind = '';
  let queued = false;

  function requestUrl(input) {
    try {
      if (typeof input === 'string') return new URL(input, window.location.href);
      if (input?.url) return new URL(input.url, window.location.href);
    } catch (_) {}
    return null;
  }

  function randomWindowToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function getWindowToken() {
    try { return sessionStorage.getItem(WINDOW_KEY) || ''; } catch (_) { return ''; }
  }

  function ensureWindowToken() {
    let token = getWindowToken();
    if (token) return token;
    token = randomWindowToken();
    try { sessionStorage.setItem(WINDOW_KEY, token); } catch (_) {}
    return token;
  }

  function clearWindowToken() {
    try { sessionStorage.removeItem(WINDOW_KEY); } catch (_) {}
  }

  function requestWithWindowToken(input, init, token) {
    if (input instanceof Request) {
      const headers = new Headers(input.headers);
      headers.set(WINDOW_HEADER, token);
      return [new Request(input, { ...(init || {}), headers })];
    }
    const options = { ...(init || {}) };
    const headers = new Headers(options.headers || {});
    headers.set(WINDOW_HEADER, token);
    options.headers = headers;
    return [input, options];
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

  function ensureTrialEndedStyles() {
    if (document.getElementById('phase19-trial-ended-styles')) return;
    const style = document.createElement('style');
    style.id = 'phase19-trial-ended-styles';
    style.textContent = `
      #login-error.phase19-trial-ended {
        color: #174c3a;
        background: #eef8f3;
        border-color: #b8dfce;
        font-weight: 400;
        line-height: 1.45;
        text-align: left;
      }
      #login-error.phase19-trial-ended strong {
        display: block;
        color: #0d3f2d;
        font-weight: 800;
        margin-bottom: 4px;
      }
      #login-error.phase19-trial-ended span {
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  function setTrialEndedState(body) {
    if (body?.error !== 'TRIAL_ACCESS_ENDED') return false;
    lastLoginErrorKind = 'trial-ended';
    lastLoginError = `${TRIAL_ENDED_TITLE} ${TRIAL_ENDED_BODY}`;
    queueApply();
    return true;
  }

  function clearTrialEndedState() {
    lastLoginError = '';
    lastLoginErrorKind = '';
    const error = document.getElementById('login-error');
    error?.classList.remove('phase19-trial-ended');
    if (error?.dataset?.phase19TrialEnded === '1') delete error.dataset.phase19TrialEnded;
  }

  window.fetch = async (input, init) => {
    const url = requestUrl(input);
    const studentApi = Boolean(url?.pathname?.startsWith('/api/v1/student/'));
    const login = url?.pathname === '/api/v1/student/auth/login';
    const logout = url?.pathname === '/api/v1/student/auth/logout';

    if (login) clearTrialEndedState();

    if (studentApi && !login && !getWindowToken()) {
      return new Response(JSON.stringify({ error: 'WINDOW_LOGIN_REQUIRED' }), {
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
      });
    }

    const response = await originalFetch(input, init);
    let studentBody = null;
    if (studentApi && (login || !response.ok)) {
      studentBody = await response.clone().json().catch(() => null);
      setTrialEndedState(studentBody);
    }

    if (login) {
      const body = studentBody || await response.clone().json().catch(() => null);
      if (body?.error !== 'TRIAL_ACCESS_ENDED') {
        lastLoginError = '';
        lastLoginErrorKind = '';
      }
      if (response.ok && body?.ok) {
        try { sessionStorage.setItem(WINDOW_KEY, 'authenticated'); } catch (_) {}
      } else {
        clearWindowToken();
      }
    } else if (studentApi && response.status === 401) {
      clearWindowToken();
    }

    if (logout && response.ok) clearWindowToken();

    if (/\/api\/v1\/student\/views\/[^/]+\/lessons$/.test(url?.pathname || '')) {
      response.clone().json().then(body => {
        listModes = new Map();
        for (const lesson of Array.isArray(body?.lessons) ? body.lessons : []) {
          const mode = String(lesson?.accessMode || '');
          if (!['trial', 'subject-preview'].includes(mode)) continue;
          for (const code of [lesson?.lessonId, lesson?.displayLessonId].map(String).filter(Boolean)) {
            listModes.set(code, mode);
          }
        }
        queueApply();
      }).catch(() => {});
    }

    if (/\/api\/v1\/student\/lessons\/[^/]+$/.test(url?.pathname || '')) {
      response.clone().json().then(body => {
        const mode = String(body?.lesson?.accessMode || '');
        currentDetail = ['trial', 'subject-preview'].includes(mode)
          ? {
              mode,
              lessonId: String(body.lesson.lessonId || ''),
              displayLessonId: String(body.lesson.displayLessonId || ''),
              message: String(body.lesson.accessMessage || (mode === 'trial' ? TRIAL_MESSAGE : SUBJECT_PREVIEW_MESSAGE))
            }
          : null;
        queueApply();
      }).catch(() => {});
    }

    return response;
  };

  function applyLoginError() {
    const error = document.getElementById('login-error');
    if (!error) return;

    if (lastLoginErrorKind !== 'trial-ended') {
      error.classList.remove('phase19-trial-ended');
      if (error.dataset.phase19TrialEnded === '1') delete error.dataset.phase19TrialEnded;
      return;
    }
    if (error.hidden) return;

    error.classList.add('phase19-trial-ended');
    if (error.dataset.phase19TrialEnded === '1') return;

    const title = document.createElement('strong');
    title.textContent = TRIAL_ENDED_TITLE;
    const body = document.createElement('span');
    body.textContent = TRIAL_ENDED_BODY;
    error.replaceChildren(title, body);
    error.dataset.phase19TrialEnded = '1';
  }

  function applyListLabels() {
    if (listModes.size === 0) return;
    const lessonList = document.getElementById('lesson-list');
    if (!lessonList) return;

    lessonList.querySelectorAll('.phase6-lesson-row').forEach(row => {
      const code = String(row.querySelector('.phase6-lesson-code')?.textContent || '').trim();
      const mode = listModes.get(code);
      if (!mode) return;
      const state = row.querySelector('.phase6-lesson-state');
      if (!state) return;

      if (mode === 'trial') {
        if (state.classList.contains('locked')) state.classList.remove('locked');
        setTextIfChanged(state, 'Trial video access');
      } else {
        if (!state.classList.contains('locked')) state.classList.add('locked');
        setTextIfChanged(state, '🔒 Subject not enrolled');
      }
    });
  }

  function applyDetail() {
    if (!currentDetail) return;
    const code = String(document.getElementById('lesson-code')?.textContent || '').trim();
    if (!code || ![currentDetail.lessonId, currentDetail.displayLessonId].includes(code)) return;

    const state = document.getElementById('lesson-state');
    if (state) {
      if (currentDetail.mode === 'trial') {
        if (state.classList.contains('locked')) state.classList.remove('locked');
        setTextIfChanged(state, 'Trial video access');
      } else {
        if (!state.classList.contains('locked')) state.classList.add('locked');
        setTextIfChanged(state, '🔒 Subject not enrolled');
      }
    }

    const note = document.getElementById('lesson-locked-note');
    if (note) {
      setTextIfChanged(note, currentDetail.message);
      setHiddenIfChanged(note, false);
    }
  }

  function apply() {
    applyLoginError();
    applyListLabels();
    applyDetail();
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

  ensureTrialEndedStyles();

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

  observe(document.getElementById('login-error'), {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['hidden']
  });

  queueApply();
})();
