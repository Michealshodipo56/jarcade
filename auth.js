/**
 * JARCADE — client auth module
 * Talks to the Go API and keeps session in localStorage.
 */
(function () {
  'use strict';

  const TOKEN_KEY = 'jarcadeAuthToken';
  const USER_KEY = 'jarcadeUser';
  const LOCAL_FAV_KEY = 'favourites';

  const PROD_API_URL = 'https://jarcade-backend.onrender.com/api';

  function detectApiBase() {
    if (window.JARCADE_API_URL) {
      return String(window.JARCADE_API_URL).replace(/\/$/, '');
    }

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8080/api';
    }

    // Deployed site without config.js — use production API
    return PROD_API_URL;
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

  function displayName(user) {
    return user?.display || user?.email?.split('@')[0] || 'Player';
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
      sidebarLogin.textContent = loggedIn ? displayName(user) : 'Login';
    }
  }

  function notify(message, type) {
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type);
      return;
    }
    if (type === 'error') alert(message);
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
      const origin = window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : 'your site URL';
      throw new Error(
        `Cannot reach the API (${API_BASE}). Add "${origin}" to CORS_ORIGIN on Render, then redeploy the backend.`
      );
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

  function readLocalFavourites() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_FAV_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function writeLocalFavourites(list) {
    localStorage.setItem(LOCAL_FAV_KEY, JSON.stringify(list));
  }

  async function setSession(user, token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    applyAuthUI(user);
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

  async function signup({ email, password, confirmPassword }) {
    const data = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, confirmPassword }),
    });
    await setSession(data.user, data.token);
    return data.user;
  }

  async function login({ email, password }) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
    return readLocalFavourites();
  }

  async function addFavourite({ name, img, onclick }) {
    const list = readLocalFavourites();
    const idx = list.findIndex((f) => f.name === name);
    const item = { name, img: img || '', onclick: onclick || '' };
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    writeLocalFavourites(list);
  }

  async function removeFavourite(name) {
    writeLocalFavourites(readLocalFavourites().filter((f) => f.name !== name));
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
    notify(message, 'error');
  }

  function showAuthSuccess(message) {
    notify(message, 'success');
  }

  window.JarcadeAuth = {
    API_BASE,
    getToken,
    getUser,
    isLoggedIn,
    signup,
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

  // Back-compat alias for login page
  JarcadeAuth.register = JarcadeAuth.signup;

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
