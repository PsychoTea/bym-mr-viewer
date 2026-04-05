const TOKEN_STORAGE_KEY = "bym-mr-viewer-token";

const MR3 = {
  mapWidth: 500,
  mapHeight: 500,
  hexWidth: 104,
  hexHeight: 68,
  hexOverlap: 50,
  maxCellsToRequest: 500,
  bufferX: 30,
  bufferY: 30,
  defaultCellTtlMs: 120000,
  playerCellTtlMs: 30000,
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
  constructor({ canvas, overlayEl, statusEl, assets, api, limitationMessage, onHoverCell, onSelectCell }) {
    this.canvas = canvas;
    this.overlayEl = overlayEl;
    this.statusEl = statusEl;
    this.assets = assets;
    this.api = api;
    this.limitationMessage = limitationMessage;
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
    this.pendingFetch = false;
    this.fetchTimer = null;
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
    this.token = session.token;
    this.currentUserId = Number(session.user.userid || 0);
    this.mapMeta = session.map;
    this.cellCache.clear();
    this.homeCellKey = null;
    this.hoveredCellKey = null;
    this.selectedCellKey = null;
    this.zoom = 1;
    this.setOverlay("Loading live MR3 data...");
    this.setStatus("Loading current world");

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

    await this.ensureCellsForViewport(true);
    this.setOverlay(this.limitationMessage);
    this.setStatus("Current world");
    this.render();
  }

  reset(message) {
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
    this.dragging = false;
    this.dragMoved = false;
    this.setOverlay(message);
    this.setStatus("Waiting for sign-in");
    this.onHoverCell(null);
    this.onSelectCell(null);
    this.render();
  }

  getSelectedCell() {
    return this.selectedCellKey ? this.cellCache.get(this.selectedCellKey) || null : null;
  }

  zoomBy(multiplier) {
    const rect = this.canvas.getBoundingClientRect();
    this.setZoom(this.zoom * multiplier, rect.width * 0.5, rect.height * 0.5);
  }

  setOverlay(message) {
    this.overlayEl.textContent = message;
  }

  setStatus(message) {
    this.statusEl.textContent = message;
  }

  setZoom(nextZoom, focusX, focusY) {
    const clampedZoom = clamp(nextZoom, 0.55, 1.65);
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

  centerOnCell(cellX, cellY) {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const world = this.cellToWorld(cellX, cellY);
    this.offsetX = world.x - width / (2 * this.zoom) + MR3.hexWidth * 0.5;
    this.offsetY = world.y - height / (2 * this.zoom) + MR3.hexHeight * 0.5;
    this.clampOffset();
  }

  mergeCells(cells) {
    const now = Date.now();

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
        _expiresAt:
          now + (Number(rawCell.uid || 0) > 0 ? MR3.playerCellTtlMs : MR3.defaultCellTtlMs),
      };

      this.cellCache.set(cellKey(rawCell.x, rawCell.y), normalized);
    }
  }

  getMapWidth() {
    return Number(this.mapMeta?.width || MR3.mapWidth);
  }

  getMapHeight() {
    return Number(this.mapMeta?.height || MR3.mapHeight);
  }

  scheduleFetch() {
    if (!this.token) {
      return;
    }

    if (this.fetchTimer) {
      window.clearTimeout(this.fetchTimer);
    }

    this.fetchTimer = window.setTimeout(() => {
      this.ensureCellsForViewport(false).catch((error) => {
        console.error(error);
        this.setOverlay(error.message);
      });
    }, 90);
  }

  async ensureCellsForViewport(force) {
    if (!this.token || this.pendingFetch) {
      return;
    }

    const cellIds = this.buildCellRequestList(force);
    if (!cellIds.length) {
      return;
    }

    this.pendingFetch = true;
    this.setStatus("Fetching live cells");

    try {
      const response = await this.api.getMapCells(this.token, cellIds);
      this.mergeCells(response.celldata || []);
      this.onHoverCell(this.hoveredCellKey ? this.cellCache.get(this.hoveredCellKey) || null : null);
      this.onSelectCell(this.getSelectedCell());
      this.render();
    } finally {
      this.pendingFetch = false;
      this.setStatus("Current world");
      this.setOverlay(this.limitationMessage);
    }
  }

  buildCellRequestList(force) {
    const center = this.getCenterCell();
    const requests = [];
    const now = Date.now();
    const totalIterations = MR3.bufferX * MR3.bufferY * 4;
    let deltaX = 0;
    let deltaY = 0;
    let stepX = 0;
    let stepY = -1;

    for (let index = 0; index < totalIterations; index += 1) {
      const mapX = center.x + deltaX;
      const mapY = center.y + deltaY;

      if (
        deltaX === deltaY ||
        (deltaX < 0 && deltaX === -deltaY) ||
        (deltaX > 0 && deltaX === 1 - deltaY)
      ) {
        const nextStepX = -stepY;
        const nextStepY = stepX;
        stepX = nextStepX;
        stepY = nextStepY;
      }

      deltaX += stepX;
      deltaY += stepY;

      if (mapX < 0 || mapY < 0 || mapX >= this.getMapWidth() || mapY >= this.getMapHeight()) {
        continue;
      }

      const key = cellKey(mapX, mapY);
      const cached = this.cellCache.get(key);
      if (!force && cached && cached._expiresAt > now) {
        continue;
      }

      requests.push(calculateCellId(mapX, mapY, this.getMapWidth()));
      if (requests.length >= MR3.maxCellsToRequest) {
        break;
      }
    }

    return requests;
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
      this.selectedCellKey = hovered ? cellKey(hovered.x, hovered.y) : this.selectedCellKey;
      this.onSelectCell(this.getSelectedCell());
      this.render();
    }
  }

  handlePointerLeave() {
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
    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const multiplier = event.deltaY < 0 ? 1.14 : 1 / 1.14;
    this.setZoom(this.zoom * multiplier, localX, localY);
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
    const maxWorldX = this.getMapWidth() * MR3.hexWidth + MR3.hexWidth * 0.5;
    const maxWorldY = this.getMapHeight() * MR3.hexOverlap + MR3.hexHeight;
    const maxOffsetX = Math.max(0, maxWorldX - width / this.zoom);
    const maxOffsetY = Math.max(0, maxWorldY - height / this.zoom);

    this.offsetX = clamp(this.offsetX, 0, maxOffsetX);
    this.offsetY = clamp(this.offsetY, 0, maxOffsetY);
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
      this.drawCell(cell);
    }

    this.drawSelectionHighlights();
  }

  drawBackground(width, height) {
    const background = this.assets.get(ASSET_PATHS.background);
    if (!background) {
      this.ctx.fillStyle = "#203021";
      this.ctx.fillRect(0, 0, width, height);
      return;
    }

    const pattern = this.ctx.createPattern(background, "repeat");
    if (!pattern) {
      this.ctx.fillStyle = "#203021";
      this.ctx.fillRect(0, 0, width, height);
      return;
    }

    this.ctx.save();
    this.ctx.translate((-(this.offsetX * this.zoom)) % background.width, (-(this.offsetY * this.zoom)) % background.height);
    this.ctx.fillStyle = pattern;
    this.ctx.fillRect(-background.width, -background.height, width + background.width * 2, height + background.height * 2);
    this.ctx.restore();

    this.ctx.fillStyle = "rgba(10, 15, 10, 0.28)";
    this.ctx.fillRect(0, 0, width, height);
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

  drawCell(cell) {
    const world = this.cellToWorld(cell.x, cell.y);
    const screenX = (world.x - this.offsetX) * this.zoom;
    const screenY = (world.y - this.offsetY) * this.zoom;
    const cellIndex = cell.y * this.getMapWidth() + cell.x;
    const tile = this.assets.pickTile(cell, cellIndex);

    if (tile) {
      this.ctx.drawImage(tile, screenX, screenY, tile.width * this.zoom, tile.height * this.zoom);
    }

    if (!this.doesContainDisplayableBase(cell)) {
      return;
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

  drawSelectionHighlights() {
    if (this.hoveredCellKey) {
      const hovered = this.cellCache.get(this.hoveredCellKey);
      if (hovered) {
        this.drawHighlight(hovered, "rgba(255, 255, 255, 0.18)");
      }
    }

    if (this.selectedCellKey) {
      const selected = this.cellCache.get(this.selectedCellKey);
      if (selected) {
        this.drawHighlight(selected, "rgba(255, 255, 255, 0.32)");
      }
    }
  }

  drawHighlight(cell, color) {
    const world = this.cellToWorld(cell.x, cell.y);
    const screenX = (world.x - this.offsetX) * this.zoom;
    const screenY = (world.y - this.offsetY) * this.zoom;
    const centerX = screenX + MR3.hexWidth * 0.5 * this.zoom;
    const centerY = screenY + (MR3.hexHeight * 0.5 - MR3.hexOverlap * 0.25) * this.zoom;
    const radiusX = MR3.hexWidth * 0.5 * this.zoom;
    const radiusY = MR3.hexOverlap * 0.5 * this.zoom;

    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
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

  findCellAtPoint(screenX, screenY) {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const visible = this.getVisibleCells(width, height);
    visible.sort((left, right) => (right.y - left.y) || (right.x - left.x));

    for (const cell of visible) {
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

    this.elements = {
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
      mapOverlay: document.getElementById("map-overlay"),
      mapStatus: document.getElementById("map-status"),
      zoomInButton: document.getElementById("zoom-in-button"),
      zoomOutButton: document.getElementById("zoom-out-button"),
    };
  }

  async start() {
    this.config = await this.api.getConfig();
    const assets = new AssetCache(this.config);
    this.setSessionStatus("Loading CDN assets...");
    await assets.preload();

    this.renderer = new MapRenderer({
      canvas: this.elements.mapCanvas,
      overlayEl: this.elements.mapOverlay,
      statusEl: this.elements.mapStatus,
      assets,
      api: this.api,
      limitationMessage: this.config.limitations.message,
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
    this.elements.zoomInButton.addEventListener("click", () => this.renderer.zoomBy(1.18));
    this.elements.zoomOutButton.addEventListener("click", () => this.renderer.zoomBy(1 / 1.18));
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
      this.elements.sessionName.textContent = session.user.username || "Signed in";
      this.setSessionStatus("Signed in. Token cached locally in this browser.");
      this.elements.mapStatus.textContent = "Preparing current world";
      await this.renderer.bootstrap(session);
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
      this.renderer.reset("Sign in to load live MR3 data.");
    }
  }

  handleLogout(message = "Signed out.") {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    this.session = null;
    this.elements.logoutButton.hidden = true;
    this.elements.loginForm.hidden = false;
    this.elements.loginButton.disabled = false;
    this.elements.sessionName.textContent = "Signed out";
    this.setSessionStatus(message);
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
      rows.push(["Tribe", String(cell.tid || 0)]);
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

  setSessionStatus(message, isError = false) {
    this.elements.sessionStatus.textContent = message;
    this.elements.sessionStatus.style.color = isError ? "#ffb59f" : "";
  }

  setSignedOutState() {
    this.elements.logoutButton.hidden = true;
    this.elements.loginForm.hidden = false;
    this.elements.loginButton.disabled = false;
    this.elements.sessionName.textContent = "Signed out";
    this.setSessionStatus("Sign in with your own BYM credentials.");
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
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
