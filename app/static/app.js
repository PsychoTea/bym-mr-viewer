const TOKEN_STORAGE_KEY = "bym-mr-viewer-token";
const SESSION_CACHE_DB_NAME = "bym-mr-viewer-session-cache";
const SESSION_CACHE_STORE_NAME = "entries";
const SESSION_CACHE_SESSION_KEY = "bym-mr-viewer-session-id";
const FULL_MAP_CACHE_VERSION = 1;
const FULL_MAP_CACHE_KEY_PREFIX = "bym-mr-viewer-full-map";
const SEARCH_RESULT_LIMIT = 100;

const MR3 = {
  mapWidth: 500,
  mapHeight: 500,
  hexWidth: 104,
  hexHeight: 68,
  hexOverlap: 50,
  fullMapChunkSize: 1000,
  fullMapConcurrency: 8,
  bufferX: 30,
  bufferY: 30,
  blockedCellStartingHeight: 51,
  yardTypes: {
    empty: 100,
    player: 101,
    resource: 102,
    stronghold: 103,
    fortification: 104,
    border: 127,
  },
  relationships: {
    self: 0,
    enemy: 1,
    ally: 2,
    neutral: 3,
    none: 7,
  },
};

const FLOOR_HEX_VERTICES = [
  [52, 3],
  [101, 19],
  [101, 49],
  [52, 65],
  [3, 49],
  [3, 19],
];

// The range overlay uses a geometric hex that must tile cleanly across the
// staggered 104x50 MR3 grid. The bottom point is one pixel shorter than the
// full sprite height so diagonal neighbors share an identical edge.
const RANGE_HEX_VERTICES = [
  [52, 0],
  [104, 17],
  [104, 50],
  [52, 67],
  [0, 50],
  [0, 17],
];

const RANGE_HEX_EDGES = RANGE_HEX_VERTICES.map((_, index) => [
  index,
  (index + 1) % RANGE_HEX_VERTICES.length,
]);

const TILE_DEFINITIONS = [
  { src: "worldmap/tiles/clover01.png", min: 32, max: 35 },
  { src: "worldmap/tiles/clover02.png", min: 35, max: 38 },
  { src: "worldmap/tiles/clover03.png", min: 38, max: 41 },
  { src: "worldmap/tiles/clover04.png", min: 41, max: 44 },
  { src: "worldmap/tiles/clover05.png", min: 44, max: 47 },
  { src: "worldmap/tiles/clover06.png", min: 47, max: 50 },
  { src: "worldmap/tiles/brownplant01.png", min: 50, max: 52 },
  { src: "worldmap/tiles/brownplant02.png", min: 52, max: 54 },
  { src: "worldmap/tiles/brownplant03.png", min: 54, max: 56 },
  { src: "worldmap/tiles/brownplant04.png", min: 56, max: 58 },
  { src: "worldmap/tiles/brownplant05.png", min: 58, max: 60 },
  { src: "worldmap/tiles/greenplant01.png", min: 60, max: 62 },
  { src: "worldmap/tiles/greenplant02.png", min: 62, max: 64 },
  { src: "worldmap/tiles/greenplant03.png", min: 64, max: 66 },
  { src: "worldmap/tiles/greenplant04.png", min: 66, max: 68 },
  { src: "worldmap/tiles/greenplant05.png", min: 68, max: 70 },
  { src: "worldmap/tiles/spiky01.png", min: 70, max: 71 },
  { src: "worldmap/tiles/spiky02.png", min: 71, max: 72 },
  { src: "worldmap/tiles/spiky03.png", min: 72, max: 73 },
  { src: "worldmap/tiles/spiky04.png", min: 73, max: 75 },
  { src: "worldmap/tiles/spiky05.png", min: 75, max: 77 },
  { src: "worldmap/tiles/spiky06.png", min: 77, max: 79 },
  { src: "worldmap/tiles/spiky07.png", min: 78, max: 80 },
  { src: "worldmap/tiles/borderplant01.png", min: 99, max: 100 },
  { src: "worldmap/tiles/borderplant02.png", min: 99, max: 100 },
  { src: "worldmap/tiles/borderplant03.png", min: 99, max: 100 },
  { src: "worldmap/tiles/borderplant04.png", min: 99, max: 100 },
  { src: "worldmap/tiles/borderplant05.png", min: 99, max: 100 },
];

const ASSET_PATHS = {
  background: "worldmap/background.jpg",
  damageBar: "worldmap/cell_health_bar.png",
  overlayBlue: "worldmap/overlays/glow_blue.png",
  overlayGreen: "worldmap/overlays/glow_green.png",
  overlayRed: "worldmap/overlays/glow_red.png",
  overlayYellow: "worldmap/overlays/glow_yellow.png",
  playerBase: "worldmap/icons/player_base.png",
  resourceCell: "worldmap/icons/resource_cell.png",
  stronghold: "worldmap/icons/guard_tower.png",
  wildMonsterBase: "worldmap/icons/wild_monster_base_v2.png",
  fortification: "worldmap/icons/fortification_v2.png",
  fortificationEast: "worldmap/icons/fortification_east_v2.png",
  fortificationWest: "worldmap/icons/fortification_west_v2.png",
  fortificationNorthEast: "worldmap/icons/fortification_north_east_v2.png",
  fortificationNorthWest: "worldmap/icons/fortification_north_west_v2.png",
  fortificationSouthEast: "worldmap/icons/fortification_south_east_v2.png",
  fortificationSouthWest: "worldmap/icons/fortification_south_west_v2.png",
  fortificationLightBlue: "worldmap/icons/fortification_light_blue_v2.png",
  fortificationLightGreen: "worldmap/icons/fortification_light_green_v2.png",
  fortificationLightRed: "worldmap/icons/fortification_light_red_v2.png",
  fortificationLightYellow: "worldmap/icons/fortification_light_yellow_v2.png",
  fullyFortifiedBack: "worldmap/icons/fully_fortified_back.png",
  fullyFortifiedFront: "worldmap/icons/fully_fortified_front.png",
  damageProtection: "worldmap/icons/damage_protection.png",
};

const TYPE_FILTER_OPTIONS = [
  { key: "outpost", label: "Outpost" },
  { key: "resource", label: "Resource outpost" },
  { key: "stronghold", label: "Stronghold" },
];

const TRIBE_FILTER_OPTIONS = [
  { key: "kozu", label: "Kozu" },
  { key: "legionnaire", label: "Legionnaire" },
  { key: "abunakki", label: "Abunakki" },
  { key: "dreadnaut", label: "Dreadnaut" },
];

const TRIBE_KEY_BY_ID = {
  0: "legionnaire",
  1: "kozu",
  2: "abunakki",
  3: "dreadnaut",
};

const FORTIFICATION_DIRECTIONS = [
  { key: "fortificationEast", dx: 1, dy: 0 },
  { key: "fortificationWest", dx: -1, dy: 0 },
  { key: "fortificationNorthEast", dx: "oddRight", dy: -1 },
  { key: "fortificationNorthWest", dx: "oddLeft", dy: -1 },
  { key: "fortificationSouthEast", dx: "oddRight", dy: 1 },
  { key: "fortificationSouthWest", dx: "oddLeft", dy: 1 },
];

class ApiClient {
  async getConfig() {
    return fetchJson("/api/config");
  }

  async login(email, password) {
    return fetchJson("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
  }

  async refresh(token) {
    return fetchJson("/api/auth/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getWorlds() {
    return fetchJson("/api/worlds");
  }

  async getLeaderboard(worldId, mapVersion = 3) {
    return fetchJson(
      `/api/leaderboards?worldid=${encodeURIComponent(worldId)}&mapversion=${mapVersion}`,
    );
  }

  async getMapInit(token) {
    return fetchJson("/api/map/init", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getMapCells(token, cellIds) {
    return fetchJson("/api/map/cells", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cellids: cellIds }),
    });
  }
}

class AssetCache {
  constructor(config) {
    this.config = config;
    this.images = new Map();
  }

  async preload() {
    const assetList = new Set([...Object.values(ASSET_PATHS), ...TILE_DEFINITIONS.map((tile) => tile.src)]);
    await Promise.all(
      [...assetList].map(async (path) => {
        const image = await this.loadImage(path);
        if (image) {
          this.images.set(path, image);
        }
      }),
    );
  }

  urlFor(path) {
    return `${this.config.cdnBaseUrl}/assets/${path}`;
  }

  get(path) {
    return this.images.get(path) || null;
  }

  async loadImage(path) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = this.urlFor(path);
    });
  }

  pickTile(cell, cellIndex) {
    const altitude = Number(cell.i ?? 0);
    const options = TILE_DEFINITIONS.filter((tile) => altitude >= tile.min && altitude <= tile.max);

    if (!options.length) {
      return null;
    }

    let hash = cellIndex | 0;
    hash ^= hash << 21;
    hash ^= hash >>> 3;
    hash ^= hash << 4;
    const tile = options[Math.abs(hash) % options.length];
    return this.get(tile.src);
  }
}

class MapRenderer {
  constructor({ canvas, overlayEl, coordsEl, statusEl, assets, api, onHoverCell, onSelectCell }) {
    this.canvas = canvas;
    this.overlayEl = overlayEl;
    this.coordsEl = coordsEl;
    this.statusEl = statusEl;
    this.assets = assets;
    this.api = api;
    this.onHoverCell = onHoverCell;
    this.onSelectCell = onSelectCell;

    this.ctx = this.canvas.getContext("2d");
    this.token = null;
    this.currentUserId = null;
    this.mapMeta = null;
    this.cellCache = new Map();
    this.homeCellKey = null;
    this.hoveredCellKey = null;
    this.selectedCellKey = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.zoomAnimationFrame = 0;
    this.panAnimationFrame = 0;
    this.pendingFetch = false;
    this.fetchTimer = null;
    this.fullMapLoaded = false;
    this.fullMapPreloading = false;
    this.fullMapCacheKey = null;
    this.baseFilter = createEmptyRendererBaseFilter();
    this.dragging = false;
    this.dragMoved = false;
    this.dragLastPoint = null;
    this.lastPointer = { x: 0, y: 0 };

    this.canvas.addEventListener("pointerdown", (event) => this.handlePointerDown(event));
    this.canvas.addEventListener("pointermove", (event) => this.handlePointerMove(event));
    this.canvas.addEventListener("pointerup", () => this.handlePointerUp());
    this.canvas.addEventListener("pointerleave", () => this.handlePointerLeave());
    this.canvas.addEventListener("wheel", (event) => this.handleWheel(event), { passive: false });
    window.addEventListener("resize", () => this.render());
  }

