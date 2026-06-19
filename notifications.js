/**
 * JARCADE — modern toast notifications
 */
(function () {
  'use strict';

  const DURATION = 4000;
  const ICONS = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
  };

  let container;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
    return container;
  }

  function dismissToast(toast) {
    if (!toast || toast.classList.contains('toast--leaving')) return;
    toast.classList.add('toast--leaving');
    toast.addEventListener(
      'animationend',
      () => toast.remove(),
      { once: true }
    );
  }

  function showNotification(message, type) {
    const kind = type === 'success' || type === 'error' ? type : 'info';
    const c = ensureContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast--${kind}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="toast__glow" aria-hidden="true"></div>
      <div class="toast__icon"><i class="fa-solid ${ICONS[kind]}" aria-hidden="true"></i></div>
      <p class="toast__message">${escapeHtml(message)}</p>
      <button type="button" class="toast__close" aria-label="Dismiss">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <div class="toast__progress" aria-hidden="true"></div>
    `;

    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => dismissToast(toast));

    c.appendChild(toast);

    const siblings = c.querySelectorAll('.toast:not(.toast--leaving)');
    if (siblings.length > 4) dismissToast(siblings[0]);

    const timer = setTimeout(() => dismissToast(toast), DURATION);
    toast.addEventListener('mouseenter', () => clearTimeout(timer), { once: true });

    return toast;
  }

  window.showNotification = showNotification;
})();
