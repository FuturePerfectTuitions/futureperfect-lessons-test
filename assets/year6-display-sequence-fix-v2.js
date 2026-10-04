(() => {
  const root = document.getElementById('app');
  if (!root) return;

  const MARKER = 'YEAR6_STANDALONE_VISIBLE_ORDER_GUARD_V2_20261004';
  let applying = false;

  function codeForRow(row) {
    return String(row.querySelector('.lesson-code')?.textContent || '').trim();
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

  function applyYear6Order() {
    if (applying) return;

    const rows = [...root.querySelectorAll('.lesson-row')];
    if (!rows.length) return;

    const parents = [...new Set(rows.map(row => row.parentElement).filter(Boolean))];
    for (const parent of parents) {
      const directRows = [...parent.children].filter(node => node.classList?.contains('lesson-row'));
      const hasYear6Codes = directRows.some(row => /^Y6(?:T[123]M\d+|(?:SM|MS)\d+)$/i.test(codeForRow(row)));
      if (!hasYear6Codes) continue;

      const normalRows = directRows
        .filter(row => /^Y6T[123]M\d+$/i.test(codeForRow(row)))
        .sort(compareRows);
      const satsRows = directRows
        .filter(row => /^Y6(?:SM|MS)\d+$/i.test(codeForRow(row)))
        .sort(compareRows);
      const otherRows = directRows.filter(row => !/^Y6(?:T[123]M\d+|(?:SM|MS)\d+)$/i.test(codeForRow(row)));

      const desired = [...normalRows, ...satsRows, ...otherRows];
      if (
        directRows.length === desired.length &&
        directRows.every((node, index) => node === desired[index])
      ) continue;

      applying = true;
      try {
        for (const node of desired) parent.appendChild(node);
      } finally {
        applying = false;
      }
    }
  }

  const observer = new MutationObserver(() => queueMicrotask(applyYear6Order));
  observer.observe(root, { childList: true, subtree: true, characterData: true });

  window.__FPT_YEAR6_ORDER_GUARD__ = MARKER;
  applyYear6Order();
})();