  async bootstrap(session) {
    this.cancelAnimations();
    this.token = session.token;
    this.currentUserId = Number(session.user.userid || 0);
    this.mapMeta = session.map;
    this.cellCache.clear();
    this.fullMapLoaded = false;
    this.fullMapPreloading = false;
    this.fullMapCacheKey = buildFullMapCacheKey(this.currentUserId, this.mapMeta);
    this.homeCellKey = null;
    this.hoveredCellKey = null;
    this.selectedCellKey = null;
    this.zoom = 1;
    this.setOverlay("Loading live MR3 data...");
    this.setCoordinatesDisplay(null);

    const initResponse = await this.api.getMapInit(this.token);
    this.mergeCells(initResponse.celldata || []);

    const homeCell = (initResponse.celldata || [])[0] || null;
    if (homeCell) {
      this.homeCellKey = cellKey(homeCell.x, homeCell.y);
      this.centerOnCell(homeCell.x, homeCell.y);
      this.selectedCellKey = this.homeCellKey;
      this.onSelectCell(this.getSelectedCell());
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }

    this.render();

    const restored = await this.restoreFullMapCache();
    if (!restored) {
      await this.preloadEntireMap();
    } else {
      this.fullMapLoaded = true;
    }

    this.setOverlay("");
    this.render();
  }

  reset(message) {
    this.cancelAnimations();
    this.token = null;
    this.currentUserId = null;
    this.mapMeta = null;
    this.cellCache.clear();
    this.homeCellKey = null;
    this.hoveredCellKey = null;
    this.selectedCellKey = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.pendingFetch = false;
    this.fullMapLoaded = false;
    this.fullMapPreloading = false;
    if (this.fetchTimer) {
      window.clearTimeout(this.fetchTimer);
      this.fetchTimer = null;
    }
    this.fullMapCacheKey = null;
    this.baseFilter = createEmptyRendererBaseFilter();
    this.dragging = false;
    this.dragMoved = false;
    this.setOverlay(message);
    this.setCoordinatesDisplay(null);
    this.onHoverCell(null);
    this.onSelectCell(null);
    this.render();
  }

  getSelectedCell() {
    return this.selectedCellKey ? this.cellCache.get(this.selectedCellKey) || null : null;
  }

  setBaseFilter(filter) {
    this.baseFilter = normalizeRendererBaseFilter(filter);

    const hoveredCell = this.hoveredCellKey ? this.cellCache.get(this.hoveredCellKey) || null : null;
    if (hoveredCell && !this.shouldDisplayBaseCell(hoveredCell)) {
      this.hoveredCellKey = null;
      this.onHoverCell(null);
    } else {
      this.onHoverCell(hoveredCell);
    }

    const selectedCell = this.getSelectedCell();
    if (selectedCell && !this.shouldDisplayBaseCell(selectedCell)) {
      this.selectedCellKey = null;
      this.onSelectCell(null);
    } else {
      this.onSelectCell(selectedCell);
    }

    this.render();
  }

  getAvailableWildBaseLevels() {
    const levels = new Set();

    for (const cell of this.cellCache.values()) {
      const metadata = this.getBaseFilterMetadata(cell);
      if (metadata) {
        levels.add(metadata.level);
      }
    }

    return [...levels].sort((left, right) => left - right);
  }

  hasActiveBaseFilter() {
    return (
      this.baseFilter.types.size > 0 ||
      this.baseFilter.tribes.size > 0 ||
      this.baseFilter.levels.size > 0
    );
  }

  isAlwaysVisibleOwnedBase(cell) {
    return (
      Number(cell.rel) === MR3.relationships.self &&
      (
        Number(cell.b) === MR3.yardTypes.player ||
        Number(cell.b) === MR3.yardTypes.resource ||
        Number(cell.b) === MR3.yardTypes.stronghold
      )
    );
  }

  shouldDisplayBaseCell(cell) {
    if (!this.doesContainDisplayableBase(cell)) {
      return false;
    }

    if (!this.hasActiveBaseFilter()) {
      return true;
    }

    if (this.isAlwaysVisibleOwnedBase(cell)) {
      return true;
    }

    return this.matchesBaseFilter(cell);
  }

  matchesBaseFilter(cell) {
    const metadata = this.getBaseFilterMetadata(cell);
    if (!metadata) {
      return false;
    }

    if (this.baseFilter.types.size > 0 && !this.baseFilter.types.has(metadata.type)) {
      return false;
    }

    if (this.baseFilter.tribes.size > 0 && !this.baseFilter.tribes.has(metadata.tribe)) {
      return false;
    }

    if (this.baseFilter.levels.size > 0 && !this.baseFilter.levels.has(metadata.level)) {
      return false;
    }

    return true;
  }

  getBaseFilterMetadata(cell) {
    if (Number(cell.uid || 0) !== 0 || !cell.bid) {
      return null;
    }

    let type = null;
    switch (Number(cell.b)) {
      case MR3.yardTypes.empty:
        type = "outpost";
        break;
      case MR3.yardTypes.resource:
        type = "resource";
        break;
      case MR3.yardTypes.stronghold:
        type = "stronghold";
        break;
      default:
        return null;
    }

    const tribe = getTribeKey(cell);
    const level = Number(cell.l || 0);
    if (!tribe || level <= 0) {
      return null;
    }

    return { type, tribe, level };
  }

  zoomBy(multiplier, animate = false) {
    const rect = this.canvas.getBoundingClientRect();
    const focusX = rect.width * 0.5;
    const focusY = rect.height * 0.5;

    if (animate) {
      this.animateZoom(this.zoom * multiplier, focusX, focusY);
      return;
    }

    this.cancelAnimations();
    this.setZoom(this.zoom * multiplier, focusX, focusY);
  }

  setOverlay(message) {
    this.overlayEl.textContent = message;
    this.overlayEl.hidden = !message;
  }

  setStatus(message) {
    if (this.statusEl) {
      this.statusEl.textContent = message;
    }
  }

  setZoom(nextZoom, focusX, focusY) {
    const clampedZoom = clamp(nextZoom, 0.42, 1.65);
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const localFocusX = focusX ?? width * 0.5;
    const localFocusY = focusY ?? height * 0.5;
    const before = this.screenToWorld(localFocusX, localFocusY);

    this.zoom = clampedZoom;
    this.offsetX = before.x - localFocusX / this.zoom;
    this.offsetY = before.y - localFocusY / this.zoom;
    this.clampOffset();
    this.render();
    this.scheduleFetch();
  }

  animateZoom(nextZoom, focusX, focusY) {
    const targetZoom = clamp(nextZoom, 0.42, 1.65);
    const startZoom = this.zoom;
    if (Math.abs(targetZoom - startZoom) < 0.001) {
      return;
    }

    this.cancelAnimations();
    const startTime = performance.now();
    const durationMs = 180;

    const step = (timestamp) => {
      const progress = clamp((timestamp - startTime) / durationMs, 0, 1);
      const eased = 1 - ((1 - progress) ** 3);
      const interpolatedZoom = startZoom + (targetZoom - startZoom) * eased;
      this.setZoom(interpolatedZoom, focusX, focusY);

      if (progress < 1) {
        this.zoomAnimationFrame = window.requestAnimationFrame(step);
      } else {
        this.zoomAnimationFrame = 0;
      }
    };

    this.zoomAnimationFrame = window.requestAnimationFrame(step);
  }

  cancelZoomAnimation() {
    if (!this.zoomAnimationFrame) {
      return;
    }

    window.cancelAnimationFrame(this.zoomAnimationFrame);
    this.zoomAnimationFrame = 0;
  }

  animatePanTo(cellX, cellY) {
    const targetOffset = this.getCenteredOffset(cellX, cellY);
    const startOffsetX = this.offsetX;
    const startOffsetY = this.offsetY;

    if (
      Math.abs(targetOffset.x - startOffsetX) < 0.5 &&
      Math.abs(targetOffset.y - startOffsetY) < 0.5
    ) {
      this.offsetX = targetOffset.x;
      this.offsetY = targetOffset.y;
      this.render();
      this.scheduleFetch();
      return;
    }

    this.cancelPanAnimation();
    const startTime = performance.now();
    const durationMs = 280;

    const step = (timestamp) => {
      const progress = clamp((timestamp - startTime) / durationMs, 0, 1);
      const eased = 1 - ((1 - progress) ** 3);
      this.offsetX = startOffsetX + (targetOffset.x - startOffsetX) * eased;
      this.offsetY = startOffsetY + (targetOffset.y - startOffsetY) * eased;
      this.render();

      if (progress < 1) {
        this.panAnimationFrame = window.requestAnimationFrame(step);
      } else {
        this.panAnimationFrame = 0;
        this.scheduleFetch();
      }
    };

    this.panAnimationFrame = window.requestAnimationFrame(step);
  }

  cancelPanAnimation() {
    if (!this.panAnimationFrame) {
      return;
    }

    window.cancelAnimationFrame(this.panAnimationFrame);
    this.panAnimationFrame = 0;
  }

  cancelAnimations() {
    this.cancelZoomAnimation();
    this.cancelPanAnimation();
  }

  getCenteredOffset(cellX, cellY) {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const world = this.cellToWorld(cellX, cellY);
    const offsetX = world.x - width / (2 * this.zoom) + MR3.hexWidth * 0.5;
    const offsetY = world.y - height / (2 * this.zoom) + MR3.hexHeight * 0.5;
    return this.getClampedOffset(offsetX, offsetY, width, height);
  }

  centerOnCell(cellX, cellY) {
    const centeredOffset = this.getCenteredOffset(cellX, cellY);
    this.offsetX = centeredOffset.x;
    this.offsetY = centeredOffset.y;
  }

