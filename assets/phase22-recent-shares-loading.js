(() => {
  const portal = document.getElementById('portal-screen');
  const panel = document.getElementById('recent-shares-panel');
  const list = document.getElementById('recent-shares-list');
  const subjectsMessage = document.getElementById('phase7-message');

  if (!portal || !panel || !list) return;

  const LOADING_CLASS = 'phase22-recent-shares-loading';

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

  syncPortalVisibility();
})();
