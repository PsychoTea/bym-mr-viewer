export const TOKEN_STORAGE_KEY = "bym-mr-viewer-token";
export const SESSION_CACHE_DB_NAME = "bym-mr-viewer-session-cache";
export const SESSION_CACHE_STORE_NAME = "entries";
export const SESSION_CACHE_SESSION_KEY = "bym-mr-viewer-session-id";
export const FULL_MAP_CACHE_VERSION = 1;
export const FULL_MAP_CACHE_KEY_PREFIX = "bym-mr-viewer-full-map";
export const SEARCH_RESULT_LIMIT = 100;
export const DEFAULT_VIEWER_CONFIG = Object.freeze({
  bymBaseUrl: "http://localhost:3001",
  cdnBaseUrl: "http://localhost:3001",
  apiVersion: "v1.5.4-beta",
});

export const MR3 = {
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

export const FLOOR_HEX_VERTICES = [
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
export const RANGE_HEX_VERTICES = [
  [52, 0],
  [104, 17],
  [104, 50],
  [52, 67],
  [0, 50],
  [0, 17],
];

export const RANGE_HEX_EDGES = RANGE_HEX_VERTICES.map((_, index) => [
  index,
  (index + 1) % RANGE_HEX_VERTICES.length,
]);

export const TILE_DEFINITIONS = [
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

export const ASSET_PATHS = {
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

export const TYPE_FILTER_OPTIONS = [
  { key: "outpost", label: "Outpost" },
  { key: "resource", label: "Resource outpost" },
  { key: "stronghold", label: "Stronghold" },
];

export const TRIBE_FILTER_OPTIONS = [
  { key: "kozu", label: "Kozu" },
  { key: "legionnaire", label: "Legionnaire" },
  { key: "abunakki", label: "Abunakki" },
  { key: "dreadnaut", label: "Dreadnaut" },
];

export const TRIBE_KEY_BY_ID = {
  0: "legionnaire",
  1: "kozu",
  2: "abunakki",
  3: "dreadnaut",
};

export const FORTIFICATION_DIRECTIONS = [
  { key: "fortificationEast", dx: 1, dy: 0 },
  { key: "fortificationWest", dx: -1, dy: 0 },
  { key: "fortificationNorthEast", dx: "oddRight", dy: -1 },
  { key: "fortificationNorthWest", dx: "oddLeft", dy: -1 },
  { key: "fortificationSouthEast", dx: "oddRight", dy: 1 },
  { key: "fortificationSouthWest", dx: "oddLeft", dy: 1 },
];



export async function fetchJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error(error?.message ? `Unable to reach BYM server: ${error.message}` : "Unable to reach BYM server.");
  }

  const rawBody = await response.text();
  const payload = parseJsonPayload(rawBody);

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload) || response.statusText || "Request failed");
  }

  return payload;
}

export function getViewerConfig() {
  if (getViewerConfig.cached) {
    return getViewerConfig.cached;
  }

  const runtimeConfig =
    typeof window !== "undefined" && typeof window.BYM_MR_VIEWER_CONFIG === "object"
      ? window.BYM_MR_VIEWER_CONFIG
      : {};

  getViewerConfig.cached = {
    bymBaseUrl: normalizeBaseUrl(runtimeConfig.bymBaseUrl || DEFAULT_VIEWER_CONFIG.bymBaseUrl),
    cdnBaseUrl: normalizeBaseUrl(
      runtimeConfig.cdnBaseUrl || runtimeConfig.bymBaseUrl || DEFAULT_VIEWER_CONFIG.cdnBaseUrl,
    ),
    apiVersion: normalizeApiVersion(runtimeConfig.apiVersion || DEFAULT_VIEWER_CONFIG.apiVersion),
  };

  return getViewerConfig.cached;
}

