const focusVisibleSupported =
  window.CSS?.supports?.('selector(:focus-visible)') ?? false;

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

document.addEventListener('alpine:init', () => {
  window.Alpine.data('promoCarousel', () => ({
    atStart: true,
    atEnd: false,
    scroller: null,
    dragged: false,

    init() {
      this.scroller = this.$el.querySelector('[data-promo-scroller]');
      if (!this.scroller) return;

      this.sync();
      this.scroller.addEventListener('scroll', () => this.sync(), {
        passive: true,
      });
      window.addEventListener('resize', () => this.sync(), {passive: true});
      this.bindDragging();
      this.scroller.addEventListener('focusin', (event) =>
        this.revealFocused(event),
      );

      this.equaliseText();
      window.addEventListener('resize', () => this.equaliseText(), {
        passive: true,
      });
      if (document.fonts) document.fonts.ready.then(() => this.equaliseText());
    },

    equaliseText() {
      const panels = [...this.$el.querySelectorAll('[data-promo-text]')];
      if (panels.length < 2) return;

      panels.forEach((panel) => {
        panel.style.minHeight = '';
      });

      const tallest = panels.reduce(
        (max, panel) => Math.max(max, panel.getBoundingClientRect().height),
        0,
      );

      panels.forEach((panel) => {
        panel.style.minHeight = `${tallest}px`;
      });
    },

    revealFocused(event) {
      const card = event.target.closest('[data-promo-card]');
      if (!card) return;

      if (focusVisibleSupported && !event.target.matches(':focus-visible')) {
        return;
      }

      const port = this.scroller.getBoundingClientRect();
      const inset =
        parseFloat(getComputedStyle(this.scroller).paddingRight) || 0;
      const box = card.getBoundingClientRect();

      const past = box.right - (port.right - inset);
      const before = box.left - port.left;

      let delta = 0;
      if (before < -1) delta = before;
      else if (past > 1) delta = past;
      if (!delta) return;

      this.scroller.scrollBy({
        left: delta,
        behavior: this.reducedMotion ? 'instant' : 'smooth',
      });
    },

    sync() {
      const {scrollLeft, scrollWidth, clientWidth} = this.scroller;
      const furthest = scrollWidth - clientWidth;

      this.atStart = scrollLeft <= 1;
      this.atEnd = scrollLeft >= furthest - 1;
    },

    get reducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    cardDistance() {
      const card = this.scroller.querySelector('[data-promo-card]');
      const gap = parseFloat(getComputedStyle(this.scroller).columnGap) || 0;
      return card
        ? card.getBoundingClientRect().width + gap
        : this.scroller.clientWidth;
    },

    step(direction) {
      this.scroller.scrollBy({
        left: direction * this.cardDistance(),
        behavior: this.reducedMotion ? 'instant' : 'smooth',
      });
    },

    onKey(event) {
      const keys = {
        ArrowRight: () => this.step(1),
        ArrowLeft: () => this.step(-1),
        Home: () => this.scrollToEdge(0),
        End: () => this.scrollToEdge(this.scroller.scrollWidth),
      };

      const action = keys[event.key];
      if (!action) return;

      event.preventDefault();
      action();
    },

    scrollToEdge(left) {
      this.scroller.scrollTo({
        left,
        behavior: this.reducedMotion ? 'instant' : 'smooth',
      });
    },

    bindDragging() {
      const scroller = this.scroller;
      let originX = 0;
      let originLeft = 0;
      let travelled = 0;
      let active = false;

      scroller.addEventListener('dragstart', (event) => event.preventDefault());

      scroller.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch' || event.button !== 0) return;

        active = true;
        travelled = 0;
        this.dragged = false;
        originX = event.clientX;
        originLeft = scroller.scrollLeft;

        scroller.style.scrollSnapType = 'none';
        scroller.style.scrollBehavior = 'auto';
        scroller.classList.add('cursor-grabbing', 'select-none');
      });

      scroller.addEventListener('pointermove', (event) => {
        if (!active) return;

        const delta = event.clientX - originX;
        travelled = Math.max(travelled, Math.abs(delta));

        if (travelled > 4 && !this.dragged) {
          this.dragged = true;
          scroller.setPointerCapture(event.pointerId);
        }

        if (this.dragged) scroller.scrollLeft = originLeft - delta;
      });

      const release = (event) => {
        if (!active) return;
        active = false;

        scroller.style.scrollSnapType = '';
        scroller.style.scrollBehavior = '';
        scroller.classList.remove('cursor-grabbing', 'select-none');

        if (scroller.hasPointerCapture(event.pointerId)) {
          scroller.releasePointerCapture(event.pointerId);
        }
      };

      scroller.addEventListener('pointerup', release);
      scroller.addEventListener('pointercancel', release);

      scroller.addEventListener(
        'click',
        (event) => {
          if (!this.dragged) return;
          event.preventDefault();
          event.stopPropagation();
          this.dragged = false;
        },
        true,
      );
    },
  }));
});