  mergeCells(cells) {
    for (const rawCell of cells) {
      const normalized = {
        ...rawCell,
        uid: Number(rawCell.uid || 0),
        b: rawCell.b !== undefined ? Number(rawCell.b) : null,
        i: Number(rawCell.i || 0),
        l: Number(rawCell.l || 0),
        pl: Number(rawCell.pl || 0),
        r: Number(rawCell.r || 0),
        dm: Number(rawCell.dm || 0),
        rel: rawCell.rel !== undefined ? Number(rawCell.rel) : MR3.relationships.none,
        tid: Number(rawCell.tid || 0),
        lo: Number(rawCell.lo || 0),
        p: Number(rawCell.p || 0),
        d: Number(rawCell.d || 0),
        t: Number(rawCell.t || 0),
        _cellId: calculateCellId(rawCell.x, rawCell.y, this.getMapWidth()),
      };

      this.cellCache.set(cellKey(rawCell.x, rawCell.y), normalized);
    }
  }

  async restoreFullMapCache() {
    if (!this.fullMapCacheKey) {
      return false;
    }

    const metadata = await sessionCacheGet(`${this.fullMapCacheKey}:meta`);
    if (
      !metadata ||
      Number(metadata.version) !== FULL_MAP_CACHE_VERSION ||
      Number(metadata.totalChunks || 0) <= 0
    ) {
      return false;
    }

    const chunkPromises = [];
    for (let chunkIndex = 0; chunkIndex < Number(metadata.totalChunks || 0); chunkIndex += 1) {
      chunkPromises.push(sessionCacheGet(`${this.fullMapCacheKey}:chunk:${chunkIndex}`));
    }

    const chunks = await Promise.all(chunkPromises);
    for (const chunk of chunks) {
      if (!Array.isArray(chunk) || !chunk.length) {
        return false;
      }

      this.mergeCells(chunk);
    }

    return true;
  }

  async persistFullMapCache() {
    if (!this.fullMapCacheKey) {
      return;
    }

    const cells = [...this.cellCache.values()].map((cell) => {
      const { _cellId, ...persisted } = cell;
      return persisted;
    });

    const chunkCount = Math.ceil(cells.length / MR3.fullMapChunkSize);
    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      const chunkStart = chunkIndex * MR3.fullMapChunkSize;
      const chunkEnd = chunkStart + MR3.fullMapChunkSize;
      await sessionCacheSet(
        `${this.fullMapCacheKey}:chunk:${chunkIndex}`,
        cells.slice(chunkStart, chunkEnd),
      );
    }

