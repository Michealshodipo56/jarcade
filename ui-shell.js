/**
 * JARCADE — shared UI: page loader, confirm dialogs, navigation
 */
(function () {
  'use strict';

  const REMEMBER_EMAIL_KEY = 'jarcadeRememberEmail';

  function injectShell() {
    if (document.getElementById('page-transition-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    overlay.className = 'page-transition-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="page-transition-ring" role="status" aria-label="Loading"></div>
      <span class="page-transition-label">Loading…</span>
    `;
    document.body.appendChild(overlay);

    const confirm = document.createElement('div');
    confirm.id = 'confirmModal';
    confirm.className = 'confirm-modal';
    confirm.setAttribute('aria-hidden', 'true');
    confirm.innerHTML = `
      <div class="confirm-modal__backdrop" data-confirm-close></div>
      <div class="confirm-modal__panel" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
        <h3 class="confirm-modal__title" id="confirmModalTitle">Confirm</h3>
        <p class="confirm-modal__message" id="confirmModalMessage"></p>
        <div class="confirm-modal__actions">
          <button type="button" class="confirm-modal__btn confirm-modal__btn--ghost" data-confirm-cancel>Cancel</button>
          <button type="button" class="confirm-modal__btn confirm-modal__btn--danger" data-confirm-ok>Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirm);
  }

  function showPageLoader(label) {
    injectShell();
    const overlay = document.getElementById('page-transition-overlay');
    if (!overlay) return;
    const text = overlay.querySelector('.page-transition-label');
    if (text && label) text.textContent = label;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function hidePageLoader() {
    const overlay = document.getElementById('page-transition-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function navigateWithLoader(url, label) {
    showPageLoader(label || 'Loading…');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.location.assign(url);
      });
    });
  }

  function showConfirm(options) {
    injectShell();
    const modal = document.getElementById('confirmModal');
    const title = modal.querySelector('#confirmModalTitle');
    const message = modal.querySelector('#confirmModalMessage');
    const okBtn = modal.querySelector('[data-confirm-ok]');
    const cancelBtn = modal.querySelector('[data-confirm-cancel]');

    title.textContent = options.title || 'Are you sure?';
    message.textContent = options.message || '';
    okBtn.textContent = options.confirmText || 'Confirm';
    cancelBtn.textContent = options.cancelText || 'Cancel';
    okBtn.classList.toggle('confirm-modal__btn--danger', options.danger !== false);

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    return new Promise((resolve) => {
      function cleanup(result) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        modal.querySelectorAll('[data-confirm-close]').forEach((el) => {
          el.removeEventListener('click', onCancel);
        });
        resolve(result);
      }

      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modal.querySelectorAll('[data-confirm-close]').forEach((el) => {
        el.addEventListener('click', onCancel);
      });
    });
  }

  function rememberLoginEmail(email) {
    if (email) localStorage.setItem(REMEMBER_EMAIL_KEY, email);
  }

  function getRememberedLoginEmail() {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
  }

  function clearRememberedLoginEmail() {
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }

  window.JarcadeUI = {
    showPageLoader,
    hidePageLoader,
    navigateWithLoader,
    showConfirm,
    rememberLoginEmail,
    getRememberedLoginEmail,
    clearRememberedLoginEmail,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectShell();
      wireFavNavigation();
      wireInternalNavigation();
    });
  } else {
    injectShell();
    wireFavNavigation();
    wireInternalNavigation();
  }

  function wireFavNavigation() {
    document.addEventListener('click', (e) => {
      const fav = e.target.closest('#headerFavBtn');
      if (!fav || fav.getAttribute('aria-hidden') === 'true') return;
      e.preventDefault();
      navigateWithLoader('favourite.html', 'Opening favourites…');
    });
  }

  function wireInternalNavigation() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link || link.id === 'headerFavBtn' || link.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const rawHref = link.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;

      let url;
      try {
        url = new URL(rawHref, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (!url.pathname.endsWith('.html')) return;

      e.preventDefault();
      const label = url.pathname.includes('login') ? 'Opening login…'
        : url.pathname.includes('favourite') ? 'Opening favourites…'
        : url.pathname.includes('games') ? 'Loading games…'
        : 'Loading…';
      navigateWithLoader(url.pathname + url.search + url.hash, label);
    });
  }
})();
