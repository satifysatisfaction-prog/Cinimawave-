// CineWorld app.js
// Expects Firebase Realtime Database with this structure:
//   /movies/{id}:      { title, category: "Movie" | "Series", poster, description, year, genre, videos }
//       videos: array or object of { title, url }
//   /promotions/{id}:  { title, image, text, movieId }

let movies = [];
let promotions = [];
let currentCategory = 'All';

const $ = (id) => document.getElementById(id);

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function safeUrl(url) {
  try {
    const u = new URL(url, location.href);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch { return ''; }
}

function toList(val) {
  if (!val) return [];
  return Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
}

/* ---------- Navigation ---------- */
function scrollToSection(id) {
  const el = $(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setCategory(name, btn) {
  currentCategory = name;
  document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMovies();
}

function setCategoryByName(name) {
  const chip = [...document.querySelectorAll('.chip')]
    .find((c) => c.textContent.trim().toLowerCase().startsWith(name.toLowerCase()));
  setCategory(name, chip);
  scrollToSection('movies');
}

/* ---------- Rendering ---------- */
function renderMovies() {
  const list = $('movieList');
  const q = ($('searchInput').value || '').trim().toLowerCase();

  const filtered = movies.filter((m) => {
    const catOk = currentCategory === 'All' || m.category === currentCategory;
    const textOk = !q || `${m.title} ${m.genre || ''}`.toLowerCase().includes(q);
    return catOk && textOk;
  });

  $('resultCount').textContent = `${filtered.length} title${filtered.length === 1 ? '' : 's'}`;

  if (!filtered.length) {
    list.innerHTML = '<div class="empty">No titles found.</div>';
    return;
  }

  list.innerHTML = filtered.map((m) => `
    <div class="card" data-id="${esc(m.id)}">
      <img src="${esc(safeUrl(m.poster))}" alt="${esc(m.title)}" loading="lazy">
      <h3>${esc(m.title)}</h3>
      <p>${esc(m.category || '')}${m.year ? ' · ' + esc(m.year) : ''}</p>
    </div>
  `).join('');
}

function renderPromotions() {
  const list = $('promotionList');
  if (!promotions.length) {
    list.innerHTML = '<div class="empty">No promotions right now.</div>';
    return;
  }
  list.innerHTML = promotions.map((p) => `
    <div class="promo" data-movie="${esc(p.movieId || '')}">
      ${p.image ? `<img src="${esc(safeUrl(p.image))}" alt="${esc(p.title)}" loading="lazy">` : ''}
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.text || '')}</p>
    </div>
  `).join('');
}

/* ---------- Details modal ---------- */
function openDetails(id) {
  const m = movies.find((x) => x.id === id);
  if (!m) return;
  const videos = toList(m.videos);

  $('detailContent').innerHTML = `
    <h2>${esc(m.title)}</h2>
    <p class="muted">${esc(m.category || '')}${m.year ? ' · ' + esc(m.year) : ''}${m.genre ? ' · ' + esc(m.genre) : ''}</p>
    <p style="margin:14px 0">${esc(m.description || 'No description available.')}</p>
    <div>
      ${videos.length
        ? videos.map((v, i) => `
            <button class="primary" style="margin:0 8px 8px 0"
              data-play="${esc(m.id)}" data-index="${i}">
              ▶ ${esc(v.title || 'Play ' + (i + 1))}
            </button>`).join('')
        : '<p class="muted">No videos available yet.</p>'}
    </div>
  `;
  $('detailModal').classList.add('show');
}

function closeModal(id) {
  $(id).classList.remove('show');
}

/* ---------- Player ---------- */
function openPlayer(movieId, index) {
  const m = movies.find((x) => x.id === movieId);
  const v = m && toList(m.videos)[index];
  const url = v && safeUrl(v.url);
  if (!url) return;

  $('playerTitle').textContent = `${m.title}${v.title ? ' — ' + v.title : ''}`;
  const player = $('videoPlayer');
  player.src = url;
  closeModal('detailModal');
  $('playerModal').classList.add('show');
  player.play().catch(() => {});
}

function closePlayer() {
  const player = $('videoPlayer');
  player.pause();
  player.removeAttribute('src');
  player.load();
  closeModal('playerModal');
}

/* ---------- Events ---------- */
document.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) return openDetails(card.dataset.id);

  const promo = e.target.closest('.promo');
  if (promo && promo.dataset.movie) return openDetails(promo.dataset.movie);

  const play = e.target.closest('[data-play]');
  if (play) openPlayer(play.dataset.play, Number(play.dataset.index));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal('detailModal');
    closePlayer();
  }
});

/* ---------- Firebase ---------- */
function setStatus(text) {
  const el = $('connectionStatus');
  if (el) el.textContent = text;
}

function initData() {
  if (typeof firebase === 'undefined' || !firebase.apps.length) {
    setStatus('Firebase is not configured. Check firebase-config.js.');
    $('movieList').innerHTML = '<div class="empty">Unable to connect.</div>';
    $('promotionList').innerHTML = '<div class="empty">Unable to connect.</div>';
    return;
  }

  const db = firebase.database();

  db.ref('.info/connected').on('value', (snap) => {
    setStatus(snap.val() ? 'Connected' : 'Connecting...');
  });

  db.ref('movies').on('value', (snap) => {
    const data = snap.val() || {};
    movies = Object.entries(data).map(([id, m]) => ({ id, ...m }));
    renderMovies();
  }, () => {
    $('movieList').innerHTML = '<div class="empty">Could not load titles.</div>';
  });

  db.ref('promotions').on('value', (snap) => {
    const data = snap.val() || {};
    promotions = Object.entries(data).map(([id, p]) => ({ id, ...p }));
    renderPromotions();
  }, () => {
    $('promotionList').innerHTML = '<div class="empty">Could not load promotions.</div>';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  $('year').textContent = new Date().getFullYear();
  initData();
});
