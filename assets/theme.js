document.addEventListener('alpine:init', () => {
  const query = window.matchMedia('(min-width: 768px)');

  window.Alpine.store('viewport', {
    desktop: query.matches,

    init() {
      query.addEventListener('change', (event) => {
        window.Alpine.store('viewport').desktop = event.matches;
      });
    },
  });
});

window.footerPanelSync = function footerPanelSync(el, isOpen, isDesktop) {
  const inner = el.firstElementChild;
  if (!inner) return;

  if (isDesktop) {
    el.style.maxHeight = '';
    delete el.dataset.collapseReady;
    return;
  }

  if (el.dataset.collapseReady !== 'true') {
    el.dataset.collapseReady = 'true';
    el.style.maxHeight = isOpen ? 'none' : '0px';
    return;
  }

  const token = String(Number(el.dataset.collapseToken || 0) + 1);
  el.dataset.collapseToken = token;

  if (isOpen) {
    el.style.maxHeight = `${inner.scrollHeight}px`;
    const release = () => {
      if (el.dataset.collapseToken === token) el.style.maxHeight = 'none';
    };
    el.addEventListener('transitionend', release, {once: true});
    window.setTimeout(release, 400);
    return;
  }

  if (el.style.maxHeight === 'none' || el.style.maxHeight === '') {
    el.style.maxHeight = `${inner.scrollHeight}px`;
    void el.offsetHeight;
  }
  window.requestAnimationFrame(() => {
    if (el.dataset.collapseToken === token) el.style.maxHeight = '0px';
  });
};
