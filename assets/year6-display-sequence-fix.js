(() => {
  const lessonList = document.getElementById('lesson-list');
  const lessonsHeading = document.getElementById('lessons-heading');
  if (!lessonList || !lessonsHeading) return;

  let applying = false;

  function codeForRow(row) {
    return String(row.querySelector('.phase6-lesson-code')?.textContent || '').trim();
  }

  function rankForCode(code) {
    let match = /^Y6T([123])M(\d+)$/i.exec(code);
    if (match) {
      return { section: 0, term: Number(match[1]), lesson: Number(match[2]) };
    }
    match = /^Y6MS(\d+)$/i.exec(code);
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

  function applyYear6Order() {
    if (applying) return;
    const heading = String(lessonsHeading.textContent || '').trim();
    const rows = [...lessonList.querySelectorAll(':scope > .phase6-lesson-row')];
    const hasYear6Codes = rows.some(row => /^Y6(?:T[123]M\d+|MS\d+)$/i.test(codeForRow(row)));
    if (!/year\s*6/i.test(heading) || !hasYear6Codes) return;

    const normalRows = rows
      .filter(row => /^Y6T[123]M\d+$/i.test(codeForRow(row)))
      .sort(compareRows);
    const satsRows = rows
      .filter(row => /^Y6MS\d+$/i.test(codeForRow(row)))
      .sort(compareRows);
    const otherRows = rows.filter(row => !/^Y6(?:T[123]M\d+|MS\d+)$/i.test(codeForRow(row)));
    const satsHeading = lessonList.querySelector(':scope > .phase6-lesson-section-heading');

    const desired = [...normalRows];
    if (satsHeading && satsRows.length) desired.push(satsHeading);
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

  const observer = new MutationObserver(() => queueMicrotask(applyYear6Order));
  observer.observe(lessonList, { childList: true, subtree: true, characterData: true });
  applyYear6Order();
})();
