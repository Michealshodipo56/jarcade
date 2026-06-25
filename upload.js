/**
 * JARCADE — Upload Game page logic
 */
(function () {
  'use strict';

  const MAX_JAR_BYTES = 25 * 1024 * 1024;   // 25 MB sanity cap
  const MAX_THUMB_BYTES = 4 * 1024 * 1024;  // 4 MB before downscale

  let selectedFile = null;
  let thumbnailDataUrl = '';

  function $(id) { return document.getElementById(id); }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function humanSize(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function notify(message, type) {
    if (typeof window.showNotification === 'function') window.showNotification(message, type);
  }

  /* ── Sidebar mobile toggle (self-contained) ───────────────── */
  function wireSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    const removeBtn = document.getElementById('removeBtn');
    menuBtn?.addEventListener('click', () => sidebar?.classList.add('visible'));
    removeBtn?.addEventListener('click', () => sidebar?.classList.remove('visible'));
  }

  /* ── Populate category dropdown ───────────────────────────── */
  function populateCategories() {
    const select = $('gameCategory');
    if (!select || !window.JarcadeUploads) return;
    window.JarcadeUploads.CATEGORIES.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.key;
      opt.textContent = cat.label;
      select.appendChild(opt);
    });
  }

  /* ── .jar file selection ──────────────────────────────────── */
  function setFile(file) {
    if (!file) return;
    const isJar = /\.jar$/i.test(file.name) || file.type === 'application/java-archive';
    if (!isJar) {
      notify('Only .jar files are accepted.', 'error');
      return;
    }
    if (file.size > MAX_JAR_BYTES) {
      notify('That .jar is larger than 25 MB.', 'error');
      return;
    }
    selectedFile = file;
    $('fileName').textContent = file.name;
    $('fileSize').textContent = humanSize(file.size);
    $('dropDefault').classList.add('hidden');
    $('dropFile').classList.remove('hidden');
    $('dropZone').classList.add('has-file');
  }

  function clearFile() {
    selectedFile = null;
    $('gameFile').value = '';
    $('dropDefault').classList.remove('hidden');
    $('dropFile').classList.add('hidden');
    $('dropZone').classList.remove('has-file');
  }

  function wireDropzone() {
    const dropZone = $('dropZone');
    const input = $('gameFile');
    const importBtn = $('importBtn');
    if (!dropZone || !input) return;

    const browse = (e) => { e?.stopPropagation(); input.click(); };
    importBtn?.addEventListener('click', browse);
    dropZone.addEventListener('click', (e) => {
      if (e.target.closest('.file-remove') || e.target.closest('#dropFile')) return;
      input.click();
    });
    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });

    input.addEventListener('change', () => setFile(input.files[0]));

    ['dragenter', 'dragover'].forEach((evt) =>
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragging');
      })
    );
    ['dragleave', 'dragend'].forEach((evt) =>
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        if (evt === 'dragleave' && dropZone.contains(e.relatedTarget)) return;
        dropZone.classList.remove('dragging');
      })
    );
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragging');
      const file = e.dataTransfer?.files?.[0];
      if (file) setFile(file);
    });

    $('fileRemove')?.addEventListener('click', (e) => { e.stopPropagation(); clearFile(); });
  }

  /* ── Thumbnail (downscaled to a data URL) ─────────────────── */
  function downscaleImage(file, maxDim) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read error'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('image error'));
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function setThumb(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Please choose an image file.', 'error');
      return;
    }
    if (file.size > MAX_THUMB_BYTES) {
      notify('Thumbnail is too large (max 4 MB).', 'error');
      return;
    }
    try {
      thumbnailDataUrl = await downscaleImage(file, 480);
      const preview = $('thumbPreview');
      preview.src = thumbnailDataUrl;
      preview.classList.remove('hidden');
      $('thumbPlaceholder').classList.add('hidden');
      $('thumbRemove').classList.remove('hidden');
    } catch {
      notify('Could not process that image.', 'error');
    }
  }

  function clearThumb() {
    thumbnailDataUrl = '';
    $('thumbFile').value = '';
    $('thumbPreview').classList.add('hidden');
    $('thumbPreview').src = '';
    $('thumbPlaceholder').classList.remove('hidden');
    $('thumbRemove').classList.add('hidden');
  }

  function wireThumb() {
    const zone = $('thumbZone');
    const input = $('thumbFile');
    if (!zone || !input) return;
    zone.addEventListener('click', (e) => {
      if (e.target.closest('.thumb-remove')) return;
      input.click();
    });
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', () => setThumb(input.files[0]));
    $('thumbRemove')?.addEventListener('click', (e) => { e.stopPropagation(); clearThumb(); });
  }

  /* ── Description counter ──────────────────────────────────── */
  function wireDescCount() {
    const ta = $('gameDescription');
    const count = $('descCount');
    if (!ta || !count) return;
    const update = () => { count.textContent = String(ta.value.length); };
    ta.addEventListener('input', update);
    update();
  }

  /* ── My uploaded games list ───────────────────────────────── */
  function renderMyUploads() {
    const grid = $('myUploadsGrid');
    const empty = $('myUploadsEmpty');
    const countEl = $('myUploadsCount');
    if (!grid || !window.JarcadeUploads) return;

    const games = window.JarcadeUploads.getMine();
    grid.innerHTML = '';

    if (countEl) countEl.textContent = `${games.length} game${games.length === 1 ? '' : 's'}`;
    if (empty) empty.style.display = games.length ? 'none' : '';

    const esc = window.JarcadeUploads.escapeHtml;
    games.forEach((g) => {
      const card = document.createElement('article');
      card.className = 'my-upload-card reveal-up';
      card.dataset.uploadId = g.id;
      const thumb = g.thumbnail
        ? `<img loading="lazy" src="${esc(g.thumbnail)}" alt="${esc(g.name)}">`
        : `<div class="my-upload-thumb-fallback"><i class="fa-solid fa-gamepad"></i></div>`;
      card.innerHTML = `
        <div class="my-upload-thumb">
          ${thumb}
          <span class="my-upload-cat">${esc(window.JarcadeUploads.categoryLabel(g.category))}</span>
        </div>
        <div class="my-upload-body">
          <h3 class="my-upload-name">${esc(g.name)}</h3>
          <p class="my-upload-date"><i class="fa-regular fa-calendar"></i> ${esc(window.JarcadeUploads.formatDate(g.createdAt))}</p>
          <p class="my-upload-desc">${esc(g.description || 'No description provided.')}</p>
          <button type="button" class="my-upload-delete" data-id="${g.id}">
            <i class="fa-solid fa-trash"></i> Remove
          </button>
        </div>`;
      grid.appendChild(card);
    });

    grid.querySelectorAll('.my-upload-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const confirmed = window.JarcadeUI?.showConfirm
          ? await window.JarcadeUI.showConfirm({
              title: 'Remove this game?',
              message: 'It will be taken down from your uploads and the New section.',
              confirmText: 'Remove',
              cancelText: 'Keep',
              danger: true,
            })
          : window.confirm('Remove this game?');
        if (!confirmed) return;
        await window.JarcadeUploads.removeUpload(id);
        renderMyUploads();
        notify('Game removed.', 'success');
      });
    });

    if (window.JarcadeAnimations) window.JarcadeAnimations.refresh(grid);
  }

  /* ── Submit ───────────────────────────────────────────────── */
  function wireForm() {
    const form = $('uploadForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('gameName').value.trim();
      const category = $('gameCategory').value;
      const description = $('gameDescription').value.trim();

      if (!name) { notify('Give your game a name.', 'error'); $('gameName').focus(); return; }
      if (!category) { notify('Pick a category.', 'error'); $('gameCategory').focus(); return; }
      if (!selectedFile) { notify('Add your .jar game file.', 'error'); return; }

      const btn = $('uploadSubmit');
      btn.classList.add('is-loading');
      btn.disabled = true;

      try {
        await window.JarcadeUploads.addUpload({
          name,
          category,
          description,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          thumbnail: thumbnailDataUrl,
        });

        form.reset();
        clearFile();
        clearThumb();
        $('descCount').textContent = '0';
        renderMyUploads();
        notify(`"${name}" published! Find it under New.`, 'success');
        document.getElementById('myUploadsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        notify('Could not publish that game. Try again.', 'error');
      } finally {
        btn.classList.remove('is-loading');
        btn.disabled = false;
      }
    });
  }

  ready(() => {
    wireSidebar();
    populateCategories();
    wireDropzone();
    wireThumb();
    wireDescCount();
    wireForm();
    renderMyUploads();
    window.addEventListener('jarcade:uploads-changed', renderMyUploads);
  });
})();