export function buildBymUrl(path, query = null, config = getViewerConfig()) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${config.bymBaseUrl}${normalizedPath}`);

  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

export function buildSessionPayload(loginResponse, map) {
  return {
    token: loginResponse?.token || "",
    user: {
      userid: loginResponse?.userid ?? loginResponse?.userId ?? null,
      username: loginResponse?.username || "",
      email: loginResponse?.email || "",
      pic_square: loginResponse?.pic_square || "",
    },
    map: map || {},
  };
}

export function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function normalizeApiVersion(value) {
  return String(value || DEFAULT_VIEWER_CONFIG.apiVersion).replace(/^\/+|\/+$/g, "");
}

export function parseJsonPayload(rawBody) {
  const text = String(rawBody || "").trim();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

export function extractErrorMessage(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (
    payload.errorDetails &&
    typeof payload.errorDetails === "object" &&
    typeof payload.errorDetails.message === "string" &&
    payload.errorDetails.message.trim()
  ) {
    return payload.errorDetails.message;
  }

  if (payload.details && typeof payload.details === "object") {
    return extractErrorMessage(payload.details);
  }

  if (typeof payload.raw === "string" && payload.raw.trim()) {
    return payload.raw;
  }

  return null;
}

export function calculateCellId(cellX, cellY, mapWidth) {
  return cellY * mapWidth + cellX + 1;
}

export function cellKey(cellX, cellY) {
  return `${cellX},${cellY}`;
}

export function getHexDistance(x1, y1, x2, y2) {
  const [q1, r1, s1] = offsetToCube(x1, y1);
  const [q2, r2, s2] = offsetToCube(x2, y2);
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
}

export function offsetToCube(x, y) {
  const column = x - (y - (y & 1)) / 2;
  return [column, y, -column - y];
}

export function makeEdgeKey(ax, ay, bx, by) {
  const start = vertexKey(ax, ay);
  const end = vertexKey(bx, by);
  return start < end ? `${start}|${end}` : `${end}|${start}`;
}

export function vertexKey(x, y) {
  return `${x},${y}`;
}

export function parseVertexKey(key) {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

export function samePoint(left, right) {
  return left.x === right.x && left.y === right.y;
}

export function isCollinear(previous, current, next) {
  const cross = (current.x - previous.x) * (next.y - current.y) - (current.y - previous.y) * (next.x - current.x);
  return Math.abs(cross) < 0.001;
}

export function createEmptyBaseFilter() {
  return {
    types: [],
    tribes: [],
    levels: [],
  };
}

export function createEmptyRendererBaseFilter() {
  return {
    types: new Set(),
    tribes: new Set(),
    levels: new Set(),
  };
}

export function normalizeRendererBaseFilter(filter) {
  return {
    types: new Set(filter?.types || []),
    tribes: new Set(filter?.tribes || []),
    levels: new Set((filter?.levels || []).map((value) => Number(value)).filter((value) => value > 0)),
  };
}

export function hasActiveBaseFilterState(filter) {
  return (
    Number(filter?.types?.length || 0) > 0 ||
    Number(filter?.tribes?.length || 0) > 0 ||
    Number(filter?.levels?.length || 0) > 0
  );
}

export function getTribeKey(cell) {
  const tribeId = Number(cell?.tid);
  if (Number.isNaN(tribeId)) {
    return null;
  }

  return TRIBE_KEY_BY_ID[tribeId] || null;
}

export function describeTribe(cell) {
  const tribeKey = getTribeKey(cell);
  if (!tribeKey) {
    return "Unknown";
  }

  return TRIBE_FILTER_OPTIONS.find((option) => option.key === tribeKey)?.label || "Unknown";
}

export function buildFullMapCacheKey(userId, mapMeta) {
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

export function getSessionCacheSessionId() {
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

export async function ensureSessionCacheDb() {
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

export async function sessionCacheGet(key) {
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

export async function sessionCacheSet(key, value) {
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

export function createSessionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDistance(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Unknown distance";
  }

  return `${formatNumber(Number(value))} cell${Number(value) === 1 ? "" : "s"} away`;
}

export function describeRelationship(value) {
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

export function describeYardType(cell) {
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

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function pointInHex(pointX, pointY, originX, originY, zoom) {
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

