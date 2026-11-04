(() => {
  'use strict';
  // Presentation-only: preserve the Year 4/Year 5 lesson entitlements.
  // Kiaan's equivalent 11+ curricula are available under L1 and L2.
  const root = document.getElementById('app');
  if (!root) return;
  let applying = false;
  function apply() {
    if (applying) return;
    const greeting = String(root.querySelector('.topbar .greeting')?.textContent || '').trim();
    const heading = String(root.querySelector('.main > .card > h1')?.textContent || '').trim();
    if (greeting !== "Kiaan's Portal" || heading !== 'Maths') return;
    const cards = Array.from(root.querySelectorAll('.view-grid .view-card[data-view]'));
    const labels = new Set(cards.map(card => String(card.querySelector('.view-label')?.textContent || '').trim().toLowerCase()));
    if (!labels.has('l1') || !labels.has('l2')) return;
    applying = true;
    try {
      for (const card of cards) {
        const label = String(card.querySelector('.view-label')?.textContent || '').trim().toLowerCase();
        if (label === 'year 4' || label === 'year 5') card.remove();
      }
    } finally {
      applying = false;
    }
  }
  new MutationObserver(apply).observe(root, { childList: true, subtree: true });
  apply();
})();
