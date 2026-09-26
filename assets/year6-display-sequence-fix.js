(() => {
  const lessonList = document.getElementById('lesson-list');
  const lessonsHeading = document.getElementById('lessons-heading');
  const viewGrid = document.getElementById('view-grid');
  const viewsHeading = document.getElementById('views-heading');
  if (!lessonList || !lessonsHeading || !viewGrid || !viewsHeading) return;

  const SECTION_KEY = 'fpt_y6_portal_section';
  const config = window.FPT_V2_CONFIG || {};
  const base = String(config.workerBaseUrl || '').replace(/\/$/, '');
  let applying = false;
  let pendingSyntheticSection = '';
  let cardsQueued = false;

  function codeForRow(row) {
    return String(row.querySelector('.phase6-lesson-code')?.textContent || '').trim();
  }

  function isSatsCode(code) {
    return /^Y6(?:SM|MS)(?:[1-9]|1[0-9])$/i.test(String(code || '').trim());
  }

  function rankForCode(code) {
    let match = /^Y6T([123])M(\d+)$/i.exec(code);
    if (match) {
      return { section: 0, term: Number(match[1]), lesson: Number(match[2]) };
    }
    match = /^Y6(?:SM|MS)(\d+)$/i.exec(code);
    if (match) {
      return { section: 1, term: 0, lesson: Number(match[1]) };
    }
    return { section: 2, term: Number.MAX_SAFE_INTEGER, lesson: Number.MAX_SAFE_INTEGER };
  }

  function compareRows(a, b) {
    const ra = rankForCode(codeForRow(a));
    const rb = rankForCode(codeForRow(b));
    return (
      ra.section - rb.section ||
      ra.term - rb.term ||
      ra.lesson - rb.lesson
    );
  }

  function setSection(value) {
    if (value) sessionStorage.setItem(SECTION_KEY, value);
    else sessionStorage.removeItem(SECTION_KEY);
  }

  function currentSection() {
    return String(sessionStorage.getItem(SECTION_KEY) || '').trim().toLowerCase();
  }

  function cardTitle(card) {
    return String(card?.querySelector('.phase6-view-card-title')?.textContent || '').trim();
  }

  function setCardTitle(card, title) {
    const node = card?.querySelector('.phase6-view-card-title');
    if (node) node.textContent = title;
  }

  function setCardMeta(card, count, fallback) {
    const node = card?.querySelector('.phase6-view-card-meta');
    if (!node) return;
    if (Number.isFinite(count)) {
      node.textContent = `${count} available lesson${count === 1 ? '' : 's'}`;
    } else if (fallback) {
      node.textContent = fallback;
    }
  }

  function wireBaseYear6Card(card, section) {
    if (!card || card.dataset.fptY6Wired === 'true') {
      if (card) card.dataset.fptY6Section = section;
      return;
    }
    card.dataset.fptY6Wired = 'true';
    card.dataset.fptY6Section = section;
    card.addEventListener('click', () => {
      const next = pendingSyntheticSection || card.dataset.fptY6Section || '';
      pendingSyntheticSection = '';
      setSection(next);
    }, true);
  }

  function wireOrdinaryCard(card) {
    if (!card || card.dataset.fptY6OrdinaryWired === 'true') return;
    card.dataset.fptY6OrdinaryWired = 'true';
    card.addEventListener('click', () => setSection(''), true);
  }

  function createSatsClone(baseCard) {
    let clone = viewGrid.querySelector('.phase6-view-card[data-fpt-y6-synthetic="sats"]');
    if (clone) return clone;
    clone = baseCard.cloneNode(true);
    clone.dataset.fptY6Synthetic = 'sats';
    clone.dataset.fptY6Section = 'sats';
    clone.removeAttribute('data-fpt-y6-wired');
    setCardTitle(clone, 'SATS');
    setCardMeta(clone, NaN, 'SATs lessons');
    clone.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      pendingSyntheticSection = 'sats';
      baseCard.click();
    });
    baseCard.insertAdjacentElement('afterend', clone);
    return clone;
  }

  async function refreshYear6Counts(year6Card, satsCard, splitNormalLessons) {
    if (!base || !year6Card) return;
    try {
      const response = await fetch(`${base}/api/v1/student/views/maths-year6/lessons`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok || !Array.isArray(body.lessons)) return;
      const available = body.lessons.filter(row => row?.locked === false);
      const satsCount = available.filter(row => isSatsCode(row?.displayLessonId || row?.lessonId)).length;
      const lessonCount = available.filter(row => !isSatsCode(row?.displayLessonId || row?.lessonId)).length;
      if (satsCard) setCardMeta(satsCard, satsCount);
      if (splitNormalLessons) setCardMeta(year6Card, lessonCount);
    } catch (_) {}
  }

  function applyViewCards() {
    if (!/maths/i.test(String(viewsHeading.textContent || ''))) return;

    const cards = [...viewGrid.querySelectorAll(':scope > .phase6-view-card')]
      .filter(card => card.dataset.upsellPreview !== 'true');
    if (!cards.length) return;

    const synthetic = cards.filter(card => card.dataset.fptY6Synthetic === 'sats');
    const realCards = cards.filter(card => card.dataset.fptY6Synthetic !== 'sats');
    const year6Card = realCards.find(card => /^Year\s*6$/i.test(cardTitle(card)) || card.dataset.fptY6Original === 'year6');
    const l3Card = realCards.find(card => /^(?:L3|Level\s*3(?:\s*\(11\+\))?)$/i.test(cardTitle(card)) || card.dataset.fptY6Original === 'l3');

    for (const card of realCards) {
      if (card !== year6Card && card !== l3Card) wireOrdinaryCard(card);
    }

    if (l3Card) {
      l3Card.dataset.fptY6Original = 'l3';
      setCardTitle(l3Card, 'L3');
      wireOrdinaryCard(l3Card);
    }

    if (!year6Card) {
      for (const card of synthetic) card.remove();
      return;
    }

    year6Card.dataset.fptY6Original = 'year6';

    if (l3Card) {
      // L3 and Year 6 are the same teaching curriculum for this cohort. The
      // Year 6-derived card exists only to carry direct SAT entitlement rows,
      // so present it as SATS rather than as a second curriculum choice.
      for (const card of synthetic) card.remove();
      setCardTitle(year6Card, 'SATS');
      wireBaseYear6Card(year6Card, 'sats');
      refreshYear6Counts(year6Card, year6Card, false);
      return;
    }

    // Ordinary Year 6: split one underlying Year 6 catalogue into two explicit
    // navigation choices without duplicating access: Lessons and SATS.
    setCardTitle(year6Card, 'Lessons');
    wireBaseYear6Card(year6Card, 'lessons');
    const satsCard = createSatsClone(year6Card);
    refreshYear6Counts(year6Card, satsCard, true);
  }

  function applyYear6SectionFilter() {
    const section = currentSection();
    if (!section) return;
    const rows = [...lessonList.querySelectorAll(':scope > .phase6-lesson-row')];
    if (!rows.length) return;

    const hasYear6Rows = rows.some(row => /^Y6(?:T[123]M\d+|(?:SM|MS)\d+)$/i.test(codeForRow(row)));
    if (!hasYear6Rows) return;

    if (section === 'sats') {
      lessonsHeading.textContent = 'SATS';
      for (const row of rows) {
        if (!isSatsCode(codeForRow(row))) row.remove();
      }
      for (const heading of lessonList.querySelectorAll(':scope > .phase6-lesson-section-heading')) heading.remove();
    } else if (section === 'lessons') {
      lessonsHeading.textContent = 'Lessons';
      for (const row of rows) {
        if (isSatsCode(codeForRow(row))) row.remove();
      }
      for (const heading of lessonList.querySelectorAll(':scope > .phase6-lesson-section-heading')) heading.remove();
    }
  }

  function applyYear6Order() {
    if (applying) return;
    applyYear6SectionFilter();

    const heading = String(lessonsHeading.textContent || '').trim();
    const rows = [...lessonList.querySelectorAll(':scope > .phase6-lesson-row')];
    const hasYear6Codes = rows.some(row => /^Y6(?:T[123]M\d+|(?:SM|MS)\d+)$/i.test(codeForRow(row)));
    if (!/year\s*6|lessons|sats/i.test(heading) || !hasYear6Codes) return;

    const normalRows = rows
      .filter(row => /^Y6T[123]M\d+$/i.test(codeForRow(row)))
      .sort(compareRows);
    const satsRows = rows
      .filter(row => isSatsCode(codeForRow(row)))
      .sort(compareRows);
    const otherRows = rows.filter(row => !/^Y6(?:T[123]M\d+|(?:SM|MS)\d+)$/i.test(codeForRow(row)));
    const satsHeading = lessonList.querySelector(':scope > .phase6-lesson-section-heading');

    const desired = [...normalRows];
    if (satsHeading && satsRows.length && currentSection() !== 'sats') desired.push(satsHeading);
    desired.push(...satsRows, ...otherRows);

    const current = [...lessonList.children].filter(node =>
      node.classList?.contains('phase6-lesson-row') ||
      node.classList?.contains('phase6-lesson-section-heading')
    );

    if (
      current.length === desired.length &&
      current.every((node, index) => node === desired[index])
    ) return;

    applying = true;
    try {
      for (const node of desired) lessonList.appendChild(node);
    } finally {
      applying = false;
    }
  }

  function queueCards() {
    if (cardsQueued) return;
    cardsQueued = true;
    queueMicrotask(() => {
      cardsQueued = false;
      applyViewCards();
    });
  }

  const lessonObserver = new MutationObserver(() => queueMicrotask(applyYear6Order));
  lessonObserver.observe(lessonList, { childList: true, subtree: true, characterData: true });

  const viewObserver = new MutationObserver(queueCards);
  viewObserver.observe(viewGrid, { childList: true, subtree: true, characterData: true });

  document.getElementById('maths-choice')?.addEventListener('click', () => {
    setSection('');
    queueCards();
  }, true);
  document.getElementById('back-to-views')?.addEventListener('click', queueCards, true);
  document.getElementById('back-to-subjects')?.addEventListener('click', () => setSection(''), true);

  queueCards();
  applyYear6Order();
})();
