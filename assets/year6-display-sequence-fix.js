(() => {
  const lessonList = document.getElementById('lesson-list');
  const lessonsHeading = document.getElementById('lessons-heading');
  const viewGrid = document.getElementById('view-grid');
  const viewsHeading = document.getElementById('views-heading');
  const viewsIntro = document.querySelector('#screen-views .phase5-subject-intro');
  const backToSubjects = document.getElementById('back-to-subjects');
  const base = String(window.FPT_V2_CONFIG?.workerBaseUrl || '').replace(/\/$/, '');
  if (!lessonList || !lessonsHeading || !viewGrid || !viewsHeading) return;

  const SECTION_KEY = 'fpt_y6_portal_section';
  const YEAR6_11PLUS_ONLY_CODES = new Set([
    'MATHS_L3_11P_T2M25_2026',
    'MATHS_L3_11P_T3M43_2026'
  ]);

  let applyingCards = false;
  let applyingLessons = false;
  let pendingYear6Section = '';
  let satsOpenCountPromise = null;
  let allowYear6BaseOpen = false;
  let year6MenuState = null;

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

  function setCardMeta(card, value) {
    const node = card?.querySelector('.phase6-view-card-meta') || null;
    if (node) node.textContent = value;
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

  function wireYear6Direct(card, section) {
    if (!card) return;
    card.dataset.fptYear6Direct = 'true';
    card.dataset.fptYear6Section = section;
    if (card.dataset.fptYear6DirectWired === 'true') return;
    card.dataset.fptYear6DirectWired = 'true';
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

  function findCard(cards, matcher) {
    return cards.find(card => matcher.test(cardTitle(card))) || null;
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

  function submenuCard(source, title, meta, onClick) {
    const card = source.cloneNode(true);
    card.hidden = false;
    card.removeAttribute('hidden');
    card.removeAttribute('data-fpt-year6-parent');
    card.removeAttribute('data-fpt-year6-parent-wired');
    card.removeAttribute('data-fpt-year6-direct');
    card.removeAttribute('data-fpt-year6-direct-wired');
    card.removeAttribute('data-fpt-year6-section');
    card.removeAttribute('data-fpt-clear-y6-section');
    setCardTitle(card, title);
    setCardMeta(card, meta);
    card.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return card;
  }

  function restoreYear6Menu() {
    if (!year6MenuState) return;
    const state = year6MenuState;
    year6MenuState = null;
    viewGrid.replaceChildren(...state.rootNodes);
    viewsHeading.textContent = state.heading;
    if (viewsIntro) viewsIntro.textContent = state.intro;
    if (backToSubjects) backToSubjects.textContent = state.backLabel;
    setSection('');
  }

  function showYear6Menu(baseCard, satsCard) {
    if (year6MenuState || !baseCard || !satsCard) return;

    const rootNodes = [...viewGrid.childNodes];
    const heading = String(viewsHeading.textContent || 'Maths');
    const intro = String(viewsIntro?.textContent || 'Choose a year or level.');
    const backLabel = String(backToSubjects?.textContent || '← Subjects');

    const lessonsCard = submenuCard(baseCard, 'Lessons', 'Year 6 teaching lessons', () => {
      setSection('lessons');
      allowYear6BaseOpen = true;
      baseCard.click();
    });
    const satsMenuCard = submenuCard(satsCard, 'SATS', 'SATs lessons', () => {
      setSection('sats');
      satsCard.click();
    });

    year6MenuState = { rootNodes, heading, intro, backLabel, baseCard, satsCard };
    viewsHeading.textContent = 'Year 6';
    if (viewsIntro) viewsIntro.textContent = 'Choose Lessons or SATS.';
    if (backToSubjects) backToSubjects.textContent = '← Maths';
    viewGrid.replaceChildren(lessonsCard, satsMenuCard);
  }

  function wireYear6Parent(baseCard, satsCard) {
    if (!baseCard || !satsCard) return;
    baseCard.dataset.fptYear6Parent = 'true';
    if (baseCard.dataset.fptYear6ParentWired === 'true') return;
    baseCard.dataset.fptYear6ParentWired = 'true';
    baseCard.addEventListener('click', event => {
      if (allowYear6BaseOpen) {
        allowYear6BaseOpen = false;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      showYear6Menu(baseCard, satsCard);
    }, true);
  }

  async function applyGridCards(grid) {
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
      if (serverSats) serverSats.hidden = false;

      if (year6Base) {
        if (serverSats) {
          year6Base.remove();
        } else {
          const satsOpen = await liveSatsOpenCount();
          if (satsOpen > 0) {
            setCardTitle(year6Base, 'SATS');
            setCardMeta(year6Base, `${satsOpen} open`);
            wireYear6Direct(year6Base, 'sats');
          } else {
            year6Base.remove();
          }
        }
      }
      if (serverSats) wireClearSection(serverSats);
    } else if (year6Base) {
      setCardTitle(year6Base, 'Year 6');
      if (serverSats) {
        serverSats.hidden = true;
        setCardMeta(year6Base, 'Lessons & SATS');
        wireYear6Parent(year6Base, serverSats);
      } else {
        wireYear6Direct(year6Base, 'lessons');
      }
    } else if (serverSats) {
      serverSats.hidden = false;
      wireClearSection(serverSats);
    }

    for (const card of directCards(grid)) {
      if (card.hidden) continue;
      if (card.dataset.fptYear6Parent === 'true') continue;
      if (card.dataset.fptYear6Direct === 'true') continue;
      wireClearSection(card);
    }
  }

  async function applyMathsCards() {
    if (applyingCards || year6MenuState) return;
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

  function isYear6ElevenPlusOnlyCode(code) {
    return YEAR6_11PLUS_ONLY_CODES.has(String(code || '').trim().toUpperCase());
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

    const hasYear6Codes = rows.some(row => {
      const code = codeForRow(row);
      return /^Y6(?:T[123]M\d+|(?:SM|MS)\d+)$/i.test(code) || isYear6ElevenPlusOnlyCode(code);
    });
    if (!hasYear6Codes) return;

    applyingLessons = true;
    try {
      if (section === 'sats') {
        lessonsHeading.textContent = 'SATS';
        for (const row of rows) if (!isSatsCode(codeForRow(row))) row.remove();
        for (const heading of lessonList.querySelectorAll(':scope > .phase6-lesson-section-heading')) heading.remove();
      } else if (section === 'lessons') {
        lessonsHeading.textContent = 'Lessons';
        for (const row of rows) {
          const code = codeForRow(row);
          if (isSatsCode(code) || isYear6ElevenPlusOnlyCode(code)) row.remove();
        }
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
    if (year6MenuState) restoreYear6Menu();
    setSection('');
    satsOpenCountPromise = null;
    queueMicrotask(() => { void applyMathsCards(); });
  }, true);

  document.getElementById('english-choice')?.addEventListener('click', () => {
    if (year6MenuState) restoreYear6Menu();
    setSection('');
  }, true);

  document.getElementById('back-to-views')?.addEventListener('click', () => {
    queueMicrotask(() => { void applyMathsCards(); });
  }, true);

  backToSubjects?.addEventListener('click', event => {
    if (year6MenuState) {
      event.preventDefault();
      event.stopImmediatePropagation();
      restoreYear6Menu();
      queueMicrotask(() => { void applyMathsCards(); });
      return;
    }
    setSection('');
  }, true);

  void applyMathsCards();
  applyYear6Lessons();
})();
