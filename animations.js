/**
 * JARCADE — minimal motion (performance-safe)
 * Heavy effects disabled by default — they caused GPU freezes on many laptops.
 */
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let revealObserver = null;

  function createRevealObserver() {
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -4% 0px', threshold: 0.08 }
    );
  }

  function markForReveal(el, index = 0) {
    if (!el || el.dataset.revealObserved) return;
    el.classList.add('reveal-up');
    el.style.setProperty('--reveal-i', String(index % 8));
    el.dataset.revealObserved = '1';
    if (prefersReduced) {
      el.classList.add('is-visible');
      return;
    }
    revealObserver.observe(el);
  }

  function observeReveals(root = document) {
    if (!revealObserver) revealObserver = createRevealObserver();

    const scope = root instanceof Element ? root : document;
    scope.querySelectorAll('.type, .games-category-section, .slideshow-container').forEach((el) => markForReveal(el));
    scope.querySelectorAll('.scroll .game, .cards-grid .game').forEach((el, i) => {
      if (el.classList.contains('card-entering')) return;
      markForReveal(el, i);
    });
  }

  function init() {
    document.body.classList.add('jarcade-ready');
    observeReveals();
  }

  window.JarcadeAnimations = {
    refresh: observeReveals,
    init,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