    await sessionCacheSet(`${this.fullMapCacheKey}:meta`, {
      version: FULL_MAP_CACHE_VERSION,
      savedAt: Date.now(),
      totalChunks: chunkCount,
    });
  }

  async preloadEntireMap() {
    if (!this.token || this.fullMapPreloading || this.fullMapLoaded) {
      return;
    }

    this.fullMapPreloading = true;
    const totalCells = this.getMapWidth() * this.getMapHeight();
    const chunkSize = MR3.fullMapChunkSize;
    const totalChunks = Math.ceil(totalCells / chunkSize);
    let nextChunkIndex = 0;
    let completedCells = 0;
    let completedChunks = 0;

    this.setOverlay("Preloading full world map (0%)...");

    const runWorker = async () => {
      while (nextChunkIndex < totalChunks) {
        const chunkIndex = nextChunkIndex;
        nextChunkIndex += 1;
        const startCellId = chunkIndex * chunkSize + 1;
        const endCellId = Math.min(totalCells, startCellId + chunkSize - 1);
        const cellIds = [];
        for (let cellId = startCellId; cellId <= endCellId; cellId += 1) {
          cellIds.push(cellId);
        }

        const response = await this.api.getMapCells(this.token, cellIds);
        this.mergeCells(response.celldata || []);
        completedCells += cellIds.length;
        completedChunks += 1;
        const percent = Math.min(100, Math.round((completedCells / totalCells) * 100));
        this.setOverlay(`Preloading full world map (${percent}%)...`);

        if (completedChunks === 1 || completedChunks % 4 === 0 || completedChunks === totalChunks) {
          this.onHoverCell(this.hoveredCellKey ? this.cellCache.get(this.hoveredCellKey) || null : null);
          this.onSelectCell(this.getSelectedCell());
          this.render();
        }
      }
    };

    try {
      const workers = Array.from(
        { length: Math.max(1, MR3.fullMapConcurrency) },
        () => runWorker(),
      );
      await Promise.all(workers);
      this.fullMapLoaded = true;
      this.persistFullMapCache().catch((error) => {
        console.warn("Failed to persist the full-map session cache.", error);
      });
    } finally {
      this.fullMapPreloading = false;
    }
  }

  getMapWidth() {
    return Number(this.mapMeta?.width || MR3.mapWidth);
  }

  getMapHeight() {
    return Number(this.mapMeta?.height || MR3.mapHeight);
  }

  scheduleFetch() {
    if (this.fetchTimer) {
      window.clearTimeout(this.fetchTimer);
      this.fetchTimer = null;
    }
  }

  async ensureCellsForViewport(force) {
    void force;
  }

  buildCellRequestList(force) {
    void force;
    return [];
  }

  getCenterCell() {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const worldX = this.offsetX + width / (2 * this.zoom);
    const worldY = this.offsetY + height / (2 * this.zoom);
    const cellY = clamp(Math.floor(worldY / MR3.hexOverlap), 0, this.getMapHeight() - 1);
    const oddRowOffset = cellY % 2 ? MR3.hexWidth * 0.5 : 0;
    const cellX = clamp(
      Math.floor((worldX - oddRowOffset) / MR3.hexWidth),
      0,
      this.getMapWidth() - 1,
    );

    return { x: cellX, y: cellY };
  }

  handlePointerDown(event) {
    if (!this.token) {
      return;
    }

    this.cancelAnimations();
    this.dragging = true;
    this.dragMoved = false;
    this.dragLastPoint = { x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
  }

  handlePointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    this.lastPointer = { x: localX, y: localY };
    this.setCoordinatesDisplay(this.findGridCellAtPoint(localX, localY));

    if (this.dragging && this.dragLastPoint) {
      const deltaX = event.clientX - this.dragLastPoint.x;
      const deltaY = event.clientY - this.dragLastPoint.y;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        this.dragMoved = true;
      }
      this.offsetX -= deltaX / this.zoom;
      this.offsetY -= deltaY / this.zoom;
      this.dragLastPoint = { x: event.clientX, y: event.clientY };
      this.clampOffset();
      this.render();
      this.scheduleFetch();
      return;
    }

    const hovered = this.findCellAtPoint(localX, localY);
    const hoveredKey = hovered ? cellKey(hovered.x, hovered.y) : null;
    if (hoveredKey !== this.hoveredCellKey) {
      this.hoveredCellKey = hoveredKey;
      this.onHoverCell(hovered);
      this.render();
    }
  }

  handlePointerUp() {
    this.dragging = false;
    this.dragLastPoint = null;

    if (!this.dragMoved) {
      const hovered = this.findCellAtPoint(this.lastPointer.x, this.lastPointer.y);
      this.selectedCellKey = hovered ? cellKey(hovered.x, hovered.y) : null;
      this.onSelectCell(this.getSelectedCell());
      this.render();
    }
  }

  handlePointerLeave() {
    this.setCoordinatesDisplay(null);
    if (this.dragging) {
      return;
    }

    this.hoveredCellKey = null;
    this.onHoverCell(null);
    this.render();
  }

  handleWheel(event) {
    if (!this.token) {
      return;
    }

    event.preventDefault();
    this.cancelAnimations();
    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const multiplier = event.deltaY < 0 ? 1.14 : 1 / 1.14;
    this.setZoom(this.zoom * multiplier, localX, localY);
  }

  focusHome() {
    this.focusCell(this.getHomeCell(), { animate: true });
  }

  getHomeCell() {
    return this.homeCellKey ? this.cellCache.get(this.homeCellKey) || null : null;
  }

  focusCell(cell, { animate = true } = {}) {
    if (!cell) {
      return;
    }

    this.cancelAnimations();
    this.selectedCellKey = cellKey(cell.x, cell.y);
    this.onSelectCell(this.getSelectedCell());

    if (animate) {
      this.animatePanTo(cell.x, cell.y);
      return;
    }

    this.centerOnCell(cell.x, cell.y);
    this.render();
  }

  getSearchablePlayerBases() {
    const homeCell = this.getHomeCell();
    const bases = [];

    for (const cell of this.cellCache.values()) {
      if (Number(cell.b) !== MR3.yardTypes.player || !this.doesContainDisplayableBase(cell)) {
        continue;
      }

      const name = String(cell.n || "").trim();
      if (!name) {
        continue;
      }

      bases.push({
        cell,
        username: name,
        normalizedUsername: name.toLocaleLowerCase(),
        level: Number(cell.l || 0),
        distance: homeCell ? getHexDistance(homeCell.x, homeCell.y, cell.x, cell.y) : null,
      });
    }

    return bases;
  }

  screenToWorld(screenX, screenY) {
    return {
      x: this.offsetX + screenX / this.zoom,
      y: this.offsetY + screenY / this.zoom,
    };
  }

  cellToWorld(cellX, cellY) {
    return {
      x: cellX * MR3.hexWidth + (cellY % 2 ? MR3.hexWidth * 0.5 : 0),
      y: cellY * MR3.hexOverlap,
    };
  }

  clampOffset() {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const clampedOffset = this.getClampedOffset(this.offsetX, this.offsetY, width, height);
    this.offsetX = clampedOffset.x;
    this.offsetY = clampedOffset.y;
  }

  getClampedOffset(offsetX, offsetY, width, height) {
    const maxWorldX = this.getMapWidth() * MR3.hexWidth + MR3.hexWidth * 0.5;
    const maxWorldY = this.getMapHeight() * MR3.hexOverlap + MR3.hexHeight;
    const maxOffsetX = Math.max(0, maxWorldX - width / this.zoom);
    const maxOffsetY = Math.max(0, maxWorldY - height / this.zoom);

    return {
      x: clamp(offsetX, 0, maxOffsetX),
      y: clamp(offsetY, 0, maxOffsetY),
    };
  }

  render() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;

    if (this.canvas.width !== Math.floor(width * dpr) || this.canvas.height !== Math.floor(height * dpr)) {
      this.canvas.width = Math.floor(width * dpr);
      this.canvas.height = Math.floor(height * dpr);
    }

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, width, height);

    if (!this.token) {
      this.ctx.fillStyle = "#101414";
      this.ctx.fillRect(0, 0, width, height);
      return;
    }

    this.drawBackground(width, height);
    const visibleCells = this.getVisibleCells(width, height);
    visibleCells.sort((left, right) => (left.y - right.y) || (left.x - right.x));

    for (const cell of visibleCells) {
      this.drawCellTerrain(cell);
    }

    this.drawOwnedRangeOverlays(width, height);

    for (const cell of visibleCells) {
      this.drawCellContents(cell);
    }
  }

  drawBackground(width, height) {
    const background = this.assets.get(ASSET_PATHS.background);
    if (!background) {
      this.ctx.fillStyle = "#203021";
      this.ctx.fillRect(0, 0, width, height);
      return;
    }

    const scaledWidth = Math.max(1, Math.round(background.width * this.zoom));
    const scaledHeight = Math.max(1, Math.round(background.height * this.zoom));
    const startX = positiveModulo(-(this.offsetX * this.zoom), scaledWidth) - scaledWidth;
    const startY = positiveModulo(-(this.offsetY * this.zoom), scaledHeight) - scaledHeight;

    this.ctx.save();
    for (let drawY = startY; drawY < height + scaledHeight; drawY += scaledHeight) {
      for (let drawX = startX; drawX < width + scaledWidth; drawX += scaledWidth) {
        this.ctx.drawImage(background, drawX, drawY, scaledWidth, scaledHeight);
      }
    }
    this.ctx.restore();

    this.ctx.fillStyle = "rgba(10, 15, 10, 0.28)";
    this.ctx.fillRect(0, 0, width, height);
  }

  drawOwnedRangeOverlays(width, height) {
    const sources = [];
    for (const cell of this.cellCache.values()) {
      if (Number(cell.rel) !== MR3.relationships.self) {
        continue;
      }

      const range = Number(cell.r || 0);
      if (range <= 0 || !this.doesContainDisplayableBase(cell)) {
        continue;
      }

      sources.push({ x: cell.x, y: cell.y, range });
    }

    if (!sources.length) {
      return;
    }

    const marginX = MR3.hexWidth * 2;
    const marginY = MR3.hexHeight * 2;
    const minWorldX = this.offsetX - marginX;
    const maxWorldX = this.offsetX + width / this.zoom + marginX;
    const minWorldY = this.offsetY - marginY;
    const maxWorldY = this.offsetY + height / this.zoom + marginY;
    const rangeCells = new Map();

    for (const source of sources) {
      const minY = Math.max(0, source.y - source.range);
      const maxY = Math.min(this.getMapHeight() - 1, source.y + source.range);

      for (let cellY = minY; cellY <= maxY; cellY += 1) {
        const minX = Math.max(0, source.x - source.range - 1);
        const maxX = Math.min(this.getMapWidth() - 1, source.x + source.range + 1);

        for (let cellX = minX; cellX <= maxX; cellX += 1) {
          if (getHexDistance(source.x, source.y, cellX, cellY) > source.range) {
            continue;
          }

          const world = this.cellToWorld(cellX, cellY);
          if (
            world.x > maxWorldX ||
            world.x + MR3.hexWidth < minWorldX ||
            world.y > maxWorldY ||
            world.y + MR3.hexHeight < minWorldY
          ) {
            continue;
          }

          rangeCells.set(cellKey(cellX, cellY), { x: cellX, y: cellY });
        }
      }
    }

    if (!rangeCells.size) {
      return;
    }

    const boundaryEdges = new Map();
    for (const cell of rangeCells.values()) {
      const world = this.cellToWorld(cell.x, cell.y);
      this.recordHexBoundaryEdges(world.x, world.y, RANGE_HEX_VERTICES, RANGE_HEX_EDGES, boundaryEdges);
    }

    const rawLoops = this.buildBoundaryLoops([...boundaryEdges.values()].filter((edge) => edge.count === 1))
      .map((loop) => this.simplifyBoundaryLoop(loop))
      .filter((loop) => loop.length >= 3);
    if (!rawLoops.length) {
      return;
    }

    this.ctx.save();
    this.ctx.fillStyle = "rgba(102, 178, 255, 0.225)";
    this.traceBoundaryLoops(rawLoops);
    this.ctx.fill("evenodd");
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = "rgba(176, 236, 255, 0.72)";
    this.ctx.lineWidth = clamp(3 * this.zoom, 1.8, 3.8);
    this.ctx.lineJoin = "round";
    this.ctx.lineCap = "round";
    this.ctx.shadowColor = "rgba(156, 220, 255, 0.26)";
    this.ctx.shadowBlur = clamp(3 * this.zoom, 2, 4);
    this.traceBoundaryLoops(rawLoops);
    this.ctx.stroke();
    this.ctx.restore();
  }

  getVisibleCells(width, height) {
    const marginX = MR3.hexWidth * 2;
    const marginY = MR3.hexHeight * 2;
    const minWorldX = this.offsetX - marginX;
    const maxWorldX = this.offsetX + width / this.zoom + marginX;
    const minWorldY = this.offsetY - marginY;
    const maxWorldY = this.offsetY + height / this.zoom + marginY;
    const cells = [];

    for (const cell of this.cellCache.values()) {
      const world = this.cellToWorld(cell.x, cell.y);
      if (
        world.x > maxWorldX ||
        world.x + MR3.hexWidth < minWorldX ||
        world.y > maxWorldY ||
        world.y + MR3.hexHeight < minWorldY
      ) {
        continue;
      }
      cells.push(cell);
    }

    return cells;
  }

  drawCellTerrain(cell) {
    const world = this.cellToWorld(cell.x, cell.y);
    const screenX = (world.x - this.offsetX) * this.zoom;
    const screenY = (world.y - this.offsetY) * this.zoom;
    const cellIndex = cell.y * this.getMapWidth() + cell.x;
    const tile = this.assets.pickTile(cell, cellIndex);

    if (tile) {
      this.ctx.drawImage(tile, screenX, screenY, tile.width * this.zoom, tile.height * this.zoom);
    }
  }

  drawCellContents(cell) {
    const world = this.cellToWorld(cell.x, cell.y);
    const screenX = (world.x - this.offsetX) * this.zoom;
    const screenY = (world.y - this.offsetY) * this.zoom;

    if (!this.shouldDisplayBaseCell(cell)) {
      return;
    }

    const highlightStyle = this.getHighlightStyle(cell);
    if (highlightStyle) {
      this.drawHighlight(cell, highlightStyle);
    }

    if (cell.b !== MR3.yardTypes.fortification) {
      this.drawRelationshipOverlay(cell, screenX, screenY);
    }

    if (this.isFullyFortified(cell)) {
      this.drawCenteredIcon(ASSET_PATHS.fullyFortifiedBack, screenX, screenY);
    }

    const iconPath = this.getPrimaryIconPath(cell);
    if (iconPath) {
      this.drawCenteredIcon(iconPath, screenX, screenY);
    }

    if (cell.b === MR3.yardTypes.fortification) {
      const lightPath = this.getFortificationLightPath(cell);
      if (lightPath) {
        this.drawCenteredIcon(lightPath, screenX, screenY);
      }
    }

    if (this.isFullyFortified(cell)) {
      this.drawCenteredIcon(ASSET_PATHS.fullyFortifiedFront, screenX, screenY);
    }

    if (Number(cell.p || 0) === 1) {
      this.drawCenteredIcon(ASSET_PATHS.damageProtection, screenX, screenY);
    }

    if (Number(cell.dm || 0) > 0) {
      this.drawDamageBar(cell, screenX, screenY);
    }

    if (this.zoom >= 0.82 && cell.b !== MR3.yardTypes.fortification) {
      this.drawLabel(cell, screenX, screenY);
    }
  }

  drawRelationshipOverlay(cell, screenX, screenY) {
    let overlayPath = null;
    switch (cell.rel) {
      case MR3.relationships.self:
        overlayPath = ASSET_PATHS.overlayBlue;
        break;
      case MR3.relationships.ally:
        overlayPath = ASSET_PATHS.overlayGreen;
        break;
      case MR3.relationships.neutral:
        overlayPath = ASSET_PATHS.overlayYellow;
        break;
      case MR3.relationships.enemy:
        overlayPath = ASSET_PATHS.overlayRed;
        break;
      default:
        break;
    }

    if (!overlayPath) {
      return;
    }

    const image = this.assets.get(overlayPath);
    if (!image) {
      return;
    }

    this.ctx.drawImage(image, screenX, screenY, image.width * this.zoom, image.height * this.zoom);
  }

  drawCenteredIcon(path, screenX, screenY) {
    const image = this.assets.get(path);
    if (!image) {
      return;
    }

    const drawX = screenX + (MR3.hexWidth - image.width) * 0.5 * this.zoom;
    const drawY = screenY + (MR3.hexHeight - image.height) * 0.5 * this.zoom;
    this.ctx.drawImage(image, drawX, drawY, image.width * this.zoom, image.height * this.zoom);
  }

  drawDamageBar(cell, screenX, screenY) {
    const sprite = this.assets.get(ASSET_PATHS.damageBar);
    if (!sprite) {
      return;
    }

    const damage = clamp(Number(cell.dm || 0) / 100, 0, 0.99);
    const segmentHeight = 4;
    const segmentCount = Math.floor(sprite.height / segmentHeight);
    const segmentIndex = Math.min(Math.floor(segmentCount * damage), segmentCount - 1);
    const sourceY = segmentIndex * segmentHeight;
    const drawX = screenX + (MR3.hexWidth - sprite.width) * 0.5 * this.zoom;
    const drawY = screenY + (MR3.hexHeight - segmentHeight) * 0.5 * this.zoom;

    this.ctx.drawImage(
      sprite,
      0,
      sourceY,
      sprite.width,
      segmentHeight,
      drawX,
      drawY,
      sprite.width * this.zoom,
      segmentHeight * this.zoom,
    );
  }

  drawLabel(cell, screenX, screenY) {
    const name = String(cell.n || "").trim();
    if (!name) {
      return;
    }

    const label = `${name} (${Number(cell.l || 0)})`;
    this.ctx.save();
    this.ctx.font = `${Math.max(11, 11 * this.zoom)}px Verdana`;
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#ffffff";
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.lineWidth = 3;
    const labelX = screenX + MR3.hexWidth * 0.5 * this.zoom;
    const labelY = screenY + (MR3.hexHeight - 10) * this.zoom;
    this.ctx.strokeText(label, labelX, labelY);
    this.ctx.fillText(label, labelX, labelY);
    this.ctx.restore();
  }

  getHighlightStyle(cell) {
    const key = cellKey(cell.x, cell.y);
    if (key === this.selectedCellKey) {
      return {
        fill: "rgba(255, 255, 255, 0.12)",
        stroke: "rgba(255, 255, 255, 0.78)",
      };
    }

    if (key === this.hoveredCellKey) {
      return {
        fill: "rgba(255, 255, 255, 0.08)",
        stroke: "rgba(255, 255, 255, 0.42)",
      };
    }

    return null;
  }

  drawHighlight(cell, style) {
    const world = this.cellToWorld(cell.x, cell.y);
    const screenX = (world.x - this.offsetX) * this.zoom;
    const screenY = (world.y - this.offsetY) * this.zoom;

    this.ctx.save();
    this.ctx.fillStyle = style.fill;
    this.ctx.strokeStyle = style.stroke;
    this.ctx.lineWidth = Math.max(1.6, 2.4 * this.zoom);
    this.ctx.shadowColor = style.stroke;
    this.ctx.shadowBlur = 8 * this.zoom;
    this.traceHexPath(screenX, screenY, FLOOR_HEX_VERTICES);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  appendHexPath(screenX, screenY, vertices, targetCtx = this.ctx) {
    vertices.forEach(([x, y], index) => {
      const drawX = screenX + x * this.zoom;
      const drawY = screenY + y * this.zoom;
      if (index === 0) {
        targetCtx.moveTo(drawX, drawY);
      } else {
        targetCtx.lineTo(drawX, drawY);
      }
    });
    targetCtx.closePath();
  }

  traceHexPath(screenX, screenY, vertices) {
    this.ctx.beginPath();
    this.appendHexPath(screenX, screenY, vertices);
  }

  recordHexBoundaryEdges(worldX, worldY, vertices, edges, edgeMap) {
    const worldVertices = vertices.map(([x, y]) => [worldX + x, worldY + y]);

    for (const [startIndex, endIndex] of edges) {
      const [startX, startY] = worldVertices[startIndex];
      const [endX, endY] = worldVertices[endIndex];
      const key = makeEdgeKey(startX, startY, endX, endY);
      const existing = edgeMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        edgeMap.set(key, {
          count: 1,
          ax: startX,
          ay: startY,
          bx: endX,
          by: endY,
        });
      }
    }
  }

  buildBoundaryLoops(edges) {
    const normalizedEdges = edges.map((edge, index) => ({
      ...edge,
      id: index,
      aKey: vertexKey(edge.ax, edge.ay),
      bKey: vertexKey(edge.bx, edge.by),
    }));
    const adjacency = new Map();
    const visited = new Set();
    const loops = [];

    for (const edge of normalizedEdges) {
      if (!adjacency.has(edge.aKey)) {
        adjacency.set(edge.aKey, []);
      }
      if (!adjacency.has(edge.bKey)) {
        adjacency.set(edge.bKey, []);
      }
      adjacency.get(edge.aKey).push(edge);
      adjacency.get(edge.bKey).push(edge);
    }

    for (const edge of normalizedEdges) {
      if (visited.has(edge.id)) {
        continue;
      }

      const startKey = edge.aKey;
      const loop = [parseVertexKey(startKey)];
      let currentKey = edge.bKey;
      let currentEdge = edge;
      let guard = 0;
      visited.add(edge.id);

      while (currentKey !== startKey && guard < normalizedEdges.length + 4) {
        loop.push(parseVertexKey(currentKey));
        const candidates = adjacency.get(currentKey) || [];
        const nextEdge = candidates.find((candidate) => candidate.id !== currentEdge.id && !visited.has(candidate.id));
        if (!nextEdge) {
          break;
        }

        visited.add(nextEdge.id);
        currentKey = nextEdge.aKey === currentKey ? nextEdge.bKey : nextEdge.aKey;
        currentEdge = nextEdge;
        guard += 1;
      }

      if (currentKey === startKey && loop.length >= 3) {
        loops.push(loop);
      }
    }

    return loops;
  }

  traceBoundaryLoops(loops, targetCtx = this.ctx) {
    targetCtx.beginPath();
    for (const loop of loops) {
      this.appendLoopPath(loop, targetCtx);
    }
  }

  appendLoopPath(points, targetCtx = this.ctx) {
    if (points.length < 3) {
      return;
    }

    const screenPoints = points.map((point) => ({
      x: (point.x - this.offsetX) * this.zoom,
      y: (point.y - this.offsetY) * this.zoom,
    }));

    targetCtx.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let index = 1; index < screenPoints.length; index += 1) {
      const current = screenPoints[index];
      targetCtx.lineTo(current.x, current.y);
    }
    targetCtx.closePath();
  }

  simplifyBoundaryLoop(points) {
    if (points.length < 3) {
      return points;
    }

    const cleaned = [];
    for (const point of points) {
      const previous = cleaned[cleaned.length - 1];
      if (!previous || !samePoint(previous, point)) {
        cleaned.push(point);
      }
    }

    if (cleaned.length < 3) {
      return cleaned;
    }

    const simplified = [];
    const count = cleaned.length;
    for (let index = 0; index < count; index += 1) {
      const previous = cleaned[(index - 1 + count) % count];
      const current = cleaned[index];
      const next = cleaned[(index + 1) % count];

      if (isCollinear(previous, current, next)) {
        continue;
      }

      simplified.push(current);
    }

    return simplified.length >= 3 ? simplified : cleaned;
  }

  getPrimaryIconPath(cell) {
    switch (cell.b) {
      case MR3.yardTypes.player:
        return ASSET_PATHS.playerBase;
      case MR3.yardTypes.resource:
        return ASSET_PATHS.resourceCell;
      case MR3.yardTypes.stronghold:
        return ASSET_PATHS.stronghold;
      case MR3.yardTypes.fortification:
        return this.getFortificationIconPath(cell);
      case MR3.yardTypes.empty:
        return Number(cell.uid || 0) === 0 && cell.bid ? ASSET_PATHS.wildMonsterBase : null;
      default:
        return null;
    }
  }

  getFortificationIconPath(cell) {
    if (Number(cell.d || 0) === 1) {
      return ASSET_PATHS.fortification;
    }

    for (const direction of FORTIFICATION_DIRECTIONS) {
      const neighbor = this.getDirectionalNeighbor(cell.x, cell.y, direction.dx, direction.dy);
      if (this.doesFortify(cell, neighbor)) {
        return ASSET_PATHS[direction.key];
      }
    }

    return ASSET_PATHS.fortification;
  }

  getFortificationLightPath(cell) {
    switch (cell.rel) {
      case MR3.relationships.self:
        return ASSET_PATHS.fortificationLightBlue;
      case MR3.relationships.ally:
        return ASSET_PATHS.fortificationLightGreen;
      case MR3.relationships.neutral:
        return ASSET_PATHS.fortificationLightYellow;
      case MR3.relationships.enemy:
        return ASSET_PATHS.fortificationLightRed;
      default:
        return null;
    }
  }

  isFullyFortified(cell) {
    if (
      cell.b !== MR3.yardTypes.player &&
      cell.b !== MR3.yardTypes.resource &&
      cell.b !== MR3.yardTypes.stronghold
    ) {
      return false;
    }

    for (const direction of FORTIFICATION_DIRECTIONS) {
      const neighbor = this.getDirectionalNeighbor(cell.x, cell.y, direction.dx, direction.dy);
      if (!neighbor || !this.doesFortify(neighbor, cell)) {
        return false;
      }
    }

    return true;
  }

  getDirectionalNeighbor(cellX, cellY, deltaX, deltaY) {
    let resolvedDeltaX = deltaX;
    if (deltaX === "oddRight") {
      resolvedDeltaX = cellY % 2 ? 1 : 0;
    } else if (deltaX === "oddLeft") {
      resolvedDeltaX = cellY % 2 ? 0 : -1;
    }

    return this.cellCache.get(cellKey(cellX + resolvedDeltaX, cellY + deltaY)) || null;
  }

  doesFortify(fortificationCell, targetCell) {
    if (!fortificationCell || !targetCell) {
      return false;
    }

    if (fortificationCell.b !== MR3.yardTypes.fortification) {
      return false;
    }

    if (!this.doesContainDisplayableBase(targetCell)) {
      return false;
    }

    const sameOwner = Number(fortificationCell.uid || 0) === Number(targetCell.uid || 0);
    const sameTribe = Number(fortificationCell.tid || 0) === Number(targetCell.tid || 0);

    if (!sameOwner || !sameTribe) {
      return false;
    }

    return (
      targetCell.b === MR3.yardTypes.player ||
      targetCell.b === MR3.yardTypes.resource ||
      targetCell.b === MR3.yardTypes.stronghold
    );
  }

  doesContainDisplayableBase(cell) {
    const hasBaseId = Boolean(cell.bid);
    if (!hasBaseId) {
      return false;
    }

    if (this.isBorder(cell) || this.isBlocked(cell)) {
      return false;
    }

    if (Number(cell.lo || 0) === 2 && Number(cell.uid || 0) !== this.currentUserId) {
      return false;
    }

    return true;
  }

  isBorder(cell) {
    return Number(cell.b) === MR3.yardTypes.border;
  }

  isBlocked(cell) {
    return this.isBorder(cell) || Number(cell.i || 0) >= MR3.blockedCellStartingHeight;
  }

  setCoordinatesDisplay(cell) {
    if (!this.coordsEl) {
      return;
    }

    if (!this.token || !cell) {
      this.coordsEl.hidden = true;
      return;
    }

    this.coordsEl.hidden = false;
    this.coordsEl.textContent = `Cell ${cell.x}, ${cell.y}`;
  }

  findGridCellAtPoint(screenX, screenY) {
    const world = this.screenToWorld(screenX, screenY);
    return this.findGridCellAtWorldPoint(world.x, world.y);
  }

  findGridCellAtWorldPoint(worldX, worldY) {
    const mapWidth = this.getMapWidth();
    const mapHeight = this.getMapHeight();
    const estimatedY = clamp(Math.floor(worldY / MR3.hexOverlap), 0, mapHeight - 1);
    const rowOffset = estimatedY % 2 ? MR3.hexWidth * 0.5 : 0;
    const estimatedX = clamp(Math.floor((worldX - rowOffset) / MR3.hexWidth), 0, mapWidth - 1);
    const candidates = [];

    for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
      for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
        const cellX = estimatedX + deltaX;
        const cellY = estimatedY + deltaY;
        if (cellX < 0 || cellY < 0 || cellX >= mapWidth || cellY >= mapHeight) {
          continue;
        }

        candidates.push({ x: cellX, y: cellY });
      }
    }

    for (const candidate of candidates) {
      const world = this.cellToWorld(candidate.x, candidate.y);
      if (pointInHex(worldX, worldY, world.x, world.y, 1)) {
        return candidate;
      }
    }

    return { x: estimatedX, y: estimatedY };
  }

  findCellAtPoint(screenX, screenY) {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const visible = this.getVisibleCells(width, height);
    visible.sort((left, right) => (right.y - left.y) || (right.x - left.x));

    for (const cell of visible) {
      if (!this.shouldDisplayBaseCell(cell)) {
        continue;
      }

      const world = this.cellToWorld(cell.x, cell.y);
      const drawX = (world.x - this.offsetX) * this.zoom;
      const drawY = (world.y - this.offsetY) * this.zoom;

      if (pointInHex(screenX, screenY, drawX, drawY, this.zoom)) {
        return cell;
      }
    }

    return null;
  }
}

