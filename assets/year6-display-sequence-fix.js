(() => {
  const lessonList = document.getElementById('lesson-list');
  const lessonsHeading = document.getElementById('lessons-heading');
  const viewGrid = document.getElementById('view-grid');
  const viewsHeading = document.getElementById('views-heading');
  const base = String(window.FPT_V2_CONFIG?.workerBaseUrl || '').replace(/\/$/, '');
  if (!lessonList || !lessonsHeading || !viewGrid || !viewsHeading) return;

  const SECTION_KEY = 'fpt_y6_portal_section';
  let applyingCards = false;
  let applyingLessons = false;
  let pendingYear6Section = '';
  let satsOpenCountPromise = null;

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

  function directCards(grid) {
    return [...grid.children].filter(child =>
      child.classList?.contains('phase6-view-card') && child.dataset.upsellPreview !== 'true'
    );
  }

  function logicalCardGrids() {
    const grids = [];
    if (directCards(viewGrid).length) grids.push(viewGrid);
    for (const grid of viewGrid.querySelectorAll('.phase6-view-grid')) {
      if (grid !== viewGrid && directCards(grid).length) grids.push(grid);
    }
    return grids;
  }

  function makeSatsClone(baseCard, grid) {
    let clone = directCards(grid).find(card => card.dataset.fptSyntheticSats === 'true') || null;
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

  function openCountFromCard(card) {
    const text = String(card?.querySelector('.phase6-view-card-meta')?.textContent || '');
    const match = text.match(/(\d+)\s+open/i);
    return match ? Number(match[1]) : 0;
  }

  async function liveSatsOpenCount() {
    if (!base) return 0;
    if (!satsOpenCountPromise) {
      satsOpenCountPromise = fetch(`${base}/api/v1/student/views/maths-sats/lessons`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
        cache: 'no-store'
      }).then(async response => {
        if (!response.ok) return 0;
        const body = await response.json().catch(() => null);
        if (!body?.ok || !Array.isArray(body.lessons)) return 0;
        return body.lessons.filter(row => row?.locked === false).length;
      }).catch(() => 0);
    }
    return satsOpenCountPromise;
  }

  async function applyGridCards(grid) {
    for (const card of directCards(grid)) {
      if (card.dataset.fptSyntheticSats === 'true') card.remove();
    }

    let cards = directCards(grid);
    if (!cards.length) return;

    const year4 = findCard(cards, /^Year\s*4$/i);
    const l1 = findCard(cards, /^(?:L1|Level\s*1(?:\s*\(11\+\))?)$/i);
    const year5 = findCard(cards, /^Year\s*5$/i);
    const l2 = findCard(cards, /^(?:L2|Level\s*2(?:\s*\(11\+\))?)$/i);

    if (year4 && l1) year4.remove();
    if (year5 && l2) year5.remove();

    cards = directCards(grid);
    const year6Base = findCard(cards, /^(?:Year\s*6|Lessons)$/i);
    const serverSats = findCard(cards, /^SATS$/i);
    const l3 = findCard(cards, /^(?:L3|Level\s*3(?:\s*\(11\+\))?)$/i);

    if (l3) {
      setCardTitle(l3, 'L3');
      wireClearSection(l3);

      if (year6Base) {
        if (serverSats) {
          year6Base.remove();
        } else {
          const satsOpen = await liveSatsOpenCount();
          if (satsOpen > 0) {
            setCardTitle(year6Base, 'SATS');
            const meta = year6Base.querySelector('.phase6-view-card-meta');
            if (meta) meta.textContent = `${satsOpen} open`;
            wireYear6Base(year6Base, 'sats');
          } else {
            year6Base.remove();
          }
        }
      }
      if (serverSats) wireClearSection(serverSats);
    } else if (year6Base) {
      setCardTitle(year6Base, 'Year 6');
      if (serverSats) {
        wireClearSection(year6Base);
        wireClearSection(serverSats);
      } else {
        wireYear6Base(year6Base, 'lessons');
        makeSatsClone(year6Base, grid);
      }
    } else if (serverSats) {
      wireClearSection(serverSats);
    }

    for (const card of directCards(grid)) {
      if (card.dataset.fptSyntheticSats === 'true') continue;
      if (card.dataset.fptYear6Base === 'true') continue;
      wireClearSection(card);
    }
  }

  async function applyMathsCards() {
    if (applyingCards) return;
    if (!/^Maths$/i.test(String(viewsHeading.textContent || '').trim())) return;

    applyingCards = true;
    try {
      const grids = logicalCardGrids();
      for (const grid of grids) await applyGridCards(grid);
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
        lessonsHeading.textContent = 'Year 6';
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

  const viewObserver = new MutationObserver(() => queueMicrotask(() => { void applyMathsCards(); }));
  viewObserver.observe(viewGrid, { childList: true, subtree: true, characterData: true });

  const lessonObserver = new MutationObserver(() => queueMicrotask(applyYear6Lessons));
  lessonObserver.observe(lessonList, { childList: true, subtree: true, characterData: true });

  document.getElementById('maths-choice')?.addEventListener('click', () => {
    setSection('');
    satsOpenCountPromise = null;
    queueMicrotask(() => { void applyMathsCards(); });
  }, true);
  document.getElementById('back-to-views')?.addEventListener('click', () => queueMicrotask(() => { void applyMathsCards(); }), true);
  document.getElementById('back-to-subjects')?.addEventListener('click', () => setSection(''), true);

  void applyMathsCards();
  applyYear6Lessons();
})();
