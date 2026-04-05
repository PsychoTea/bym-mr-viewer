import {
  ASSET_PATHS,
  FORTIFICATION_DIRECTIONS,
  FULL_MAP_CACHE_VERSION,
  FLOOR_HEX_VERTICES,
  MR3,
  RANGE_HEX_EDGES,
  RANGE_HEX_VERTICES,
  buildFullMapCacheKey,
  calculateCellId,
  cellKey,
  clamp,
  createEmptyRendererBaseFilter,
  getHexDistance,
  getTribeKey,
  isCollinear,
  makeEdgeKey,
  normalizeRendererBaseFilter,
  parseVertexKey,
  pointInHex,
  positiveModulo,
  samePoint,
  sessionCacheGet,
  sessionCacheSet,
  vertexKey,
} from "./shared.js";
export class MapRenderer {
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
    this.viewportWidth = 0;
    this.viewportHeight = 0;

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
    this.fullMapCacheKey = buildFullMapCacheKey(this.currentUserId, this.mapMeta, this.api?.config?.bymBaseUrl);
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

  async refreshMapData() {
    if (!this.token || this.fullMapPreloading) {
      return;
    }

    const snapshot = {
      cellCache: new Map(this.cellCache),
      homeCellKey: this.homeCellKey,
      hoveredCellKey: this.hoveredCellKey,
      selectedCellKey: this.selectedCellKey,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      zoom: this.zoom,
      fullMapLoaded: this.fullMapLoaded,
    };

    try {
      this.cancelAnimations();
      this.fullMapLoaded = false;
      this.fullMapPreloading = false;
      this.cellCache.clear();
      this.setOverlay("Refreshing live MR3 data...");
      this.setCoordinatesDisplay(null);

      const initResponse = await this.api.getMapInit(this.token);
      this.mergeCells(initResponse.celldata || []);

      const homeCell = (initResponse.celldata || [])[0] || null;
      this.homeCellKey = homeCell ? cellKey(homeCell.x, homeCell.y) : snapshot.homeCellKey;
      this.hoveredCellKey = null;
      this.selectedCellKey = snapshot.selectedCellKey;
      this.offsetX = snapshot.offsetX;
      this.offsetY = snapshot.offsetY;
      this.zoom = snapshot.zoom;
      this.clampOffset();
      this.onHoverCell(null);
      this.onSelectCell(this.getSelectedCell());
      this.render();

      await this.preloadEntireMap("Refreshing world map");

      this.hoveredCellKey =
        snapshot.hoveredCellKey && this.cellCache.has(snapshot.hoveredCellKey)
          ? snapshot.hoveredCellKey
          : null;
      this.selectedCellKey =
        snapshot.selectedCellKey && this.cellCache.has(snapshot.selectedCellKey)
          ? snapshot.selectedCellKey
          : null;
      this.onHoverCell(this.hoveredCellKey ? this.cellCache.get(this.hoveredCellKey) || null : null);
      this.onSelectCell(this.getSelectedCell());
      this.setOverlay("");
      this.render();
    } catch (error) {
      this.cellCache = snapshot.cellCache;
      this.homeCellKey = snapshot.homeCellKey;
      this.hoveredCellKey = snapshot.hoveredCellKey;
      this.selectedCellKey = snapshot.selectedCellKey;
      this.offsetX = snapshot.offsetX;
      this.offsetY = snapshot.offsetY;
      this.zoom = snapshot.zoom;
      this.fullMapLoaded = snapshot.fullMapLoaded;
      this.fullMapPreloading = false;
      this.onHoverCell(this.hoveredCellKey ? this.cellCache.get(this.hoveredCellKey) || null : null);
      this.onSelectCell(this.getSelectedCell());
      this.setOverlay("");
      this.render();
      throw error;
    }
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
      this.baseFilter.levels.size > 0 ||
      Number(this.baseFilter.playerOwnerId || 0) > 0
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

    if (Number(this.baseFilter.playerOwnerId || 0) > 0) {
      return this.matchesPlayerOwnerFilter(cell);
    }

    if (this.isAlwaysVisibleOwnedBase(cell)) {
      return true;
    }

    return this.matchesBaseFilter(cell);
  }

  matchesPlayerOwnerFilter(cell) {
    const ownerId = Number(this.baseFilter.playerOwnerId || 0);
    if (ownerId <= 0) {
      return false;
    }

    if (Number(cell.uid || 0) !== ownerId) {
      return false;
    }

    return (
      Number(cell.b) === MR3.yardTypes.player ||
      Number(cell.b) === MR3.yardTypes.resource ||
      Number(cell.b) === MR3.yardTypes.stronghold ||
      Number(cell.b) === MR3.yardTypes.fortification
    );
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
    this.overlayEl.dataset.message = message || "";
    this.overlayEl.textContent = "";
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

  async preloadEntireMap(progressLabel = "Loading full world map") {
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

    this.setOverlay(`${progressLabel} (0%)...`);

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
        this.setOverlay(`${progressLabel} (${percent}%)...`);

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
        ownerId: Number(cell.uid || 0),
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
    const previousWidth = this.viewportWidth;
    const previousHeight = this.viewportHeight;

    if (
      this.token &&
      previousWidth > 0 &&
      previousHeight > 0 &&
      (previousWidth !== width || previousHeight !== height)
    ) {
      const centerWorldX = this.offsetX + previousWidth / (2 * this.zoom);
      const centerWorldY = this.offsetY + previousHeight / (2 * this.zoom);
      this.offsetX = centerWorldX - width / (2 * this.zoom);
      this.offsetY = centerWorldY - height / (2 * this.zoom);
      this.clampOffset();
    }

    this.viewportWidth = width;
    this.viewportHeight = height;

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