class ViewerApp {
  constructor() {
    this.api = new ApiClient();
    this.config = null;
    this.session = null;
    this.worlds = [];
    this.selectedWorldId = null;
    this.hoveredCell = null;
    this.selectedCell = null;
    this.playerBaseIconUrl = "";
    this.searchEntries = [];
    this.searchMatches = [];
    this.searchActiveIndex = -1;
    this.filterState = createEmptyBaseFilter();
    this.availableFilterLevels = [];
    this.filterMenuOpen = false;

    this.elements = {
      mapSearchPanel: document.querySelector(".map-search-panel"),
      sessionPanel: document.querySelector(".session-panel"),
      emailInput: document.getElementById("email-input"),
      passwordInput: document.getElementById("password-input"),
      loginForm: document.getElementById("login-form"),
      loginButton: document.getElementById("login-button"),
      logoutButton: document.getElementById("logout-button"),
      sessionName: document.getElementById("session-name"),
      sessionStatus: document.getElementById("session-status"),
      worldList: document.getElementById("world-list"),
      leaderboardTitle: document.getElementById("leaderboard-title"),
      leaderboardList: document.getElementById("leaderboard-list"),
      detailsTitle: document.getElementById("details-title"),
      detailsContent: document.getElementById("details-content"),
      mapCanvas: document.getElementById("map-canvas"),
      mapCoordinates: document.getElementById("map-coordinates"),
      mapOverlay: document.getElementById("map-overlay"),
      searchInput: document.getElementById("search-input"),
      searchResults: document.getElementById("search-results"),
      searchStatus: document.getElementById("search-status"),
      filterToggleButton: document.getElementById("filter-toggle-button"),
      filterStatus: document.getElementById("filter-status"),
      filterMenu: document.getElementById("filter-menu"),
      filterClearButton: document.getElementById("filter-clear-button"),
      filterTypeOptions: document.getElementById("filter-type-options"),
      filterTribeOptions: document.getElementById("filter-tribe-options"),
      filterLevelOptions: document.getElementById("filter-level-options"),
      findHomeButton: document.getElementById("find-home-button"),
      zoomInButton: document.getElementById("zoom-in-button"),
      zoomOutButton: document.getElementById("zoom-out-button"),
    };
  }

