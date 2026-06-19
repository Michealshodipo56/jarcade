/**
 * JARCADE — shared pixel ghost loader markup
 */
(function () {
  'use strict';

  const GHOST_MARKUP = `
    <div class="jarcade-ghost" aria-hidden="true">
      <div class="jarcade-ghost-body">
        <div class="g-pupil"></div>
        <div class="g-pupil1"></div>
        <div class="g-eye"></div>
        <div class="g-eye1"></div>
        <div class="g-top0"></div>
        <div class="g-top1"></div>
        <div class="g-top2"></div>
        <div class="g-top3"></div>
        <div class="g-top4"></div>
        <div class="g-st0"></div>
        <div class="g-st1"></div>
        <div class="g-st2"></div>
        <div class="g-st3"></div>
        <div class="g-st4"></div>
        <div class="g-st5"></div>
        <div class="g-an1"></div>
        <div class="g-an2"></div>
        <div class="g-an3"></div>
        <div class="g-an4"></div>
        <div class="g-an5"></div>
        <div class="g-an6"></div>
        <div class="g-an7"></div>
        <div class="g-an8"></div>
        <div class="g-an9"></div>
        <div class="g-an10"></div>
        <div class="g-an11"></div>
        <div class="g-an12"></div>
        <div class="g-an13"></div>
        <div class="g-an14"></div>
        <div class="g-an15"></div>
        <div class="g-an16"></div>
        <div class="g-an17"></div>
        <div class="g-an18"></div>
      </div>
      <div class="jarcade-ghost-shadow"></div>
    </div>
  `;

  function ghostWithLabel(label, labelClass) {
    const cls = labelClass || 'jarcade-loader-label';
    const text = label ? `<span class="${cls}">${label}</span>` : '';
    return `${GHOST_MARKUP}${text}`;
  }

  function hydrateLoaders() {
    document.querySelectorAll('[data-jarcade-ghost-loader]').forEach((el) => {
      const label = el.dataset.label || 'Loading…';
      const labelClass = el.dataset.labelClass || 'loader-label';
      el.innerHTML = ghostWithLabel(label, labelClass);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateLoaders);
  } else {
    hydrateLoaders();
  }

  window.JarcadeGhostLoader = {
    markup: GHOST_MARKUP,
    withLabel: ghostWithLabel,
  };
})();
