function playGame(jar, className, canvasSize = 'size-no', platform = 'desktop') {
  const overlay = document.getElementById('game-loader-overlay');
  if (overlay) {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  }

  setBackgroundMotionPaused(true);

  const isMobile = platform === 'mobile';
  const baseUrl = isMobile ? 'java/mobile.html' : 'java/main.html';
  let url = `${baseUrl}?jars=jar/${jar}`;
  if (className) {
    url += `&midletClassName=${className}`;
  }
  url += `&gamepad=1&canvasSize=${canvasSize}&gameresize=resize-1&storageProfile=${encodeURIComponent(getGameStorageProfile(jar, className))}`;
  if (isMobile) {
    url += '&rotate=270';
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.location.assign(url);
    });
  });
}

const VOTE_STORAGE_KEY = 'gameCardVotes';
const DEVICE_ID_STORAGE_KEY = 'jarcadeDeviceId';

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);

  if (!deviceId) {
    if (window.crypto && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }

  return deviceId;
}

function slugify(value) {
  return String(value || 'game')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'game';
}

function getGameStorageProfile(jar, className) {
  return `${getDeviceId()}-${slugify(jar)}-${slugify(className || 'default')}`;
}

let categoryScrollPaused = false;

function setBackgroundMotionPaused(paused) {
  document.body.classList.toggle('motion-paused', paused);
}

function syncModalState() {
  const active = !!document.querySelector('.modal.show');
  document.body.classList.toggle('modal-open', active);
  categoryScrollPaused = active;
  setBackgroundMotionPaused(active);
}

window.syncModalState = syncModalState;

function toggleDropdown() {
  document.getElementById("categoryDropdown").classList.toggle("show");
}

let favouritesCache = null;

function clearFavouritesCache() {
  favouritesCache = null;
}

window.clearFavouritesCache = clearFavouritesCache;

async function syncFavouritesFromServer() {
  if (window.JarcadeAuth?.getToken()) {
    try {
      favouritesCache = await JarcadeAuth.fetchFavourites();
      localStorage.setItem('favourites', JSON.stringify(favouritesCache));
      return favouritesCache;
    } catch {
      /* fall through to local */
    }
  }
  favouritesCache = JSON.parse(localStorage.getItem('favourites') || '[]');
  return favouritesCache;
}

window.syncFavouritesFromServer = syncFavouritesFromServer;

function getFavourites() {
  if (favouritesCache) return favouritesCache;
  try {
    return JSON.parse(localStorage.getItem('favourites')) || [];
  } catch {
    return [];
  }
}

function saveFavourites(favourites) {
  favouritesCache = favourites;
  localStorage.setItem('favourites', JSON.stringify(favourites));
}

function setFavouriteState(element, isFavourite) {
  element.classList.toggle('fa-regular', !isFavourite);
  element.classList.toggle('fa-solid', isFavourite);
  element.classList.toggle('active', isFavourite);
}

async function toggleFavourite(element) {
  const gameCard = element.closest('.game');
  const gameName = gameCard.querySelector('.name').innerText;
  const gameImg = gameCard.querySelector('img')?.src || '';
  const playOverlay = gameCard.querySelector('.play-overlay');
  const onclickAttr = playOverlay?.getAttribute('onclick') || '';

  let favourites = getFavourites();
  const existingIndex = favourites.findIndex((f) => f.name === gameName);
  const isAdding = existingIndex === -1;

  try {
    if (window.JarcadeAuth?.getToken()) {
      if (isAdding) {
        await JarcadeAuth.addFavourite({ name: gameName, img: gameImg, onclick: onclickAttr });
      } else {
        await JarcadeAuth.removeFavourite(gameName);
      }
      favourites = await JarcadeAuth.fetchFavourites();
      saveFavourites(favourites);
    } else {
      if (isAdding) {
        favourites.push({ name: gameName, img: gameImg, onclick: onclickAttr });
      } else {
        favourites.splice(existingIndex, 1);
      }
      saveFavourites(favourites);
    }
  } catch (err) {
    showNotification(err.message || 'Could not update favourites.', 'error');
    return;
  }

  showNotification(
    isAdding ? `Added ${gameName} to favourites!` : `Removed ${gameName} from favourites!`,
    'success'
  );

  setFavouriteState(element, isAdding);
  element.classList.remove('heart-pop');
  void element.offsetWidth;
  element.classList.add('heart-pop');
}