  async start() {
    this.config = await this.api.getConfig();
    const assets = new AssetCache(this.config);
    this.playerBaseIconUrl = assets.urlFor(ASSET_PATHS.playerBase);
    this.setSessionStatus("Loading CDN assets...");
    this.setSearchEnabled(false, "Loading CDN assets...");
    this.setFilterEnabled(false);
    await assets.preload();

    this.renderer = new MapRenderer({
      canvas: this.elements.mapCanvas,
      overlayEl: this.elements.mapOverlay,
      coordsEl: this.elements.mapCoordinates,
      statusEl: null,
      assets,
      api: this.api,
      onHoverCell: (cell) => this.handleHoveredCell(cell),
      onSelectCell: (cell) => this.handleSelectedCell(cell),
    });

    this.bindEvents();
    await this.loadWorlds();
    await this.restoreSession();
    this.renderer.render();
  }

  bindEvents() {
    this.elements.loginForm.addEventListener("submit", (event) => this.handleLogin(event));
    this.elements.logoutButton.addEventListener("click", () => this.handleLogout());
    this.elements.findHomeButton.addEventListener("click", () => this.renderer.focusHome());
    this.elements.zoomInButton.addEventListener("click", () => this.renderer.zoomBy(1.18, true));
    this.elements.zoomOutButton.addEventListener("click", () => this.renderer.zoomBy(1 / 1.18, true));
    this.elements.searchInput.addEventListener("input", () => this.handleSearchInput());
    this.elements.searchInput.addEventListener("keydown", (event) => this.handleSearchKeyDown(event));
    this.elements.searchInput.addEventListener("focus", () => this.renderSearchResults());
    this.elements.searchInput.addEventListener("blur", () => {
      window.setTimeout(() => this.hideSearchResults(), 120);
    });
    this.elements.filterToggleButton.addEventListener("click", () => this.handleFilterToggle());
    this.elements.filterClearButton.addEventListener("click", () => this.clearFilters());
    this.elements.filterTypeOptions.addEventListener("change", (event) => this.handleFilterOptionChange(event));
    this.elements.filterTribeOptions.addEventListener("change", (event) => this.handleFilterOptionChange(event));
    this.elements.filterLevelOptions.addEventListener("change", (event) => this.handleFilterOptionChange(event));
  }

  async restoreSession() {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      this.setSignedOutState();
      return;
    }

    this.setSessionStatus("Refreshing BYM session...");

