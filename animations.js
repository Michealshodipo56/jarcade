/**
 * JARCADE — lightweight motion layer
 * GPU-friendly transforms/opacity only. Respects prefers-reduced-motion.
 */
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  let revealObserver = null;

  function createRevealObserver() {
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add('is-visible');
          revealObserver.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
    );
  }

  function markForReveal(el, index = 0) {
    if (!el || el.dataset.revealObserved) return;
    el.classList.add('reveal-up');
    el.style.setProperty('--reveal-i', String(index % 12));
    el.dataset.revealObserved = '1';
    if (prefersReduced) {
      el.classList.add('is-visible');
      return;
    }
    revealObserver.observe(el);
  }

  function observeReveals(root = document) {
    if (!revealObserver) revealObserver = createRevealObserver();

    const sectionSelectors = '.type, .games-category-section, .slideshow-container, .categories-wrapper, .site-footer';
    root.querySelectorAll(sectionSelectors).forEach((el) => markForReveal(el));

    root.querySelectorAll('.category-item').forEach((el, i) => markForReveal(el, i));
    root.querySelectorAll('.scroll .game, .cards-grid .game').forEach((el, i) => {
      if (el.classList.contains('card-entering')) return;
      markForReveal(el, i);
    });
  }

  function initRippleDelegation() {
    document.addEventListener(
      'click',
      (e) => {
        const card = e.target.closest('.game');
        if (!card || e.target.closest('.card-rating, .favourite-icon, .play-overlay')) return;

        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        const rect = card.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        card.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
      },
      { passive: true }
    );
  }

  function initHeroParallax() {
    if (prefersReduced || isCoarsePointer || window.innerWidth < 900) return;

    const hero = document.querySelector('.slideshow-container');
    if (!hero) return;

    let rafId = 0;
    let tx = 0;
    let ty = 0;

    const apply = () => {
      rafId = 0;
      hero.style.setProperty('--hero-tilt-x', `${ty * -4}px`);
      hero.style.setProperty('--hero-tilt-y', `${tx * 4}px`);
    };

    document.addEventListener(
      'mousemove',
      (e) => {
        const cx = window.innerWidth * 0.5;
        const cy = window.innerHeight * 0.35;
        tx = (e.clientX - cx) / cx;
        ty = (e.clientY - cy) / cy;
        if (!rafId) rafId = requestAnimationFrame(apply);
      },
      { passive: true }
    );
  }

  function initModalMotion() {
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('transitionend', () => {
        if (!modal.classList.contains('show')) modal.classList.remove('modal-animated');
      });
    });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName !== 'class') return;
        const modal = m.target;
        if (modal.classList.contains('show')) modal.classList.add('modal-animated');
      });
    });

    document.querySelectorAll('.modal').forEach((modal) => {
      observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function initCategoryFloat() {
    document.querySelectorAll('.category-item').forEach((item, i) => {
      item.style.setProperty('--float-delay', `${(i % 8) * 0.35}s`);
    });
  }

  function initScrollProgress() {
    const bar = document.querySelector('.scroll-progress-bar');
    if (!bar) return;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      bar.style.transform = `scaleX(${pct})`;
    };

    window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    update();
  }

  function injectScrollProgress() {
    if (document.querySelector('.scroll-progress-bar')) return;
    const el = document.createElement('div');
    el.className = 'scroll-progress';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="scroll-progress-bar"></div>';
    document.body.prepend(el);
  }

  function init() {
    document.body.classList.add('jarcade-ready');
    if (!prefersReduced) document.body.classList.add('motion-enabled');

    injectScrollProgress();
    observeReveals();
    initRippleDelegation();
    initHeroParallax();
    initModalMotion();
    initCategoryFloat();
    initScrollProgress();
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
