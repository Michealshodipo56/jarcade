/**
 * JARCADE — community game uploads
 *
 * Merges server-backed uploads (when API + migration are available) with
 * localStorage for guests and offline fallback.
 */
(function () {
  'use strict';

  const STORE_KEY = 'jarcadeUploadedGames';
  let serverGames = [];

  const CATEGORIES = [
    { key: 'action', label: 'Action' },
    { key: 'adventure', label: 'Adventure' },
    { key: 'arcade', label: 'Arcade' },
    { key: 'casual', label: 'Casual' },
    { key: 'horror', label: 'Horror' },
    { key: 'puzzle', label: 'Puzzle' },
    { key: 'racing', label: 'Racing' },
    { key: 'rpg', label: 'RPG' },
    { key: 'shooting', label: 'Shooting' },
    { key: 'simulation', label: 'Simulation' },
    { key: 'sports', label: 'Sports' },
    { key: 'strategy', label: 'Strategy' },
    { key: 'general', label: 'Other / General' },
  ];

  function apiBase() {
    return window.JarcadeAuth?.API_BASE || 'https://jarcade-backend.onrender.com/api';
  }

  function currentOwner() {
    const user = window.JarcadeAuth?.getUser?.();
    return user?.id ? `user-${user.id}` : 'guest';
  }

  function mapApiGame(g) {
    if (!g) return null;
    const userId = g.userId || g.user_id || '';
    return {
      id: g.id,
      name: g.name,
      category: g.category,
      description: g.description || '',
      fileName: g.fileName || g.file_name || '',
      fileSize: g.fileSize ?? g.file_size ?? 0,
      thumbnail: g.thumbnail || '',
      owner: userId ? `user-${userId}` : 'guest',
      createdAt: g.createdAt || g.created_at || new Date().toISOString(),
    };
  }

  async function apiFetch(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    const token = window.JarcadeAuth?.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${apiBase()}${path}`, { ...options, headers });
    return res;
  }

  function readLocal() {
    try {
      const list = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeLocal(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  }

  function notifyChanged() {
    window.dispatchEvent(new CustomEvent('jarcade:uploads-changed'));
  }

  function readAll() {
    const serverIds = new Set(serverGames.map((g) => g.id));
    const localOnly = readLocal().filter((g) => !serverIds.has(g.id));
    return [...serverGames, ...localOnly].sort(byNewest);
  }

  function byNewest(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }

  async function syncFromServer() {
    try {
      const res = await apiFetch('/uploads');
      if (!res.ok) return;
      const data = await res.json();
      serverGames = (data.games || []).map(mapApiGame).filter(Boolean);
      notifyChanged();
    } catch {
      /* API unavailable — localStorage still works */
    }
  }

  function getAll() {
    return readAll();
  }

  function getMine() {
    const me = currentOwner();
    return readAll().filter((g) => g.owner === me).sort(byNewest);
  }

  function getByCategory(key) {
    return readAll().filter((g) => g.category === key).sort(byNewest);
  }

  async function addUpload(game) {
    const payload = {
      name: String(game.name || 'Untitled Game').trim(),
      category: game.category || 'general',
      description: String(game.description || '').trim(),
      fileName: game.fileName || '',
      fileSize: game.fileSize || 0,
      thumbnail: game.thumbnail || '',
    };

    const token = window.JarcadeAuth?.getToken?.();
    if (token) {
      try {
        const res = await apiFetch('/uploads', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          const entry = mapApiGame(data.game);
          if (entry) {
            serverGames = [entry, ...serverGames.filter((g) => g.id !== entry.id)];
            notifyChanged();
            return entry;
          }
        }
      } catch {
        /* fall through to local storage */
      }
    }

    const list = readLocal();
    const entry = {
      id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...payload,
      owner: currentOwner(),
      createdAt: new Date().toISOString(),
    };
    list.push(entry);
    writeLocal(list);
    notifyChanged();
    return entry;
  }

  async function removeUpload(id) {
    const token = window.JarcadeAuth?.getToken?.();
    const onServer = serverGames.some((g) => g.id === id);

    if (token && onServer) {
      try {
        const res = await apiFetch(`/uploads/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (res.ok) {
          serverGames = serverGames.filter((g) => g.id !== id);
          notifyChanged();
          return;
        }
      } catch {
        /* try local removal below */
      }
    }

    writeLocal(readLocal().filter((g) => g.id !== id));
    serverGames = serverGames.filter((g) => g.id !== id);
    notifyChanged();
  }

  function categoryLabel(key) {
    return CATEGORIES.find((c) => c.key === key)?.label || 'Other';
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  function buildGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game upload-game';
    card.dataset.uploadId = game.id;

    const thumb = game.thumbnail
      ? `<img loading="lazy" src="${escapeHtml(game.thumbnail)}" alt="${escapeHtml(game.name)}">`
      : `<div class="upload-thumb-fallback"><i class="fa-solid fa-gamepad"></i></div>`;

    const stars = '<i class="fa-solid fa-star" style="color:#ffcc00;"></i>'.repeat(4) +
      '<i class="fa-regular fa-star" style="color:#ffcc00;"></i>';

    card.innerHTML = `
      <div class="game-img-div">
        ${thumb}
        <div class="play-overlay" onclick="JarcadeUploads.play('${escapeHtml(game.id)}'); event.stopPropagation();">
          <i class="fa-solid fa-gamepad"></i>
        </div>
        <span class="upload-card-badge">NEW</span>
        <div class="card-rating" onclick="incrementVote(this); event.stopPropagation();">
          <i class="fa-regular fa-star"></i>
          <span class="count">New</span>
        </div>
      </div>
      <div class="game-text">
        <div class="name">${escapeHtml(game.name)}</div>
        ${escapeHtml(game.description || 'A community-uploaded J2ME game.')}
        <div class="star">
          <div class="stars-group">${stars}</div>
          <i class="fa-regular fa-heart favourite-icon" onclick="toggleFavourite(this); event.stopPropagation();"></i>
        </div>
      </div>`;
    return card;
  }

  function renderInto(container, opts = {}) {
    if (!container) return 0;
    const { limit = 0, category = 'all', emptyState = true, seeMoreHref = 'upload.html' } = opts;

    let games = category === 'all' ? getAll() : getByCategory(category);
    if (limit > 0) games = games.slice(0, limit);

    container.querySelectorAll('.upload-game, .upload-empty-card').forEach((n) => n.remove());

    if (!games.length && emptyState) {
      const empty = document.createElement('a');
      empty.href = seeMoreHref;
      empty.className = 'see-more-card upload-empty-card';
      empty.innerHTML = `
        <div class="see-more-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
        <span>Upload a game</span>`;
      container.prepend(empty);
      return 0;
    }

    const anchor = container.querySelector('.see-more-card');
    const frag = document.createDocumentFragment();
    games.forEach((g) => frag.appendChild(buildGameCard(g)));
    if (anchor) container.insertBefore(frag, anchor);
    else container.appendChild(frag);

    if (window.JarcadeAnimations) window.JarcadeAnimations.refresh(container);
    if (typeof window.initializeGameVotes === 'function') window.initializeGameVotes(container);
    return games.length;
  }

  function play(id) {
    const game = readAll().find((g) => g.id === id);
    const name = game?.name || 'This game';
    if (typeof window.showNotification === 'function') {
      window.showNotification(`${name} was uploaded by the community — online play is coming soon!`, 'info');
    }
  }

  function renderFeeds() {
    document.querySelectorAll('[data-uploads-feed]').forEach((el) => {
      renderInto(el, {
        category: el.dataset.uploadsFeed || 'all',
        limit: Number(el.dataset.uploadsLimit) || 12,
        emptyState: el.dataset.uploadsEmpty !== 'false',
        seeMoreHref: el.dataset.uploadsHref || 'upload.html',
      });
    });
  }

  async function init() {
    if (window.JarcadeAuth?.whenReady) {
      await JarcadeAuth.whenReady().catch(() => {});
    }
    await syncFromServer();
    renderFeeds();
    window.addEventListener('jarcade:uploads-changed', renderFeeds);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init().catch(() => {}); });
  } else {
    init().catch(() => {});
  }

  window.JarcadeUploads = {
    CATEGORIES,
    getAll,
    getMine,
    getByCategory,
    addUpload,
    removeUpload,
    syncFromServer,
    categoryLabel,
    formatDate,
    escapeHtml,
    buildGameCard,
    renderInto,
    renderFeeds,
    play,
    currentOwner,
  };
})();
