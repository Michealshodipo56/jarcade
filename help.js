/**
 * JARCADE — Help Center interactions
 * Lightweight, dependency-free, performance-safe.
 */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  /* Sidebar mobile toggle */
  function wireSidebar() {
    const sidebar = document.getElementById('sidebar');
    document.getElementById('menuBtn')?.addEventListener('click', () => sidebar?.classList.add('visible'));
    document.getElementById('removeBtn')?.addEventListener('click', () => sidebar?.classList.remove('visible'));
  }

  /* Scroll-reveal with stagger inside each section */
  function wireReveals() {
    const items = Array.from(document.querySelectorAll('.reveal'));
    if (prefersReduced || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const section = el.closest('.help-section, .help-final');
        let delay = 0;
        if (section) {
          const sibs = Array.from(section.querySelectorAll('.reveal'));
          delay = Math.min(sibs.indexOf(el), 6) * 70;
        }
        el.style.setProperty('--d', `${delay}ms`);
        el.classList.add('in');
        observer.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach((el) => observer.observe(el));
  }

  /* Floating hero particles */
  function spawnParticles() {
    const host = document.getElementById('particles');
    if (!host || prefersReduced) return;
    const count = window.innerWidth < 600 ? 10 : 18;
    const colors = ['#00c8ff', '#ffcc00', '#7b2fff', '#00ff9d'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${50 + Math.random() * 50}%`;
      p.style.background = colors[i % colors.length];
      p.style.boxShadow = `0 0 12px ${colors[i % colors.length]}`;
      const size = 3 + Math.random() * 5;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.animationDuration = `${5 + Math.random() * 6}s`;
      p.style.animationDelay = `${Math.random() * 6}s`;
      host.appendChild(p);
    }
  }

  /* FAQ accordion */
  function wireFaq() {
    document.querySelectorAll('#faqList .faq-item').forEach((item) => {
      const btn = item.querySelector('.faq-q');
      const ans = item.querySelector('.faq-a');
      btn?.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // close siblings for a cleaner accordion feel
        document.querySelectorAll('#faqList .faq-item.open').forEach((other) => {
          if (other !== item) {
            other.classList.remove('open');
            const a = other.querySelector('.faq-a');
            if (a) a.style.maxHeight = '';
          }
        });
        if (isOpen) {
          item.classList.remove('open');
          ans.style.maxHeight = '';
        } else {
          item.classList.add('open');
          ans.style.maxHeight = `${ans.scrollHeight}px`;
        }
      });
    });
  }

  /* Troubleshooting tabs */
  function wireTabs() {
    const tabs = Array.from(document.querySelectorAll('.trouble-tab'));
    const panels = Array.from(document.querySelectorAll('.trouble-panel'));
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        panels.forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.querySelector(`.trouble-panel[data-panel="${tab.dataset.tab}"]`);
        target?.classList.add('active');
      });
    });
  }

  /* Quick-nav active highlighting + smooth scroll offset */
  function wireQuickNav() {
    const nav = document.getElementById('quicknav');
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll('a'));
    const map = new Map();
    links.forEach((l) => {
      const id = l.getAttribute('href').slice(1);
      const sec = document.getElementById(id);
      if (sec) map.set(sec, l);
    });

    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((l) => l.classList.remove('active'));
          map.get(entry.target)?.classList.add('active');
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      map.forEach((_, sec) => spy.observe(sec));
    }

    links.forEach((l) => {
      l.addEventListener('click', (e) => {
        const id = l.getAttribute('href').slice(1);
        const sec = document.getElementById(id);
        if (!sec) return;
        e.preventDefault();
        const headerH = window.innerWidth <= 850 ? 56 : 60;
        const top = sec.getBoundingClientRect().top + window.scrollY - (nav.offsetHeight + headerH + 8);
        window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
      });
    });
  }

  ready(() => {
    wireSidebar();
    spawnParticles();
    wireReveals();
    wireFaq();
    wireTabs();
    wireQuickNav();
  });
})();
