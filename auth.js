/**
 * JARCADE — client auth module
 * Talks to jarcade-backend API and keeps session in localStorage.
 */
(function () {
  'use strict';

  const TOKEN_KEY = 'jarcadeAuthToken';
  const USER_KEY = 'jarcadeUser';
  const LOCAL_FAV_KEY = 'favourites';

  let notificationTimeout;

  function detectApiBase() {
    if (window.JARCADE_API_URL) {
      return String(window.JARCADE_API_URL).replace(/\/$/, '');
    }

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '') {
      return 'http://localhost:3001/api';
    }

    console.warn('[JARCADE] Set JARCADE_API_URL in config.js to your Render API URL.');
    return 'http://localhost:3001/api';
  }

  const API_BASE = detectApiBase();

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getToken() && document.body.getAttribute('data-logged-in') === 'true';
  }

  function applyAuthUI(user) {
    const loggedIn = !!user;
    document.body.setAttribute('data-logged-in', loggedIn ? 'true' : 'false');

    const avatar = document.getElementById('headerAvatar');
    if (avatar) {
      const span = avatar.querySelector('span');
      if (span) span.textContent = user?.initials || 'JA';
    }

    const sidebarLogin = document.querySelector('.sidebar-login-link span');
    if (sidebarLogin) {
      sidebarLogin.textContent = loggedIn ? user.username : 'Login';
    }
  }

  function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) {
      if (type === 'error') alert(message);
      return;
    }

    notification.innerText = message;
    notification.classList.remove('show', 'is-success', 'is-error');
    if (type === 'success') notification.classList.add('is-success');
    if (type === 'error') notification.classList.add('is-error');
    void notification.offsetWidth;
    notification.classList.add('show');

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => notification.classList.remove('show'), 3200);
  }

  window.showNotification = showNotification;

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
      throw new Error('Cannot reach the server. Start the API with: npm run dev');
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  async function migrateLocalFavourites() {
    if (!getToken()) return;

    let local = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_FAV_KEY) || '[]');
    } catch {
      local = [];
    }

    if (!local.length) return;

    await Promise.all(
      local.map((f) =>
        api('/favourites', {
          method: 'POST',
          body: JSON.stringify({
            name: f.name,
            img: f.img || '',
            onclick: f.onclick || '',
          }),
        }).catch(() => null)
      )
    );
  }

  async function setSession(user, token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    applyAuthUI(user);
    await migrateLocalFavourites();
    if (typeof window.syncFavouritesFromServer === 'function') {
      await window.syncFavouritesFromServer();
    }
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    applyAuthUI(null);
    if (typeof window.clearFavouritesCache === 'function') {
      window.clearFavouritesCache();
    }
  }

  async function register({ username, email, password, confirmPassword }) {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, confirmPassword }),
    });
    await setSession(data.user, data.token);
    return data.user;
  }

  async function login({ login, password, remember }) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password, remember: !!remember }),
    });
    await setSession(data.user, data.token);
    return data.user;
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* clear locally even if API unreachable */
    }
    clearSession();
  }

  async function restoreSession() {
    const token = getToken();
    if (!token) {
      applyAuthUI(null);
      return null;
    }

    const cached = getUser();
    if (cached) applyAuthUI(cached);

    try {
      const data = await api('/auth/me');
      await setSession(data.user, token);
      return data.user;
    } catch {
      clearSession();
      return null;
    }
  }

  async function fetchFavourites() {
    const data = await api('/favourites');
    return (data.favourites || []).map((f) => ({
      name: f.name,
      img: f.img,
      onclick: f.onclick,
    }));
  }

  async function addFavourite({ name, img, onclick }) {
    await api('/favourites', {
      method: 'POST',
      body: JSON.stringify({ name, img: img || '', onclick: onclick || '' }),
    });
  }

  async function removeFavourite(name) {
    await api(`/favourites/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  function setButtonLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('is-loading');
      const content = btn.querySelector('.btn-content span:last-child');
      if (content) content.textContent = label || 'Loading…';
    } else {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (btn.dataset.originalHtml) {
        btn.innerHTML = btn.dataset.originalHtml;
        delete btn.dataset.originalHtml;
      }
    }
  }

  function showAuthError(message) {
    showNotification(message, 'error');
  }

  function showAuthSuccess(message) {
    showNotification(message, 'success');
  }

  window.JarcadeAuth = {
    API_BASE,
    getToken,
    getUser,
    isLoggedIn,
    register,
    login,
    logout,
    restoreSession,
    applyAuthUI,
    fetchFavourites,
    addFavourite,
    removeFavourite,
    setButtonLoading,
    showAuthError,
    showAuthSuccess,
    whenReady: null,
  };

  const authReady = (async () => {
    if (document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }
    await restoreSession();
    if (window.location.pathname.endsWith('login.html') && getToken()) {
      window.location.replace('index.html');
    }
  })();

  JarcadeAuth.whenReady = () => authReady;
})();