window.setModalOpen = syncModalState;

// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.closest('.dropdown')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}

function showHelp() {
  showNotification("Help & Tutorials coming soon! Stay tuned.");
}

async function toggleLogin() {
  const isLogged = document.body.getAttribute('data-logged-in') === 'true';

  if (isLogged) {
    if (window.JarcadeAuth) {
      await JarcadeAuth.logout();
    } else {
      document.body.setAttribute('data-logged-in', 'false');
    }
    showNotification('Logged out successfully.');
    return;
  }

  window.location.href = 'login.html';
}

window.addEventListener('load', () => {
  initCategoryAutoscroll();
  initHorizontalScrolls();
});

document.addEventListener('DOMContentLoaded', () => {
  initializeGameVotes();

  if (window.JarcadeAuth?.whenReady) {
    JarcadeAuth.whenReady().then(() => syncFavouritesFromServer()).catch(() => {});
  } else {
    syncFavouritesFromServer().catch(() => {});
  }

  const searchInput = document.querySelector('.home-search-input');
  const gameCards = Array.from(document.querySelectorAll('.game'));

  if (searchInput && gameCards.length) {
    searchInput.addEventListener('input', (event) => {
      const searchTerm = event.target.value.trim().toLowerCase();

      gameCards.forEach((card) => {
        const name = card.querySelector('.name')?.textContent.toLowerCase() || '';
        const details = card.querySelector('.game-text')?.textContent.toLowerCase() || '';
        const matches = !searchTerm || name.includes(searchTerm) || details.includes(searchTerm);

        card.style.display = matches ? '' : 'none';
      });
    });
  }

  // --- HEADER SEARCH TOGGLE (Mobile) ---
  const searchToggle = document.getElementById('headerSearchToggle');
  const searchWrap = document.getElementById('headerSearchWrap');
  if (searchToggle && searchWrap) {
    searchToggle.addEventListener('click', () => {
      searchWrap.classList.toggle('expanded');
      if (searchWrap.classList.contains('expanded')) {
        const input = searchWrap.querySelector('input');
        if (input) input.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!searchWrap.contains(e.target) && !searchToggle.contains(e.target)) {
        searchWrap.classList.remove('expanded');
      }
    });
  }
});