    try {
      await this.establishSession(() => this.api.refresh(storedToken));
    } catch (error) {
      console.error(error);
      this.handleLogout(error.message || "Your BYM session expired.");
    }
  }

  async establishSession(loader) {
    this.elements.loginButton.disabled = true;
    try {
      const session = await loader();
      window.localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
      this.session = session;
      this.elements.logoutButton.hidden = false;
      this.elements.loginForm.hidden = true;
      this.elements.sessionPanel.classList.add("signed-in");
      this.elements.sessionName.textContent = session.user.username || "Signed in";
      this.elements.findHomeButton.disabled = false;
      this.setSessionStatus("");
      this.setSearchEnabled(false, "Loading full world map...");
      this.setFilterEnabled(false);
      await this.renderer.bootstrap(session);
      this.rebuildSearchIndex();
      this.rebuildFilterOptions();
      this.setSearchEnabled(
        true,
        this.searchEntries.length
          ? `${formatNumber(this.searchEntries.length)} player bases indexed.`
          : "No searchable player bases found.",
      );
      this.setFilterEnabled(true);
      this.renderDetails();
    } finally {
      this.elements.loginButton.disabled = false;
    }
  }

  async handleLogin(event) {
    event.preventDefault();
    const email = this.elements.emailInput.value.trim();
    const password = this.elements.passwordInput.value;

    if (!email || !password) {
      this.setSessionStatus("Email and password are required.", true);
      return;
    }

    this.setSessionStatus("Signing into BYM...");

    try {
      await this.establishSession(() => this.api.login(email, password));
      this.elements.passwordInput.value = "";
    } catch (error) {
      console.error(error);
      this.setSessionStatus(error.message || "Authentication failed.", true);
      this.setSearchEnabled(false, "Sign in to search the loaded world map.");
      this.setFilterEnabled(false);
      this.renderer.reset("Sign in to load live MR3 data.");
    }
  }

  handleLogout(message = "Signed out.") {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    this.session = null;
    this.elements.logoutButton.hidden = true;
    this.elements.loginForm.hidden = false;
    this.elements.sessionPanel.classList.remove("signed-in");
    this.elements.loginButton.disabled = false;
    this.elements.findHomeButton.disabled = true;
    this.elements.sessionName.textContent = "Signed out";
    this.setSessionStatus(message);
    this.setSearchEnabled(false, "Sign in to search the loaded world map.");
    this.setFilterEnabled(false);
    this.renderer.reset("Sign in to load live MR3 data.");
    this.selectedCell = null;
    this.hoveredCell = null;
    this.renderDetails();
  }

  async loadWorlds() {
    const worldsResponse = await this.api.getWorlds();
    this.worlds = (worldsResponse.worlds || [])
      .filter((world) => Number(world.map_version) === 3)
      .sort((left, right) => Number(right.playerCount || 0) - Number(left.playerCount || 0));

    this.selectedWorldId = this.worlds[0]?.uuid || null;
    this.renderWorldList();

    if (this.selectedWorldId) {
      await this.loadLeaderboard(this.selectedWorldId);
    }
  }

  renderWorldList() {
    this.elements.worldList.replaceChildren();

    if (!this.worlds.length) {
      this.elements.worldList.textContent = "No MR3 worlds available.";
      return;
    }

    for (const world of this.worlds) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "world-card";
      if (world.uuid === this.selectedWorldId) {
        button.classList.add("active");
      }
      button.innerHTML = `
        <strong>${escapeHtml(world.name || "Unnamed World")}</strong>
        <div class="muted">Players: ${formatNumber(Number(world.playerCount || 0))}</div>
      `;
      button.addEventListener("click", async () => {
        this.selectedWorldId = world.uuid;
        this.renderWorldList();
        await this.loadLeaderboard(world.uuid);
      });
      this.elements.worldList.appendChild(button);
    }
  }

  async loadLeaderboard(worldId) {
    const world = this.worlds.find((candidate) => candidate.uuid === worldId) || null;
    this.elements.leaderboardTitle.textContent = world ? world.name : "Selected world";
    this.elements.leaderboardList.textContent = "Loading leaderboard...";

    try {
      const response = await this.api.getLeaderboard(worldId, 3);
      const rows = response.leaderboard || [];
      this.elements.leaderboardList.replaceChildren();

      if (!rows.length) {
        this.elements.leaderboardList.textContent = "No leaderboard entries available.";
        return;
      }

      rows.forEach((entry, index) => {
        const row = document.createElement("div");
        row.className = "leaderboard-row";
        row.innerHTML = `
          <strong>${index + 1}</strong>
          <div>
            <div>${escapeHtml(entry.username || "Unknown")}</div>
            <div class="muted">Strongholds ${entry.stronghold_count || 0} | Resources ${entry.outpost_count || 0}</div>
          </div>
          <span class="muted">${escapeHtml(entry.discord_tag || "")}</span>
        `;
        this.elements.leaderboardList.appendChild(row);
      });
    } catch (error) {
      console.error(error);
      this.elements.leaderboardList.textContent = error.message || "Failed to load leaderboard.";
    }
  }

  handleHoveredCell(cell) {
    this.hoveredCell = cell;
    if (!this.selectedCell) {
      this.renderDetails();
    }
  }

  handleSelectedCell(cell) {
    this.selectedCell = cell;
    this.renderDetails();
  }

  renderDetails() {
    const cell = this.selectedCell || this.hoveredCell || null;
    this.elements.detailsContent.replaceChildren();

    if (!cell) {
      this.elements.detailsTitle.textContent = "No selection";
      this.elements.detailsContent.textContent = "Hover a visible MR3 cell to inspect it.";
      return;
    }

    this.elements.detailsTitle.textContent = cell.n || `${cell.x}, ${cell.y}`;
    const rows = [
      ["Coordinates", `${cell.x}, ${cell.y}`],
      ["Type", describeYardType(cell)],
      ["Level", formatNumber(Number(cell.l || 0))],
      ["Altitude", formatNumber(Number(cell.i || 0))],
      ["Range", formatNumber(Number(cell.r || 0))],
      ["Damage", `${formatNumber(Number(cell.dm || 0))}%`],
      ["Relationship", describeRelationship(cell.rel)],
    ];

    if (cell.bid) {
      rows.push(["Base ID", String(cell.bid)]);
    }
    if (Number(cell.uid || 0) > 0) {
      rows.push(["Owner ID", String(cell.uid)]);
    }
    if (Number(cell.tid || 0) > 0 || Number(cell.uid || 0) === 0) {
      rows.push(["Tribe", describeTribe(cell)]);
    }
    if (Number(cell.p || 0) === 1) {
      rows.push(["Protection", "Damage protection"]);
    }

    for (const [label, value] of rows) {
      const row = document.createElement("div");
      row.className = "detail-row";
      row.innerHTML = `<span class="detail-label">${escapeHtml(label)}</span><span>${escapeHtml(value)}</span>`;
      this.elements.detailsContent.appendChild(row);
    }
  }

  rebuildSearchIndex() {
    this.searchEntries = this.renderer
      ? this.renderer.getSearchablePlayerBases().sort((left, right) => {
        if (left.distance !== right.distance) {
          return Number(left.distance ?? Number.MAX_SAFE_INTEGER) - Number(right.distance ?? Number.MAX_SAFE_INTEGER);
        }

        return left.normalizedUsername.localeCompare(right.normalizedUsername);
      })
      : [];
    this.searchMatches = [];
    this.searchActiveIndex = -1;
    this.elements.searchInput.value = "";
    this.hideSearchResults();
  }

  rebuildFilterOptions() {
    this.filterState = createEmptyBaseFilter();
    this.availableFilterLevels = this.renderer ? this.renderer.getAvailableWildBaseLevels() : [];
    this.renderFilterOptions();
    this.applyFilters();
  }

  setSearchEnabled(enabled, message = "") {
    this.elements.searchInput.disabled = !enabled;
    if (!enabled) {
      this.searchEntries = [];
      this.searchMatches = [];
      this.searchActiveIndex = -1;
      this.elements.searchInput.value = "";
      this.hideSearchResults();
    }

    this.elements.searchStatus.hidden = !message;
    this.elements.searchStatus.textContent = message;
  }

  setFilterEnabled(enabled) {
    this.elements.filterToggleButton.disabled = !enabled;

    if (!enabled) {
      this.filterState = createEmptyBaseFilter();
      this.availableFilterLevels = [];
      this.setFilterMenuOpen(false);
    }

    this.renderFilterOptions();
    this.syncFilterButtonState();
    this.renderer?.setBaseFilter(this.filterState);
    this.updateFilterStatus(enabled);
  }

  handleFilterToggle() {
    if (this.elements.filterToggleButton.disabled) {
      return;
    }

    this.setFilterMenuOpen(!this.filterMenuOpen);
  }

  setFilterMenuOpen(isOpen) {
    this.filterMenuOpen = isOpen;
    this.elements.filterMenu.hidden = !isOpen;
    this.elements.filterToggleButton.setAttribute("aria-expanded", String(isOpen));
    this.syncFilterButtonState();
  }

  handleFilterOptionChange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const group = input.dataset.group;
    if (!group || !["types", "tribes", "levels"].includes(group)) {
      return;
    }

    const nextValues = new Set(this.filterState[group]);
    const rawValue = group === "levels" ? Number(input.value) : input.value;
    if (input.checked) {
      nextValues.add(rawValue);
    } else {
      nextValues.delete(rawValue);
    }

    this.filterState = {
      ...this.filterState,
      [group]: [...nextValues].sort((left, right) => {
        if (typeof left === "number" && typeof right === "number") {
          return left - right;
        }
        return String(left).localeCompare(String(right));
      }),
    };

    this.renderFilterOptions();
    this.applyFilters();
  }

  clearFilters() {
    this.filterState = createEmptyBaseFilter();
    this.renderFilterOptions();
    this.applyFilters();
  }

  applyFilters() {
    this.renderer?.setBaseFilter(this.filterState);
    this.syncFilterButtonState();
    this.updateFilterStatus(true);
  }

  renderFilterOptions() {
    const filterEnabled = !this.elements.filterToggleButton.disabled;
    this.renderFilterGroup(this.elements.filterTypeOptions, "types", TYPE_FILTER_OPTIONS, filterEnabled);
    this.renderFilterGroup(this.elements.filterTribeOptions, "tribes", TRIBE_FILTER_OPTIONS, filterEnabled);

    const levelOptions = this.availableFilterLevels.map((level) => ({
      key: level,
      label: String(level),
    }));
    this.renderFilterGroup(this.elements.filterLevelOptions, "levels", levelOptions, filterEnabled);

    if (!levelOptions.length) {
      this.elements.filterLevelOptions.textContent = filterEnabled
        ? "No wild base levels available."
        : "Sign in to load filter levels.";
    }

    this.elements.filterClearButton.disabled = !hasActiveBaseFilterState(this.filterState);
  }

  renderFilterGroup(container, group, options, enabled) {
    container.replaceChildren();

    for (const option of options) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      const text = document.createElement("span");
      const optionValue = option.key;
      const isChecked = this.filterState[group].includes(optionValue);

      label.className = `filter-chip${isChecked ? " active" : ""}`;
      input.type = "checkbox";
      input.value = String(optionValue);
      input.dataset.group = group;
      input.checked = isChecked;
      input.disabled = !enabled;
      text.textContent = option.label;

      label.append(input, text);
      container.appendChild(label);
    }
  }

  syncFilterButtonState() {
    const isActive = this.filterMenuOpen || hasActiveBaseFilterState(this.filterState);
    this.elements.filterToggleButton.classList.toggle("active", isActive);
  }

  updateFilterStatus(isEnabled) {
    if (!isEnabled) {
      this.elements.filterStatus.textContent = "Sign in to enable filters.";
      return;
    }

    if (!hasActiveBaseFilterState(this.filterState)) {
      this.elements.filterStatus.textContent = "No filters active.";
      return;
    }

    const segments = [];
    if (this.filterState.types.length) {
      const labels = TYPE_FILTER_OPTIONS
        .filter((option) => this.filterState.types.includes(option.key))
        .map((option) => option.label);
      segments.push(`Type: ${labels.join(", ")}`);
    }

    if (this.filterState.tribes.length) {
      const labels = TRIBE_FILTER_OPTIONS
        .filter((option) => this.filterState.tribes.includes(option.key))
        .map((option) => option.label);
      segments.push(`Tribe: ${labels.join(", ")}`);
    }

    if (this.filterState.levels.length) {
      segments.push(`Levels: ${this.filterState.levels.join(", ")}`);
    }

    this.elements.filterStatus.textContent = segments.join(" | ");
  }

  handleSearchInput() {
    const query = this.elements.searchInput.value.trim().toLocaleLowerCase();
    if (!query) {
      this.searchMatches = [];
      this.searchActiveIndex = -1;
      this.renderSearchResults();
      this.elements.searchStatus.hidden = false;
      this.elements.searchStatus.textContent = this.searchEntries.length
        ? `${formatNumber(this.searchEntries.length)} player bases indexed.`
        : "No searchable player bases found.";
      return;
    }

    const rankedMatches = this.searchEntries
      .map((entry) => {
        const matchIndex = entry.normalizedUsername.indexOf(query);
        if (matchIndex === -1) {
          return null;
        }

        return {
          ...entry,
          matchIndex,
          isPrefixMatch: matchIndex === 0,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left.isPrefixMatch !== right.isPrefixMatch) {
          return left.isPrefixMatch ? -1 : 1;
        }
        if (left.matchIndex !== right.matchIndex) {
          return left.matchIndex - right.matchIndex;
        }
        if (left.distance !== right.distance) {
          return Number(left.distance ?? Number.MAX_SAFE_INTEGER) - Number(right.distance ?? Number.MAX_SAFE_INTEGER);
        }
        return left.normalizedUsername.localeCompare(right.normalizedUsername);
      });

    this.searchMatches = rankedMatches.slice(0, SEARCH_RESULT_LIMIT);
    this.searchActiveIndex = this.searchMatches.length ? 0 : -1;
    this.renderSearchResults();
    this.elements.searchStatus.hidden = false;
    this.elements.searchStatus.textContent = rankedMatches.length
      ? `${formatNumber(rankedMatches.length)} match${rankedMatches.length === 1 ? "" : "es"} found.`
      : "No player bases match that username.";
  }

  handleSearchKeyDown(event) {
    if (event.key === "ArrowDown" && this.searchMatches.length) {
      event.preventDefault();
      this.searchActiveIndex = (this.searchActiveIndex + 1) % this.searchMatches.length;
      this.renderSearchResults();
      return;
    }

    if (event.key === "ArrowUp" && this.searchMatches.length) {
      event.preventDefault();
      this.searchActiveIndex =
        (this.searchActiveIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
      this.renderSearchResults();
      return;
    }

    if (event.key === "Escape") {
      this.hideSearchResults();
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const selectedMatch = this.searchMatches[this.searchActiveIndex] || this.searchMatches[0] || null;
    if (selectedMatch) {
      this.selectSearchResult(selectedMatch);
    }
  }

  renderSearchResults() {
    const query = this.elements.searchInput.value.trim();
    this.elements.searchResults.replaceChildren();

    if (!query || !this.searchMatches.length || this.elements.searchInput.disabled) {
      this.hideSearchResults();
      return;
    }

    this.searchMatches.forEach((entry, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      if (index === this.searchActiveIndex) {
        button.classList.add("active");
      }
      button.innerHTML = `
        <img class="search-result-icon" src="${escapeHtml(this.playerBaseIconUrl)}" alt="">
        <div class="search-result-main">
          <span class="search-result-name">${escapeHtml(entry.username)}</span>
          <span class="search-result-meta">Level ${formatNumber(entry.level)}</span>
        </div>
        <span class="search-result-distance">${escapeHtml(formatDistance(entry.distance))}</span>
      `;
      button.dataset.index = String(index);
      button.addEventListener("mouseenter", () => {
        this.searchActiveIndex = index;
        this.syncSearchActiveResult();
      });
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        this.selectSearchResult(entry);
      });
      this.elements.searchResults.appendChild(button);
    });

    this.elements.searchResults.hidden = false;
    this.syncSearchActiveResult();
  }

  hideSearchResults() {
    this.elements.searchResults.hidden = true;
    this.elements.searchResults.replaceChildren();
  }

  syncSearchActiveResult() {
    const buttons = this.elements.searchResults.querySelectorAll(".search-result");
    buttons.forEach((button, index) => {
      button.classList.toggle("active", index === this.searchActiveIndex);
    });
  }

  selectSearchResult(entry) {
    this.elements.searchInput.value = entry.username;
    this.hideSearchResults();
    this.elements.searchStatus.hidden = false;
    this.elements.searchStatus.textContent = `${entry.username} - ${formatDistance(entry.distance)}`;
    this.renderer.focusCell(entry.cell, { animate: true });
  }

  setSessionStatus(message, isError = false) {
    this.elements.sessionStatus.hidden = !message;
    this.elements.sessionStatus.textContent = message;
    this.elements.sessionStatus.style.color = isError ? "#ffb59f" : "";
  }

  setSignedOutState() {
    this.elements.logoutButton.hidden = true;
    this.elements.loginForm.hidden = false;
    this.elements.sessionPanel.classList.remove("signed-in");
    this.elements.loginButton.disabled = false;
    this.elements.findHomeButton.disabled = true;
    this.elements.sessionName.textContent = "Signed out";
    this.setSessionStatus("Sign in with your own BYM credentials.");
    this.setSearchEnabled(false, "Sign in to search the loaded world map.");
    this.setFilterEnabled(false);
    this.renderer?.reset("Sign in to load live MR3 data.");
    this.renderDetails();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new ViewerApp();
  app.start().catch((error) => {
    console.error(error);
    document.getElementById("session-status").textContent = error.message || "Viewer failed to start.";
  });
});

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

