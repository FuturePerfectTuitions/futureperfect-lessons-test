(() => {
  const lessonList = document.getElementById('lesson-list');
  const lessonsHeading = document.getElementById('lessons-heading');
  const viewGrid = document.getElementById('view-grid');
  const viewsHeading = document.getElementById('views-heading');
  if (!lessonList || !lessonsHeading || !viewGrid || !viewsHeading) return;

  const SECTION_KEY = 'fpt_y6_portal_section';
  let applyingCards = false;
  let applyingLessons = false;
  let pendingYear6Section = '';

  function titleNode(card) {
    return card?.querySelector('.phase6-view-card-title') || null;
  }

  function cardTitle(card) {
    return String(titleNode(card)?.textContent || '').trim();
  }

  function setCardTitle(card, value) {
    const node = titleNode(card);
    if (node && node.textContent !== value) node.textContent = value;
  }

  function setSection(value) {
    if (value) sessionStorage.setItem(SECTION_KEY, value);
    else sessionStorage.removeItem(SECTION_KEY);
  }

  function currentSection() {
    return String(sessionStorage.getItem(SECTION_KEY) || '').trim().toLowerCase();
  }

  function wireClearSection(card) {
    if (!card || card.dataset.fptClearY6Section === 'true') return;
    card.dataset.fptClearY6Section = 'true';
    card.addEventListener('click', () => setSection(''), true);
  }

  function wireYear6Base(card, section) {
    if (!card) return;
    card.dataset.fptYear6Base = 'true';
    card.dataset.fptYear6Section = section;
    if (card.dataset.fptYear6Wired === 'true') return;
    card.dataset.fptYear6Wired = 'true';
    card.addEventListener('click', () => {
      const next = pendingYear6Section || card.dataset.fptYear6Section || '';
      pendingYear6Section = '';
      setSection(next);
    }, true);
  }

  function makeSatsClone(baseCard) {
    let clone = viewGrid.querySelector(':scope > .phase6-view-card[data-fpt-synthetic-sats="true"]');
    if (clone) return clone;

    clone = baseCard.cloneNode(true);
    clone.dataset.fptSyntheticSats = 'true';
    clone.removeAttribute('data-fpt-year6-base');
    clone.removeAttribute('data-fpt-year6-wired');
    clone.removeAttribute('data-fpt-clear-y6-section');
    setCardTitle(clone, 'SATS');

    const meta = clone.querySelector('.phase6-view-card-meta');
    if (meta) meta.textContent = 'SATs lessons';

    clone.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      pendingYear6Section = 'sats';
      baseCard.click();
    });

    baseCard.insertAdjacentElement('afterend', clone);
    return clone;
  }

  function findCard(cards, matcher) {
    return cards.find(card => matcher.test(cardTitle(card))) || null;
  }

  function applyMathsCards() {
    if (applyingCards) return;
    if (!/^Maths$/i.test(String(viewsHeading.textContent || '').trim())) return;

    applyingCards = true;
    try {
      const oldSynthetic = [...viewGrid.querySelectorAll(':scope > .phase6-view-card[data-fpt-synthetic-sats="true"]')];
      for (const card of oldSynthetic) card.remove();

      let cards = [...viewGrid.querySelectorAll(':scope > .phase6-view-card')]
        .filter(card => card.dataset.upsellPreview !== 'true');
      if (!cards.length) return;

      const year4 = findCard(cards, /^Year\s*4$/i);
      const l1 = findCard(cards, /^(?:L1|Level\s*1(?:\s*\(11\+\))?)$/i);
      const year5 = findCard(cards, /^Year\s*5$/i);
      const l2 = findCard(cards, /^(?:L2|Level\s*2(?:\s*\(11\+\))?)$/i);
      const year6 = findCard(cards, /^(?:Year\s*6|Lessons|SATS)$/i);
      const l3 = findCard(cards, /^(?:L3|Level\s*3(?:\s*\(11\+\))?)$/i);

      // Maths Year 4 and L1 are the same curriculum surface. Never show both.
      if (year4 && l1) year4.remove();

      // Maths Year 5 and L2 are the same curriculum surface. Never show both.
      if (year5 && l2) year5.remove();

      // Maths Year 6 and L3 are the same curriculum surface. If L3 exists,
      // the Year 6-derived card is reserved solely for SATS direct releases.
      if (year6) {
        if (l3) {
          setCardTitle(l3, 'L3');
          wireClearSection(l3);
          setCardTitle(year6, 'SATS');
          wireYear6Base(year6, 'sats');
        } else {
          setCardTitle(year6, 'Lessons');
          wireYear6Base(year6, 'lessons');
          makeSatsClone(year6);
        }
      }

      cards = [...viewGrid.querySelectorAll(':scope > .phase6-view-card')];
      for (const card of cards) {
        if (card.dataset.fptSyntheticSats === 'true') continue;
        if (card.dataset.fptYear6Base === 'true') continue;
        wireClearSection(card);
      }
    } finally {
      applyingCards = false;
    }
  }

  function codeForRow(row) {
    return String(row.querySelector('.phase6-lesson-code')?.textContent || '').trim();
  }

  function isSatsCode(code) {
    return /^Y6(?:SM|MS)(?:[1-9]|1[0-9])$/i.test(String(code || '').trim());
  }

  function rankForCode(code) {
    let match = /^Y6T([123])M(\d+)$/i.exec(code);
    if (match) return { section: 0, term: Number(match[1]), lesson: Number(match[2]) };
    match = /^Y6(?:SM|MS)(\d+)$/i.exec(code);
    if (match) return { section: 1, term: 0, lesson: Number(match[1]) };
    return { section: 2, term: Number.MAX_SAFE_INTEGER, lesson: Number.MAX_SAFE_INTEGER };
  }

  function compareRows(a, b) {
    const left = rankForCode(codeForRow(a));
    const right = rankForCode(codeForRow(b));
    return left.section - right.section || left.term - right.term || left.lesson - right.lesson;
  }

  function applyYear6Lessons() {
    if (applyingLessons) return;
    const section = currentSection();
    const rows = [...lessonList.querySelectorAll(':scope > .phase6-lesson-row')];
    if (!rows.length) return;

    const hasYear6Codes = rows.some(row => /^Y6(?:T[123]M\d+|(?:SM|MS)\d+)$/i.test(codeForRow(row)));
    if (!hasYear6Codes) return;

    applyingLessons = true;
    try {
      if (section === 'sats') {
        lessonsHeading.textContent = 'SATS';
        for (const row of rows) if (!isSatsCode(codeForRow(row))) row.remove();
        for (const heading of lessonList.querySelectorAll(':scope > .phase6-lesson-section-heading')) heading.remove();
      } else if (section === 'lessons') {
        lessonsHeading.textContent = 'Lessons';
        for (const row of rows) if (isSatsCode(codeForRow(row))) row.remove();
        for (const heading of lessonList.querySelectorAll(':scope > .phase6-lesson-section-heading')) heading.remove();
      } else {
        const remaining = [...lessonList.querySelectorAll(':scope > .phase6-lesson-row')];
        const normal = remaining.filter(row => /^Y6T[123]M\d+$/i.test(codeForRow(row))).sort(compareRows);
        const sats = remaining.filter(row => isSatsCode(codeForRow(row))).sort(compareRows);
        const other = remaining.filter(row => !/^Y6(?:T[123]M\d+|(?:SM|MS)\d+)$/i.test(codeForRow(row)));
        for (const node of [...normal, ...sats, ...other]) lessonList.appendChild(node);
      }
    } finally {
      applyingLessons = false;
    }
  }

  const viewObserver = new MutationObserver(() => queueMicrotask(applyMathsCards));
  viewObserver.observe(viewGrid, { childList: true, subtree: true, characterData: true });

  const lessonObserver = new MutationObserver(() => queueMicrotask(applyYear6Lessons));
  lessonObserver.observe(lessonList, { childList: true, subtree: true, characterData: true });

  document.getElementById('maths-choice')?.addEventListener('click', () => {
    setSection('');
    queueMicrotask(applyMathsCards);
  }, true);
  document.getElementById('back-to-views')?.addEventListener('click', () => queueMicrotask(applyMathsCards), true);
  document.getElementById('back-to-subjects')?.addEventListener('click', () => setSection(''), true);

  applyMathsCards();
  applyYear6Lessons();
})();
