(() => {
  'use strict';

  const config = window.FPT_V2_CONFIG || {};
  const base = String(config.workerBaseUrl || '').replace(/\/$/, '');
  if (!base) return;

  const upstreamFetch = window.fetch.bind(window);
  const CURRENT_EQUIVALENTS = Object.freeze([
    Object.freeze(['maths-year4', 'maths-level1']),
    Object.freeze(['maths-year5', 'maths-level2'])
  ]);

  function norm(value) {
    return String(value || '').trim().toLowerCase();
  }

  function requestUrl(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      return new URL(raw, window.location.href);
    } catch (_) {
      return null;
    }
  }

  function requestMethod(input, init) {
    return String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  }

  function isHomeRequest(input, init) {
    if (requestMethod(input, init) !== 'GET') return false;
    const url = requestUrl(input);
    if (!url) return false;
    try {
      return url.origin === new URL(base).origin && url.pathname === '/api/v1/student/home';
    } catch (_) {
      return false;
    }
  }

  function isCurrent(view) {
    return view?.group === 'current' || view?.current === true || (view?.group !== 'previous' && view?.current !== false);
  }

  function currentView(views, id) {
    const wanted = norm(id);
    return views.find(view => isCurrent(view) && norm(view?.viewId) === wanted) || null;
  }

  function countsFromRows(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const open = list.filter(row => row?.locked === false).length;
    return {
      visibleLessonCount: list.length,
      openLessonCount: open,
      lockedLessonCount: Math.max(0, list.length - open)
    };
  }

  async function loadSynthetic(viewId, signal) {
    try {
      const response = await upstreamFetch(
        `${base}/api/v1/student/views/${encodeURIComponent(viewId)}/lessons`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'include',
          cache: 'no-store',
          signal
        }
      );
      if (!response.ok) return null;
      const body = await response.json().catch(() => null);
      if (!body?.ok || !Array.isArray(body.lessons)) return null;
      return {
        ...(body.view || {}),
        ...countsFromRows(body.lessons),
        viewId,
        subject: 'maths',
        catalogueAvailable: true,
        lockedPreview: false,
        current: true,
        group: 'current'
      };
    } catch (_) {
      return null;
    }
  }

  function responseLike(response, body) {
    const headers = new Headers(response.headers);
    headers.set('content-type', 'application/json; charset=utf-8');
    headers.set('cache-control', 'no-store');
    headers.set('x-fpt-frontend-maths-equivalent-nav', 'frontend-home-normalizer-v1');
    headers.delete('content-length');
    return new Response(JSON.stringify(body), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  async function normalizeHome(response, signal) {
    if (!response?.ok) return response;
    const body = await response.clone().json().catch(() => null);
    if (!body?.ok || !Array.isArray(body.subjects)) return response;

    const maths = body.subjects.find(subject => norm(subject?.subject) === 'maths');
    if (!maths || !Array.isArray(maths.views)) return response;

    let views = [...maths.views];

    // Current Maths Year/L pairs are one curriculum presentation. If the
    // 11+ level exists, retain the L-level and remove the duplicate Year card.
    for (const [yearId, levelId] of CURRENT_EQUIVALENTS) {
      const yearView = currentView(views, yearId);
      const levelView = currentView(views, levelId);
      if (yearView && levelView) views = views.filter(view => view !== yearView);
    }

    const year6 = currentView(views, 'maths-year6');
    const l3 = currentView(views, 'maths-level3');
    const existingSats = currentView(views, 'maths-sats');
    const existingLessons = currentView(views, 'maths-year6-lessons');

    if (l3 && year6) {
      // A current L3 student must never receive a second Year 6 teaching card.
      // Only surface SATS separately when the live SATS subset actually has
      // released/prelesson access for this student.
      const sats = existingSats || await loadSynthetic('maths-sats', signal);
      views = views.filter(view => view !== year6);
      if (sats && Number(sats.openLessonCount || 0) > 0 && !existingSats) {
        sats.label = 'SATS';
        const l3Index = views.indexOf(l3);
        views.splice(Math.max(0, l3Index + 1), 0, sats);
      }
    } else if (year6 && !l3) {
      // Ordinary Year 6 is presented as two navigation surfaces backed by the
      // canonical Year 6 catalogue: teaching Lessons and SATS.
      const lessons = existingLessons || await loadSynthetic('maths-year6-lessons', signal);
      const sats = existingSats || await loadSynthetic('maths-sats', signal);
      const replacement = [];
      if (lessons) {
        lessons.label = 'Lessons';
        replacement.push(lessons);
      } else {
        replacement.push({ ...year6, viewId:'maths-year6-lessons', label:'Lessons' });
      }
      if (sats) {
        sats.label = 'SATS';
        replacement.push(sats);
      }
      const index = views.indexOf(year6);
      views.splice(index, 1, ...replacement);
    }

    maths.views = views;
    return responseLike(response, body);
  }

  window.fetch = async (input, init) => {
    const response = await upstreamFetch(input, init);
    return isHomeRequest(input, init)
      ? normalizeHome(response, init?.signal || (input instanceof Request ? input.signal : undefined))
      : response;
  };
})();