function calculateCellId(cellX, cellY, mapWidth) {
  return cellY * mapWidth + cellX + 1;
}

function cellKey(cellX, cellY) {
  return `${cellX},${cellY}`;
}

function getHexDistance(x1, y1, x2, y2) {
  const [q1, r1, s1] = offsetToCube(x1, y1);
  const [q2, r2, s2] = offsetToCube(x2, y2);
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
}

function offsetToCube(x, y) {
  const column = x - (y - (y & 1)) / 2;
  return [column, y, -column - y];
}

function makeEdgeKey(ax, ay, bx, by) {
  const start = vertexKey(ax, ay);
  const end = vertexKey(bx, by);
  return start < end ? `${start}|${end}` : `${end}|${start}`;
}

function vertexKey(x, y) {
  return `${x},${y}`;
}

function parseVertexKey(key) {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

function samePoint(left, right) {
  return left.x === right.x && left.y === right.y;
}

function isCollinear(previous, current, next) {
  const cross = (current.x - previous.x) * (next.y - current.y) - (current.y - previous.y) * (next.x - current.x);
  return Math.abs(cross) < 0.001;
}

function createEmptyBaseFilter() {
  return {
    types: [],
    tribes: [],
    levels: [],
  };
}

function createEmptyRendererBaseFilter() {
  return {
    types: new Set(),
    tribes: new Set(),
    levels: new Set(),
  };
}

function normalizeRendererBaseFilter(filter) {
  return {
    types: new Set(filter?.types || []),
    tribes: new Set(filter?.tribes || []),
    levels: new Set((filter?.levels || []).map((value) => Number(value)).filter((value) => value > 0)),
  };
}

function hasActiveBaseFilterState(filter) {
  return (
    Number(filter?.types?.length || 0) > 0 ||
    Number(filter?.tribes?.length || 0) > 0 ||
    Number(filter?.levels?.length || 0) > 0
  );
}

function getTribeKey(cell) {
  const tribeId = Number(cell?.tid);
  if (Number.isNaN(tribeId)) {
    return null;
  }

  return TRIBE_KEY_BY_ID[tribeId] || null;
}

function describeTribe(cell) {
  const tribeKey = getTribeKey(cell);
  if (!tribeKey) {
    return "Unknown";
  }

  return TRIBE_FILTER_OPTIONS.find((option) => option.key === tribeKey)?.label || "Unknown";
}

function buildFullMapCacheKey(userId, mapMeta) {
  const sessionId = getSessionCacheSessionId();
  const width = Number(mapMeta?.width || MR3.mapWidth);
  const height = Number(mapMeta?.height || MR3.mapHeight);
  const worldId = String(
    mapMeta?.worldid ||
      mapMeta?.worldId ||
      mapMeta?.wid ||
      mapMeta?.uuid ||
      `${width}x${height}`,
  );
  return `${FULL_MAP_CACHE_KEY_PREFIX}:${sessionId}:${userId}:${worldId}:${width}x${height}`;
}

let sessionCacheDbPromise = null;

function getSessionCacheSessionId() {
  try {
    let sessionId = window.sessionStorage.getItem(SESSION_CACHE_SESSION_KEY);
    if (!sessionId) {
      sessionId = createSessionId();
      window.sessionStorage.setItem(SESSION_CACHE_SESSION_KEY, sessionId);
    }

    return sessionId;
  } catch (error) {
    console.warn("Failed to initialize the session cache id.", error);
    return "volatile-session";
  }
}

async function ensureSessionCacheDb() {
  if (sessionCacheDbPromise) {
    return sessionCacheDbPromise;
  }

  if (typeof window === "undefined" || !window.indexedDB) {
    return null;
  }

  getSessionCacheSessionId();

  sessionCacheDbPromise = new Promise((resolve) => {
    const request = window.indexedDB.open(SESSION_CACHE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SESSION_CACHE_STORE_NAME)) {
        request.result.createObjectStore(SESSION_CACHE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn("Failed to open session cache.", request.error);
      resolve(null);
    };
    request.onblocked = () => {
      console.warn("Session cache open was blocked by another tab.");
      resolve(null);
    };
  });

  return sessionCacheDbPromise;
}

async function sessionCacheGet(key) {
  const database = await ensureSessionCacheDb();
  if (!database) {
    return null;
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(SESSION_CACHE_STORE_NAME, "readonly");
    const request = transaction.objectStore(SESSION_CACHE_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => {
      console.warn("Failed to read session cache entry.", request.error);
      resolve(null);
    };
  });
}

async function sessionCacheSet(key, value) {
  const database = await ensureSessionCacheDb();
  if (!database) {
    return;
  }

  await new Promise((resolve) => {
    const transaction = database.transaction(SESSION_CACHE_STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
      console.warn("Failed to write session cache entry.", transaction.error);
      resolve();
    };
    transaction.objectStore(SESSION_CACHE_STORE_NAME).put(value, key);
  });
}

function createSessionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDistance(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Unknown distance";
  }

  return `${formatNumber(Number(value))} cell${Number(value) === 1 ? "" : "s"} away`;
}

function describeRelationship(value) {
  switch (Number(value)) {
    case MR3.relationships.self:
      return "Self";
    case MR3.relationships.enemy:
      return "Enemy";
    case MR3.relationships.ally:
      return "Ally";
    case MR3.relationships.neutral:
      return "Neutral";
    default:
      return "Unknown";
  }
}

function describeYardType(cell) {
  switch (Number(cell.b)) {
    case MR3.yardTypes.player:
      return "Player base";
    case MR3.yardTypes.resource:
      return "Resource outpost";
    case MR3.yardTypes.stronghold:
      return "Stronghold";
    case MR3.yardTypes.fortification:
      return "Fortification";
    case MR3.yardTypes.empty:
      return Number(cell.uid || 0) === 0 && cell.bid ? "Wild monster base" : "Empty";
    case MR3.yardTypes.border:
      return "Border";
    default:
      return "Terrain";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pointInHex(pointX, pointY, originX, originY, zoom) {
  const vertices = [
    [52, 0],
    [104, 17],
    [104, 50],
    [52, 68],
    [0, 50],
    [0, 17],
  ].map(([x, y]) => [originX + x * zoom, originY + y * zoom]);

  let inside = false;
  for (let current = 0, previous = vertices.length - 1; current < vertices.length; previous = current++) {
    const [currentX, currentY] = vertices[current];
    const [previousX, previousY] = vertices[previous];
    const intersects =
      currentY > pointY !== previousY > pointY &&
      pointX < ((previousX - currentX) * (pointY - currentY)) / (previousY - currentY) + currentX;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}
