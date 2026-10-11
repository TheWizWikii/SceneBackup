// =========================================================
// Scene Backup — render engine
// Todo el contenido sale de data/games.json.
// Añadir un elemento nuevo = añadir un objeto a ese archivo.
// =========================================================

const DATA_URL = "data/games.json";
const PAGE_SIZE = 25;

// Colores neón por plataforma (etiqueta inferior de la card).
// Si añades una plataforma que no está aquí, usa "default"
// automáticamente — no hace falta tocar el código.
const PLATFORM_STYLES = {
  "pc":     { accent: "#00e5ff", cover: "assets/covers/placeholder-pc.svg" },
  "vita":   { accent: "#ff2ec4", cover: "assets/covers/placeholder-vita.svg" },
  "ps5":    { accent: "#833bff", cover: "assets/covers/placeholder-ps5.svg" },
  "ps4":    { accent: "#3b48ff", cover: "assets/covers/placeholder-default.svg" },
  "switch": { accent: "#e60012", cover: "assets/covers/placeholder-switch.svg" },
  "3ds":    { accent: "#39ff88", cover: "assets/covers/placeholder-3ds.svg" },
  "xbox":   { accent: "#107c10", cover: "assets/covers/placeholder-default.svg" },
  "ps3":    { accent: "#3b8dff", cover: "assets/covers/placeholder-default.svg" },
  "default":{ accent: "#ffd400", cover: "assets/covers/placeholder-default.svg" },
};

// Icono por categoría (etiqueta superior de la card). Igual que con
// las plataformas: cualquier categoría nueva que escribas en el JSON
// usa "default" automáticamente sin tocar nada más.
const CATEGORY_ICONS = {
  "port":     "🎮",
  "emulador": "🕹️",
  "app":      "🧩",
  "default":  "📦",
};

const state = {
  games: [],
  activeCategory: "ALL",
  activePlatform: "ALL",
  query: "",
  sort: "date-desc",
  page: 1,
  lastFocused: null, // elemento al que devolver el foco al cerrar el modal
};

const els = {
  grid: document.getElementById("grid"),
  categoryBar: document.getElementById("category-filterbar"),
  platformBar: document.getElementById("platform-filterbar"),
  emptyState: document.getElementById("empty-state"),
  pagination: document.getElementById("pagination"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  statTotal: document.getElementById("stat-total"),
  statPlatforms: document.getElementById("stat-platforms"),
  statLatest: document.getElementById("stat-latest"),
  modalOverlay: document.getElementById("modal-overlay"),
  modalClose: document.getElementById("modal-close"),
  modalCover: document.getElementById("modal-cover"),
  modalCategoryTag: document.getElementById("modal-category-tag"),
  modalPlatformTag: document.getElementById("modal-platform-tag"),
  modalTitle: document.getElementById("modal-title"),
  modalMeta: document.getElementById("modal-meta"),
  modalDesc: document.getElementById("modal-desc"),
  modalLinks: document.getElementById("modal-links"),
};

function platformStyle(platform) {
  return PLATFORM_STYLES[(platform || "").toLowerCase()] || PLATFORM_STYLES.default;
}

function categoryIcon(category) {
  return CATEGORY_ICONS[(category || "").toLowerCase()] || CATEGORY_ICONS.default;
}

// Un enlace "cuenta" solo si de verdad trae algo escrito.
function hasLink(url) {
  return typeof url === "string" && url.trim() !== "";
}

// Compatibilidad hacia atrás: si una entrada no trae "category",
// se trata como "Port" para no romper datos ya existentes. También
// se le asigna un id estable (su posición en el JSON) para poder
// encontrarla de nuevo al abrir el modal de detalle.
function normalize(game, idx) {
  return { category: "Port", ...game, _id: idx };
}

function formatDate(iso) {
  if (!iso) return "sin fecha";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "2-digit" });
}

async function loadGames() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    state.games = raw.map((g, idx) => normalize(g, idx));
  } catch (err) {
    console.error("No se pudo cargar data/games.json:", err);
    els.emptyState.hidden = false;
    els.emptyState.textContent =
      "No se pudieron cargar los datos. Si estás abriendo index.html directamente desde el " +
      "explorador de archivos, algunos navegadores bloquean la carga de JSON local: " +
      "levanta un servidor simple (por ejemplo `python3 -m http.server`) o súbelo a GitHub Pages.";
    return;
  }
  buildCategoryBar();
  buildPlatformBar();
  renderStats();
  render();
}

