/**
 * JARCADE — community game uploads (client-side store)
 *
 * Backend is not implemented yet, so uploaded game metadata + thumbnail are
 * persisted in localStorage. The UI is structured so a real API can drop in
 * later (see JarcadeUploads.addUpload / getUploads).
 *
 * Stored shape (array under STORE_KEY):
 *   { id, name, category, description, fileName, fileSize, thumbnail, owner, createdAt }
 */
(function () {
  'use strict';

  const STORE_KEY = 'jarcadeUploadedGames';

  // Keep in sync with the games.html category catalog (+ friendly labels).
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

  function currentOwner() {
    const user = window.JarcadeAuth?.getUser?.();
    return user?.id ? `user-${user.id}` : 'guest';
  }

  function readAll() {
    try {
      const list = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeAll(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('jarcade:uploads-changed'));
  }

  function byNewest(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }

  /** All uploads (public feed) sorted newest first. */
  function getAll() {
    return readAll().sort(byNewest);
  }

  /** Uploads owned by the current user, newest first. */
  function getMine() {
    const me = currentOwner();
    return readAll().filter((g) => g.owner === me).sort(byNewest);
  }

  function getByCategory(key) {
    return readAll().filter((g) => g.category === key).sort(byNewest);
  }

  function addUpload(game) {
    const list = readAll();
    const entry = {
      id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(game.name || 'Untitled Game').trim(),
      category: game.category || 'general',
      description: String(game.description || '').trim(),
      fileName: game.fileName || '',
      fileSize: game.fileSize || 0,
      thumbnail: game.thumbnail || '',
      owner: currentOwner(),
      createdAt: new Date().toISOString(),
    };
    list.push(entry);
    writeAll(list);
    return entry;
  }

  function removeUpload(id) {
    writeAll(readAll().filter((g) => g.id !== id));
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

  /* ── Storefront-style card (matches the site's .game cards) ───────── */
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
        <div class="play-overlay" onclick="JarcadeUploads.play('${game.id}'); event.stopPropagation();">
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

  /**
   * Render uploads into a horizontal scroll / grid container.
   * opts: { limit, category ('all' or key), emptyState (bool), seeMoreHref }
   */
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

  /* Auto-render any container marked with [data-uploads-feed]. */
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

  function init() {
    renderFeeds();
    window.addEventListener('jarcade:uploads-changed', renderFeeds);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.JarcadeUploads = {
    CATEGORIES,
    getAll,
    getMine,
    getByCategory,
    addUpload,
    removeUpload,
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