function getVoteCounts() {
  try {
    return JSON.parse(localStorage.getItem(VOTE_STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveVoteCounts(votes) {
  localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(votes));
}

function getGameVoteKey(gameCard) {
  const name = gameCard.querySelector('.name')?.textContent;
  const overlayAction = gameCard.querySelector('.play-overlay')?.getAttribute('onclick');
  const image = gameCard.querySelector('img');

  return slugify(name || overlayAction || image?.alt || image?.src || 'game');
}

function formatVoteCount(count) {
  if (count >= 1000) {
    const formatted = (count / 1000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}K`;
  }

  return String(count);
}

function setVoteDisplay(counter, count) {
  const countEl = counter.querySelector('.count');
  const star = counter.querySelector('i');
  const isVoted = count > 0;

  counter.dataset.voted = isVoted ? 'true' : 'false';

  if (countEl) {
    countEl.innerText = formatVoteCount(count);
  }

  if (star) {
    star.classList.toggle('fa-regular', !isVoted);
    star.classList.toggle('fa-solid', isVoted);
  }
}

function createVoteCounter() {
  const counter = document.createElement('div');
  counter.className = 'card-rating';
  counter.setAttribute('onclick', 'incrementVote(this); event.stopPropagation();');
  counter.innerHTML = `
    <i class="fa-regular fa-star"></i>
    <span class="count">0</span>
  `;
  return counter;
}

function initializeGameVotes(scope) {
  const root = scope instanceof Element ? scope : document;
  const votes = getVoteCounts();

  root.querySelectorAll('.game').forEach((card) => {
    if (card.dataset.votesInit === '1') return;

    const imageWrap = card.querySelector('.game-img-div');
    if (!imageWrap) return;

    let counter = imageWrap.querySelector('.card-rating');
    if (!counter) {
      counter = createVoteCounter();
      imageWrap.appendChild(counter);
    }

    const voteKey = getGameVoteKey(card);
    const count = Number(votes[voteKey]) || 0;

    counter.dataset.voteKey = voteKey;
    setVoteDisplay(counter, count);
    card.dataset.votesInit = '1';
  });
}

function incrementVote(element) {
  const gameCard = element.closest('.game');
  const countEl = element.querySelector('.count');

  if (!gameCard || !countEl) {
    return;
  }

  const voteKey = element.dataset.voteKey || getGameVoteKey(gameCard);
  const votes = getVoteCounts();
  const hasVote = Number(votes[voteKey]) > 0;
  const nextCount = hasVote ? 0 : 1;

  if (nextCount === 0) {
    delete votes[voteKey];
  } else {
    votes[voteKey] = nextCount;
  }

  saveVoteCounts(votes);

  document.querySelectorAll('.card-rating').forEach((counter) => {
    if (counter.dataset.voteKey === voteKey) {
      setVoteDisplay(counter, nextCount);
    }
  });

  if (nextCount > 0) {
    element.classList.remove('star-burst');
    void element.offsetWidth;
    element.classList.add('star-burst');
    element.addEventListener('animationend', () => element.classList.remove('star-burst'), { once: true });
  }
}

function initCategoryAutoscroll() {
  const container = document.querySelector('.categories-container');
  const nextBtn = document.getElementById('nextCategoryBtn');
  const prevBtn = document.getElementById('prevCategoryBtn');

  if (!container) return;

  const originalItems = Array.from(container.children);
  originalItems.forEach((item) => {
    container.appendChild(item.cloneNode(true));
  });

  let baseSpeed = 0.35;
  let fastSpeed = 4;
  let currentSpeed = baseSpeed;
  let direction = 1;
  let isHovered = false;
  let isVisible = true;
  let actualScrollLeft = container.scrollLeft;

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
    },
    { threshold: 0.05 }
  );
  visibilityObserver.observe(container);

  container.addEventListener('mouseenter', () => { isHovered = true; });
  container.addEventListener('mouseleave', () => { isHovered = false; });
  container.addEventListener('touchstart', () => { isHovered = true; }, { passive: true });
  container.addEventListener('touchend', () => { isHovered = false; });

  if (nextBtn) {
    const startFastRight = () => { isHovered = false; currentSpeed = fastSpeed; direction = 1; };
    const stopFast = () => { currentSpeed = baseSpeed; direction = 1; };
    nextBtn.addEventListener('mouseenter', startFastRight);
    nextBtn.addEventListener('mouseleave', stopFast);
    nextBtn.addEventListener('mousedown', startFastRight);
    nextBtn.addEventListener('mouseup', stopFast);
  }

  if (prevBtn) {
    const startFastLeft = () => { isHovered = false; currentSpeed = fastSpeed; direction = -1; };
    const stopFast = () => { currentSpeed = baseSpeed; direction = 1; };
    prevBtn.addEventListener('mouseenter', startFastLeft);
    prevBtn.addEventListener('mouseleave', stopFast);
    prevBtn.addEventListener('mousedown', startFastLeft);
    prevBtn.addEventListener('mouseup', stopFast);
  }

  function animate() {
    if (!categoryScrollPaused && isVisible && (!isHovered || currentSpeed > baseSpeed)) {
      if (Math.abs(actualScrollLeft - container.scrollLeft) > 2) {
        actualScrollLeft = container.scrollLeft;
      }

      actualScrollLeft += direction * currentSpeed;
      const halfWidth = Math.floor(container.scrollWidth / 2);

      if (direction === 1 && actualScrollLeft >= halfWidth) {
        actualScrollLeft -= halfWidth;
      } else if (direction === -1 && actualScrollLeft <= 0) {
        actualScrollLeft += halfWidth;
      }

      container.scrollLeft = actualScrollLeft;
    }
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function initHorizontalScrolls() {
  // Handle Featured Hits specifically because it has dots
  const featuredTrack = document.querySelector('.featured-track-container');
  if (featuredTrack) {
    setupScrollContainer(featuredTrack, document.getElementById('nextFeaturedBtn'), document.getElementById('prevFeaturedBtn'), document.querySelectorAll('.p-dot'));
  }

  // Handle Adventure and Action
  const wrappers = document.querySelectorAll('.scroll-wrapper');
  wrappers.forEach(wrapper => {
    // If it's the featured hits wrapper, we already handled it above or it doesn't have the standard structure
    // actually let's just make it generic for all
    const track = wrapper.querySelector('.scroll, .featured-track-container');
    const nextBtn = wrapper.querySelector('.nav-btn.next');
    const prevBtn = wrapper.querySelector('.nav-btn.prev');
    const dots = wrapper.querySelectorAll('.p-dot'); // Might be empty for regular sections

    if (track && nextBtn && prevBtn) {
      setupScrollContainer(track, nextBtn, prevBtn, dots);
    }
  });
}



function setupScrollContainer(track, nextBtn, prevBtn, dots) {
  let scrollRaf = null;
  let speed = 0;
  let direction = 0;

  function scrollStep() {
    speed = Math.min(speed + 0.4, 8);
    track.scrollLeft += direction * speed;
    if (dots.length) updateDots(track, dots);
    scrollRaf = requestAnimationFrame(scrollStep);
  }

  function startScroll(dir) {
    direction = dir;
    speed = 1;
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(scrollStep);
  }

  function stopScroll() {
    direction = 0;
    speed = 0;
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
    }
  }

  nextBtn.addEventListener('mousedown', () => startScroll(1));
  prevBtn.addEventListener('mousedown', () => startScroll(-1));
  nextBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startScroll(1); });
  prevBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startScroll(-1); });

  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => {
    nextBtn.addEventListener(ev, stopScroll);
    prevBtn.addEventListener(ev, stopScroll);
  });

  if (dots.length) {
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        const pageWidth = track.clientWidth;
        track.scrollTo({ left: index * pageWidth, behavior: 'smooth' });
      });
    });
    track.addEventListener('scroll', () => updateDots(track, dots));
  }
}

function updateDots(track, dots) {
  if (!dots.length) return;
  const pageWidth = track.clientWidth || 1;
  const activeDot = Math.round(track.scrollLeft / pageWidth);
  dots.forEach((dot, i) => dot.classList.toggle('active', i === activeDot));
}

// =============================================
// MODAL CONTROLLERS & METADATA REGISTRY
// =============================================

const GAME_REGISTRY = {
  'god-of-war-betrayal': {
    company: 'Sony Pictures / Gameloft',
    lang: 'English, French, German, Spanish, Italian',
    touch: false,
    desc: 'Lead Kratos through epic mythological battles in this classic 2D side-scrolling action adventure. Wield the Blades of Athena, perform brutal combos, and solve ancient puzzles as you uncover a dark conspiracy in Greece before Norse times.'
  },
  'gangstar-rio': {
    company: 'Gameloft',
    lang: 'English, Portuguese, Spanish',
    touch: true,
    desc: 'Explore the vibrant city of Rio de Janeiro in this open-world crime adventure. Rule the streets, steal exotic cars, complete action-packed missions, and seek revenge against those who tried to assassinate you.'
  },
  'batman-the-dark-knight': {
    company: 'Gameloft',
    lang: 'English, French, German, Spanish',
    touch: false,
    desc: 'Become Gotham\'s Caped Crusader in the official J2ME game of The Dark Knight. Fight the Joker\'s henchmen, use stealth tactics, employ high-tech gadgets, and explore Gotham City across immersive side-scrolling levels.'
  },
  'plants-vs-zombies': {
    company: 'PopCap Games / EA',
    lang: 'English, Chinese',
    touch: true,
    desc: 'Get ready to soil your plants! Defend your lawn from a mob of fun-loving zombies in this acclaimed tower defence classic. Strategically place peashooters, wall-nuts, and cherry bombs to keep your brains safe from 26 types of zombies.'
  },
  'bounce-tales': {
    company: 'Nokia',
    lang: 'English, Finnish, German',
    touch: false,
    desc: 'Guide the legendary red bouncing ball, Bounce, through a colorful, vibrant dreamworld. Solve physics-based puzzles, defeat the evil Hypnotoid, and restore color and joy to the land in this nostalgic mobile platformer.'
  },
  'diamond-rush': {
    company: 'Gameloft',
    lang: 'English, Russian, French, German',
    touch: false,
    desc: 'Solve devious puzzles and collect shiny diamonds in ancient temples and dangerous ruins. Dodge falling boulders, escape deadly traps, and discover hidden passages in the jungles of Angkor Wat, Bavaria, and Siberia.'
  },
  'call-of-duty-2': {
    company: 'MForma / Activision',
    lang: 'English, French, German',
    touch: false,
    desc: 'Experience the intense, cinematic drama of World War II on your mobile device. Fight alongside your squad through historical missions, take cover from gunfire, and utilize authentic military weaponry to complete tactical objectives.'
  },
  'the-sims-3': {
    company: 'EA Mobile',
    lang: 'English, Spanish, French, German, Italian',
    touch: true,
    desc: 'Live your virtual life to the fullest in the palm of your hand. Customize your Sims, build their dream homes, pursue exciting careers, make friends, and guide their actions through life\'s ups and downs in this classic simulator.'
  },
  'asphalt-6-adrenaline': {
    company: 'Gameloft',
    lang: 'English, French, Italian, German, Spanish',
    touch: true,
    desc: 'Ignite your engine and feel the rush of Asphalt 6! Gather an elite garage of dream cars and bikes, challenge friends in high-speed races, and drift around exotic street circuits using nitrous boosts.'
  },
  'thor-the-dark-world': {
    company: 'Gameloft',
    lang: 'English, French, Spanish',
    touch: true,
    desc: 'Wield the mighty hammer Mjolnir as Thor, the God of Thunder, in this official action game. Save the Nine Realms from the Dark Elves led by Malekith, summon mighty allies, and battle through action-packed levels.'
  },
  'scarlottis-mafia-war': {
    company: 'Gameloft',
    lang: 'English',
    touch: false,
    desc: 'Enter the gritty underworld of 1930s America. Climb the ranks of the Scarlotti crime family, pull off daring bank heists, engage in intense drive-by shootouts, and defend your territory from rival mob factions.'
  },
  'doodle-jump': {
    company: 'Lima Sky',
    lang: 'English',
    touch: false,
    desc: 'Jump as high as you can in this incredibly addictive arcade classic! Tilt your device to guide the Doodler up from platform to platform, blast monsters with nose balls, and grab jetpacks for a massive speed boost.'
  }
};

let currentPendingGame = null;

function openChoiceModal(jar, className, canvasSize, mobileJar = null, mobileClassName = null, mobileCanvasSize = null) {
  currentPendingGame = {
    jar,
    className,
    canvasSize,
    mobileJar,
    mobileClassName,
    mobileCanvasSize,
    title: 'Awesome Game',
    desc: 'Get ready to play this classic game!',
    img: 'images/logo.webp',
    platform: 'desktop',
  };

  const e = typeof event !== 'undefined' ? event : null;
  const trigger = e?.currentTarget || e?.target;
  const gameCard = trigger?.closest?.('.game, .game-card');

  if (gameCard) {
    const titleEl = gameCard.querySelector('.name');
    const imgEl = gameCard.querySelector('img');
    const textEl = gameCard.querySelector('.game-text');

    if (titleEl) currentPendingGame.title = titleEl.innerText.trim();
    if (imgEl?.src) currentPendingGame.img = imgEl.src;

    const categoryKey = gameCard.dataset.category || '';
    if (categoryKey) {
      currentPendingGame.category = categoryKey
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    if (textEl) {
      const nameEl = textEl.querySelector('.name');
      const starEl = textEl.querySelector('.star');
      let desc = textEl.textContent || '';
      if (nameEl) desc = desc.replace(nameEl.textContent, '');
      if (starEl) desc = desc.replace(starEl.textContent, '');
      currentPendingGame.desc = desc.trim() || currentPendingGame.desc;
    }
  }

  const modal = document.getElementById('choiceModal');
  if (modal) modal.classList.add('show');
  syncModalState();
}

function closeChoiceModal() {
  const modal = document.getElementById('choiceModal');
  if (modal) modal.classList.remove('show');
  syncModalState();
}

function closeInfoModal() {
  const modal = document.getElementById('infoModal');
  if (modal) modal.classList.remove('show');
  syncModalState();
}

function startActualGame() {
  if (!currentPendingGame) return;
  if (!currentPendingGame.platform) currentPendingGame.platform = 'desktop';
  const useMobileVersion = currentPendingGame.platform === 'mobile' && currentPendingGame.mobileJar;
  const selectedJar = useMobileVersion ? currentPendingGame.mobileJar : currentPendingGame.jar;
  const selectedClassName = useMobileVersion ? (currentPendingGame.mobileClassName || currentPendingGame.className) : currentPendingGame.className;
  const selectedCanvasSize = useMobileVersion ? (currentPendingGame.mobileCanvasSize || currentPendingGame.canvasSize) : currentPendingGame.canvasSize;

  playGame(selectedJar, selectedClassName, selectedCanvasSize, currentPendingGame.platform);
  closeInfoModal();
}

function selectPlatform(platform) {
  if (!currentPendingGame) return;
  currentPendingGame.platform = platform;

  const key = slugify(currentPendingGame.title);
  const registryEntry = GAME_REGISTRY[key];
  const desc = registryEntry ? registryEntry.desc : (currentPendingGame.desc || 'Enjoy this classic retro mobile game right in your browser — no downloads, no installs required!');
  const company = registryEntry ? registryEntry.company : 'JARCADE / Emulator';
  const lang = registryEntry ? registryEntry.lang : 'English';
  const touchSupported = registryEntry ? registryEntry.touch : true;

  // --- Populate hero and thumbnail ---
  const titleEl = document.getElementById('infoTitle');
  const heroImgEl = document.getElementById('infoHeroImg');
  const thumbEl = document.getElementById('infoThumb');
  const textEl = document.getElementById('infoText');

  if (titleEl) titleEl.innerText = currentPendingGame.title;
  if (heroImgEl) heroImgEl.src = currentPendingGame.img;
  if (thumbEl) thumbEl.src = currentPendingGame.img;
  if (textEl) textEl.innerText = desc;

  // --- Genre & platform pills ---
  const isDesktop = platform === 'desktop';

  const genreBadge = document.getElementById('infoGenreBadge');
  if (genreBadge) genreBadge.textContent = currentPendingGame.category || 'ARCADE';

  const versionBadge = document.getElementById('infoVersionBadge');
  if (versionBadge) versionBadge.textContent = isDesktop ? 'DESKTOP' : 'MOBILE';

  // --- SYS_REQS rows ---
  const platLabel = document.getElementById('infoPlatformLabel');
  if (platLabel) platLabel.innerText = isDesktop ? 'Desktop Only' : 'Mobile';

  const langLabel = document.getElementById('infoLangLabel');
  if (langLabel) langLabel.innerText = lang;

  const companyLabel = document.getElementById('infoCompanyLabel');
  if (companyLabel) companyLabel.innerText = company;

  const touchVal = document.getElementById('infoTouchVal');
  const touchIcon = document.getElementById('infoTouchIcon');
  const touchLabel = document.getElementById('infoTouchLabel');

  if (touchVal) {
    touchVal.className = `info-sysreqs-val info-touch-val ${touchSupported ? 'touch-yes' : 'touch-no'}`;
  }
  if (touchIcon) {
    touchIcon.className = touchSupported ? 'fa-solid fa-hand-pointer' : 'fa-solid fa-keyboard';
  }
  if (touchLabel) {
    touchLabel.innerText = touchSupported ? 'Yes' : 'No (KB/M Req.)';
  }

  // --- Controls key grid ---
  const grid = document.getElementById('infoKeyGrid');
  if (grid) {
    grid.innerHTML = '';

    let keys = [];
    if (isDesktop) {
      keys = [
        { chip: '↑ ↓ ← →', desc: 'Move / Navigate' },
        { chip: 'Enter / OK', desc: 'Confirm / Select' },
        { chip: 'Backspace', desc: 'Go back / Cancel' },
        { chip: '1 – 9', desc: 'Numeric keypad input' },
        { chip: '0 / * / #', desc: 'Special keys' },
        { chip: 'L key', desc: 'Left soft key (menu)' },
        { chip: 'R key', desc: 'Right soft key (back)' },
        { chip: 'Mouse', desc: 'Tap & Swipe (touch games)' },
      ];
      const controlsTitle = document.getElementById('infoControlsTitle');
      if (controlsTitle) controlsTitle.innerText = 'INPUT_MATRIX // DESKTOP';
      const controlsNote = document.getElementById('infoControlsNote');
      if (controlsNote) {
        controlsNote.innerHTML = '💡 <strong>Soft Keys:</strong> The floating L and R buttons on the screen act as soft keys. Drag them to any position. On touch-screen games, click/swipe directly on the canvas.';
      }
    } else {
      keys = [
        { chip: 'D-pad', desc: 'Move / Navigate' },
        { chip: 'OK button', desc: 'Confirm / Select' },
        { chip: 'L button', desc: 'Left soft key' },
        { chip: 'R button', desc: 'Right soft key' },
        { chip: 'Drag L / R', desc: 'Reposition soft keys' },
        { chip: 'Tap screen', desc: 'Interact with touch games' },
      ];
      const controlsTitle = document.getElementById('infoControlsTitle');
      if (controlsTitle) controlsTitle.innerText = 'INPUT_MATRIX // MOBILE';
      const controlsNote = document.getElementById('infoControlsNote');
      if (controlsNote) {
        controlsNote.innerHTML = '📱 <strong>Soft Keys:</strong> Long-press and drag the L and R buttons to position them anywhere. On touch-screen games, tap/swipe directly on the game canvas.';
      }
    }

    keys.forEach(({ chip, desc }) => {
      const item = document.createElement('div');
      item.className = 'info-key-item';
      item.innerHTML = `<span class="info-key-desc">${desc}</span><span class="info-key-chip">${chip}</span>`;
      grid.appendChild(item);
    });
  }

  closeChoiceModal();
  const infoModal = document.getElementById('infoModal');
  if (infoModal) {
    infoModal.classList.add('show');
    syncModalState();
  }
}

// Global window event listeners to handle dismiss click on backdrops
window.addEventListener('click', (e) => {
  const choiceModal = document.getElementById('choiceModal');
  if (e.target === choiceModal) {
    closeChoiceModal();
  }
  const infoModal = document.getElementById('infoModal');
  if (e.target === infoModal) {
    closeInfoModal();
  }
});