function makeFilterBtn(label, value, isActive, accent, onClick) {
  const btn = document.createElement("button");
  btn.className = "filter-btn";
  btn.type = "button";
  btn.textContent = label;
  btn.dataset.value = value;
  if (accent) btn.style.setProperty("--accent", accent);
  if (isActive) btn.classList.add("is-active");
  btn.addEventListener("click", onClick);
  return btn;
}

function buildCategoryBar() {
  const categories = [...new Set(state.games.map(g => g.category))].sort();

  els.categoryBar.innerHTML = "";
  els.categoryBar.appendChild(
    makeFilterBtn("Todo", "ALL", state.activeCategory === "ALL", null, () => selectCategory("ALL"))
  );
  categories.forEach(cat => {
    const label = `${categoryIcon(cat)} ${cat}`;
    els.categoryBar.appendChild(
      makeFilterBtn(label, cat, state.activeCategory === cat, null, () => selectCategory(cat))
    );
  });
}

function selectCategory(value) {
  state.activeCategory = value;
  state.activePlatform = "ALL"; // evita quedarte en un filtro de sistema sin resultados
  state.page = 1;
  buildCategoryBar();
  buildPlatformBar();
  render();
}

function buildPlatformBar() {
  // Solo se muestran las plataformas presentes dentro de la categoría activa,
  // así el usuario nunca ve un filtro que va a dar 0 resultados.
  const gamesInCategory = state.activeCategory === "ALL"
    ? state.games
    : state.games.filter(g => g.category === state.activeCategory);

  const platforms = [...new Set(gamesInCategory.map(g => g.platform))].sort();

  els.platformBar.innerHTML = "";
  els.platformBar.appendChild(
    makeFilterBtn("Todos", "ALL", state.activePlatform === "ALL", null, () => selectPlatform("ALL"))
  );
  platforms.forEach(p => {
    els.platformBar.appendChild(
      makeFilterBtn(p, p, state.activePlatform === p, platformStyle(p).accent, () => selectPlatform(p))
    );
  });
}

function selectPlatform(value) {
  state.activePlatform = value;
  state.page = 1;
  buildPlatformBar();
  render();
}

function renderStats() {
  const platforms = new Set(state.games.map(g => g.platform));
  els.statTotal.textContent = state.games.length;
  els.statPlatforms.textContent = platforms.size;

  const latest = [...state.games]
    .filter(g => g.releaseDate)
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))[0];
  els.statLatest.textContent = latest ? latest.title : "—";
}

function getFilteredSorted() {
  let list = state.games.filter(g => {
    const matchesCategory = state.activeCategory === "ALL" || g.category === state.activeCategory;
    const matchesPlatform = state.activePlatform === "ALL" || g.platform === state.activePlatform;
    const matchesQuery = g.title.toLowerCase().includes(state.query.toLowerCase());
    return matchesCategory && matchesPlatform && matchesQuery;
  });

  list.sort((a, b) => {
    if (state.sort === "title-asc") return a.title.localeCompare(b.title);
    const da = new Date(a.releaseDate || 0);
    const db = new Date(b.releaseDate || 0);
    return state.sort === "date-asc" ? da - db : db - da;
  });

  return list;
}

function cardTemplate(game) {
  const style = platformStyle(game.platform);
  const cover = game.cover || style.cover;

  const quickDownload = hasLink(game.downloadUrl)
    ? `<a class="card__link card__link--primary card__quick-download" href="${game.downloadUrl}" target="_blank" rel="noopener" data-role="quick-download">⬇ Descargar</a>`
    : "";

  return `
    <article class="card" data-id="${game._id}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="Ver detalles de ${game.title}">
      <div class="card__cover">
        <img src="${cover}" alt="Captura de ${game.title}" loading="lazy">
        <span class="card__category-tag">${categoryIcon(game.category)} ${game.category}</span>
        <span class="card__platform-tag" style="--tag:${style.accent}">${game.platform}</span>
      </div>
      <div class="card__body">
        <h3 class="card__title">${game.title}</h3>
        <div class="card__meta">
          <span><strong>v</strong>${game.version || "—"}</span>
          <span>${formatDate(game.releaseDate)}</span>
        </div>
        ${game.description ? `<p class="card__desc">${game.description}</p>` : ""}
        <div class="card__footer">
          ${quickDownload}
          <span class="card__hint">Ver detalles →</span>
        </div>
      </div>
      <div class="card__underglow" aria-hidden="true"></div>
    </article>
  `;
}

function render() {
  const filtered = getFilteredSorted();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  els.grid.innerHTML = pageItems.map(cardTemplate).join("");
  els.emptyState.hidden = filtered.length !== 0;
  if (filtered.length === 0) {
    els.emptyState.textContent = "Nada coincide con ese filtro o búsqueda.";
  }

  buildPagination(totalPages);
}

