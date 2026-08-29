// =========================================================
// Scene Backup — render engine
// Todo el contenido sale de data/games.json.
// Añadir un elemento nuevo = añadir un objeto a ese archivo.
// =========================================================

const DATA_URL = "data/games.json";

// Colores neón por plataforma (etiqueta inferior de la card).
// Si añades una plataforma que no está aquí, usa "default"
// automáticamente — no hace falta tocar el código.
const PLATFORM_STYLES = {
  "pc":     { accent: "#00e5ff", cover: "assets/covers/placeholder-pc.svg" },
  "vita":   { accent: "#ff2ec4", cover: "assets/covers/placeholder-vita.svg" },
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
};

const els = {
  grid: document.getElementById("grid"),
  categoryBar: document.getElementById("category-filterbar"),
  platformBar: document.getElementById("platform-filterbar"),
  emptyState: document.getElementById("empty-state"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  statTotal: document.getElementById("stat-total"),
  statPlatforms: document.getElementById("stat-platforms"),
  statLatest: document.getElementById("stat-latest"),
};

function platformStyle(platform) {
  return PLATFORM_STYLES[(platform || "").toLowerCase()] || PLATFORM_STYLES.default;
}

function categoryIcon(category) {
  return CATEGORY_ICONS[(category || "").toLowerCase()] || CATEGORY_ICONS.default;
}

// Compatibilidad hacia atrás: si una entrada no trae "category",
// se trata como "Port" para no romper datos ya existentes.
function normalize(game) {
  return { category: "Port", ...game };
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
    state.games = raw.map(normalize);
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

  const sourceLink = game.sourceUrl
    ? `<a class="card__link card__link--secondary" href="${game.sourceUrl}" target="_blank" rel="noopener">Código</a>`
    : "";

  return `
    <article class="card">
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
        <div class="card__links">
          <a class="card__link card__link--primary" href="${game.downloadUrl}" target="_blank" rel="noopener">Descargar</a>
          ${sourceLink}
        </div>
      </div>
      <div class="card__underglow" aria-hidden="true"></div>
    </article>
  `;
}

function render() {
  const list = getFilteredSorted();
  els.grid.innerHTML = list.map(cardTemplate).join("");
  els.emptyState.hidden = list.length !== 0;
  if (list.length === 0) {
    els.emptyState.textContent = "Nada coincide con ese filtro o búsqueda.";
  }
}

els.search.addEventListener("input", e => {
  state.query = e.target.value;
  render();
});

els.sort.addEventListener("change", e => {
  state.sort = e.target.value;
  render();
});

loadGames();