// --- Paginación ------------------------------------------------
// Ventana de páginas tipo "1 … 4 5 6 … 12": siempre se ven la
// primera, la última, la actual y sus vecinas inmediatas.
function pageWindow(current, total) {
  const keep = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...keep].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);

  const result = [];
  let prev = null;
  sorted.forEach(p => {
    if (prev !== null && p - prev > 1) result.push("...");
    result.push(p);
    prev = p;
  });
  return result;
}

function buildPagination(totalPages) {
  els.pagination.innerHTML = "";

  if (totalPages <= 1) {
    els.pagination.hidden = true;
    return;
  }
  els.pagination.hidden = false;

  const addBtn = (label, page, { active = false, disabled = false } = {}) => {
    const btn = document.createElement("button");
    btn.className = "page-btn";
    btn.type = "button";
    btn.textContent = label;
    if (active) btn.classList.add("is-active");
    btn.disabled = disabled;
    if (!disabled) btn.addEventListener("click", () => goToPage(page));
    els.pagination.appendChild(btn);
  };

  const addEllipsis = () => {
    const span = document.createElement("span");
    span.className = "page-ellipsis";
    span.textContent = "…";
    els.pagination.appendChild(span);
  };

  addBtn("‹", state.page - 1, { disabled: state.page === 1 });
  pageWindow(state.page, totalPages).forEach(p => {
    if (p === "...") addEllipsis();
    else addBtn(String(p), p, { active: p === state.page });
  });
  addBtn("›", state.page + 1, { disabled: state.page === totalPages });
}

function goToPage(page) {
  state.page = page;
  render();
  els.grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- Modal de detalle --------------------------------------------
function openModal(game) {
  const style = platformStyle(game.platform);
  const cover = game.cover || style.cover;

  els.modalCover.src = cover;
  els.modalCover.alt = `Captura de ${game.title}`;
  els.modalCategoryTag.textContent = `${categoryIcon(game.category)} ${game.category}`;
  els.modalPlatformTag.textContent = game.platform;
  els.modalPlatformTag.style.setProperty("--tag", style.accent);
  els.modalTitle.textContent = game.title;
  els.modalMeta.innerHTML = `
    <span><strong>v</strong>${game.version || "—"}</span>
    <span>${formatDate(game.releaseDate)}</span>
  `;
  els.modalDesc.textContent = game.description || "Sin descripción disponible todavía.";

  const downloadBtn = hasLink(game.downloadUrl)
    ? `<a class="card__link card__link--primary" href="${game.downloadUrl}" target="_blank" rel="noopener">Descargar</a>`
    : "";
  const sourceBtn = hasLink(game.sourceUrl)
    ? `<a class="card__link card__link--secondary" href="${game.sourceUrl}" target="_blank" rel="noopener">Código fuente</a>`
    : "";
  els.modalLinks.innerHTML = (downloadBtn + sourceBtn) ||
    `<p class="card__hint">No hay enlaces disponibles todavía.</p>`;

  state.lastFocused = document.activeElement;
  els.modalOverlay.hidden = false;
  els.modalClose.focus();
  document.body.style.overflow = "hidden";
}

function closeModal() {
  els.modalOverlay.hidden = true;
  document.body.style.overflow = "";
  if (state.lastFocused && typeof state.lastFocused.focus === "function") {
    state.lastFocused.focus();
  }
}

function openModalById(id) {
  const game = state.games.find(g => g._id === id);
  if (game) openModal(game);
}

els.modalClose.addEventListener("click", closeModal);

els.modalOverlay.addEventListener("click", e => {
  if (e.target === els.modalOverlay) closeModal();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !els.modalOverlay.hidden) closeModal();
});

// Delegación de eventos sobre la rejilla: un único listener para
// todas las cards (las que haya ahora y las que se generen después).
els.grid.addEventListener("click", e => {
  // El botón de descarga rápida tiene su propio comportamiento (abre
  // el enlace en una pestaña nueva) y no debe además abrir el modal.
  if (e.target.closest('[data-role="quick-download"]')) return;

  const card = e.target.closest(".card");
  if (!card) return;
  openModalById(Number(card.dataset.id));
});

els.grid.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  // Dejar que el enlace de descarga rápida gestione su propio Enter.
  if (e.target.closest('[data-role="quick-download"]')) return;

  const card = e.target.closest(".card");
  if (!card) return;
  e.preventDefault();
  openModalById(Number(card.dataset.id));
});

els.search.addEventListener("input", e => {
  state.query = e.target.value;
  state.page = 1;
  render();
});

els.sort.addEventListener("change", e => {
  state.sort = e.target.value;
  state.page = 1;
  render();
});

loadGames();
