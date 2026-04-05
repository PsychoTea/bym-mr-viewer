import { ApiClient } from "./api-client.js";
import { AssetCache } from "./asset-cache.js";
import { MapRenderer } from "./map-renderer.js";
import {
  ASSET_PATHS,
  SEARCH_RESULT_LIMIT,
  SERVER_SELECTION_STORAGE_KEY,
  STABLE_VIEWER_CONFIG,
  buildTokenStorageKey,
  TRIBE_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
  createEmptyBaseFilter,
  describeRelationship,
  describeTribe,
  describeYardType,
  escapeHtml,
  formatDistance,
  formatNumber,
  getLocalViewerConfig,
  hasActiveBaseFilterState,
  normalizeApiVersion,
  normalizeBaseUrl,
  setViewerConfig,
} from "./shared.js";

const MAP_REFRESH_COOLDOWN_MS = 30_000;

export class ViewerApp {
  constructor() {
    this.api = null;
    this.assets = null;
    this.config = null;
    this.localConfig = null;
    this.session = null;
    this.worlds = [];
    this.selectedWorldId = null;
    this.hoveredCell = null;
    this.selectedCell = null;
    this.playerBaseIconUrl = "";
    this.searchEntries = [];
    this.searchMatches = [];
    this.searchActiveIndex = -1;
    this.playerFilterEntries = [];
    this.filterState = createEmptyBaseFilter();
    this.availableFilterLevels = [];
    this.filterMenuOpen = false;
    this.refreshInFlight = false;
    this.refreshCooldownUntil = 0;
    this.refreshCooldownTimer = 0;
    this.sidebarCollapsed = false;
    this.serverSelection = null;

    this.elements = {
      appRoot: document.getElementById("app"),
      mapSearchPanel: document.querySelector(".map-search-panel"),
      sessionPanel: document.querySelector(".session-panel"),
      serverSelect: document.getElementById("server-select"),
      serverCustomFields: document.getElementById("server-custom-fields"),
      serverHostInput: document.getElementById("server-host-input"),
      serverPortInput: document.getElementById("server-port-input"),
      emailInput: document.getElementById("email-input"),
      passwordInput: document.getElementById("password-input"),
      loginForm: document.getElementById("login-form"),
      loginButton: document.getElementById("login-button"),
      logoutButton: document.getElementById("logout-button"),
      sessionName: document.getElementById("session-name"),
      sessionWorld: document.getElementById("session-world"),
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
      filterPlayerInput: document.getElementById("filter-player-input"),
      filterPlayerOptions: document.getElementById("filter-player-options"),
      filterTypeOptions: document.getElementById("filter-type-options"),
      filterTribeOptions: document.getElementById("filter-tribe-options"),
      filterLevelOptions: document.getElementById("filter-level-options"),
      refreshButton: document.getElementById("refresh-button"),
      findHomeButton: document.getElementById("find-home-button"),
      zoomInButton: document.getElementById("zoom-in-button"),
      zoomOutButton: document.getElementById("zoom-out-button"),
      sidebarToggleButton: document.getElementById("sidebar-toggle-button"),
    };
  }

  async start() {
    this.localConfig = getLocalViewerConfig();
    this.serverSelection = this.loadServerSelection();
    this.bindEvents();
    this.syncServerInputs();
    await this.applyServerSelection({ restoreSession: true });
  }

  bindEvents() {
    this.elements.serverSelect.addEventListener("change", () => this.handleServerSelectionChange());
    this.elements.serverHostInput.addEventListener("change", () => this.handleCustomServerChange());
    this.elements.serverPortInput.addEventListener("change", () => this.handleCustomServerChange());
    this.elements.serverHostInput.addEventListener("keydown", (event) => this.handleCustomServerKeyDown(event));
    this.elements.serverPortInput.addEventListener("keydown", (event) => this.handleCustomServerKeyDown(event));
    this.elements.loginForm.addEventListener("submit", (event) => this.handleLogin(event));
    this.elements.logoutButton.addEventListener("click", () => this.handleLogout());
    this.elements.refreshButton.addEventListener("click", () => this.handleRefreshMap());
    this.elements.findHomeButton.addEventListener("click", () => this.renderer.focusHome());
    this.elements.zoomInButton.addEventListener("click", () => this.renderer.zoomBy(1.18, true));
    this.elements.zoomOutButton.addEventListener("click", () => this.renderer.zoomBy(1 / 1.18, true));
    this.elements.sidebarToggleButton.addEventListener("click", () => this.toggleSidebar());
    this.elements.searchInput.addEventListener("input", () => this.handleSearchInput());
    this.elements.searchInput.addEventListener("keydown", (event) => this.handleSearchKeyDown(event));
    this.elements.searchInput.addEventListener("focus", () => this.renderSearchResults());
    this.elements.searchInput.addEventListener("blur", () => {
      window.setTimeout(() => this.hideSearchResults(), 120);
    });
    this.elements.filterToggleButton.addEventListener("click", () => this.handleFilterToggle());
    this.elements.filterClearButton.addEventListener("click", () => this.clearFilters());
    this.elements.filterPlayerInput.addEventListener("input", () => this.handlePlayerFilterInput());
    this.elements.filterPlayerInput.addEventListener("change", () => this.handlePlayerFilterInput());
    this.elements.filterTypeOptions.addEventListener("change", (event) => this.handleFilterOptionChange(event));
    this.elements.filterTribeOptions.addEventListener("change", (event) => this.handleFilterOptionChange(event));
    this.elements.filterLevelOptions.addEventListener("change", (event) => this.handleFilterOptionChange(event));
  }

  loadServerSelection() {
    const fallback = {
      mode: "stable",
      customHost: "http://127.0.0.1",
      customPort: "3001",
    };

    try {
      const raw = window.localStorage.getItem(SERVER_SELECTION_STORAGE_KEY);
      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw);
      return {
        mode: ["stable", "local", "custom"].includes(parsed?.mode) ? parsed.mode : fallback.mode,
        customHost: String(parsed?.customHost || fallback.customHost),
        customPort: String(parsed?.customPort || fallback.customPort),
      };
    } catch (error) {
      console.warn("Failed to restore server selection.", error);
      return fallback;
    }
  }

  persistServerSelection() {
    window.localStorage.setItem(SERVER_SELECTION_STORAGE_KEY, JSON.stringify(this.serverSelection));
  }

  syncServerInputs() {
    this.elements.serverSelect.value = this.serverSelection.mode;
    this.elements.serverCustomFields.hidden = this.serverSelection.mode !== "custom";
    this.elements.serverHostInput.value = this.serverSelection.customHost;
    this.elements.serverPortInput.value = this.serverSelection.customPort;
  }

  async handleServerSelectionChange() {
    this.serverSelection.mode = this.elements.serverSelect.value;
    this.syncServerInputs();
    this.persistServerSelection();
    try {
      await this.applyServerSelection({ restoreSession: true });
    } catch (error) {
      console.error(error);
      this.setSessionStatus(error.message || "Failed to switch BYM server.", true);
    }
  }

  async handleCustomServerChange() {
    this.serverSelection.customHost = this.elements.serverHostInput.value.trim() || "http://127.0.0.1";
    this.serverSelection.customPort = this.normalizePort(this.elements.serverPortInput.value);
    this.syncServerInputs();
    this.persistServerSelection();

    if (this.serverSelection.mode === "custom") {
      try {
        await this.applyServerSelection({ restoreSession: true });
      } catch (error) {
        console.error(error);
        this.setSessionStatus(error.message || "Failed to switch BYM server.", true);
      }
    }
  }

  async handleCustomServerKeyDown(event) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    await this.handleCustomServerChange();
  }

  buildConfigForSelection() {
    if (this.serverSelection.mode === "stable") {
      return STABLE_VIEWER_CONFIG;
    }

    if (this.serverSelection.mode === "local") {
      return this.localConfig;
    }

    return {
      bymBaseUrl: this.buildCustomBaseUrl(this.serverSelection.customHost, this.serverSelection.customPort),
      cdnBaseUrl: this.buildCustomBaseUrl(this.serverSelection.customHost, this.serverSelection.customPort),
      apiVersion: normalizeApiVersion(this.localConfig.apiVersion),
    };
  }

  buildCustomBaseUrl(host, port) {
    const rawHost = String(host || "").trim() || "http://127.0.0.1";
    const normalizedHost = /^https?:\/\//i.test(rawHost) ? rawHost : `http://${rawHost}`;
    const url = new URL(normalizedHost);
    url.port = this.normalizePort(port);
    return normalizeBaseUrl(url.origin);
  }

  normalizePort(value) {
    const parsed = Number.parseInt(String(value || ""), 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
      return "3001";
    }

    return String(parsed);
  }

  async applyServerSelection({ restoreSession }) {
    this.serverSelection.customPort = this.normalizePort(this.serverSelection.customPort);
    this.syncServerInputs();

    const baseConfig = this.buildConfigForSelection();
    const discoveryClient = new ApiClient(baseConfig);
    const resolvedApiVersion = await discoveryClient.resolveApiVersion();
    this.config = setViewerConfig({
      ...baseConfig,
      apiVersion: resolvedApiVersion,
    });
    this.api = new ApiClient(this.config);
    this.assets = new AssetCache(this.config);
    this.playerBaseIconUrl = this.assets.urlFor(ASSET_PATHS.playerBase);
    this.updateFavicon();

    this.setSessionStatus(`Connecting to ${this.describeSelectedServer()}...`);
    this.setSearchEnabled(false, "Loading CDN assets...");
    this.setFilterEnabled(false);
    this.session = null;
    this.worlds = [];
    this.selectedWorldId = null;
    this.hoveredCell = null;
    this.selectedCell = null;
    this.refreshInFlight = false;
    this.refreshCooldownUntil = 0;
    this.clearRefreshCooldownTimer();
    this.renderWorldList();
    this.elements.leaderboardTitle.textContent = "No world selected";
    this.elements.leaderboardList.textContent = "";
    this.renderDetails();

    this.setSessionStatus("Loading CDN assets...");
    await this.assets.preload();

    if (!this.renderer) {
      this.renderer = new MapRenderer({
        canvas: this.elements.mapCanvas,
        overlayEl: this.elements.mapOverlay,
        coordsEl: this.elements.mapCoordinates,
        statusEl: null,
        assets: this.assets,
        api: this.api,
        onHoverCell: (cell) => this.handleHoveredCell(cell),
        onSelectCell: (cell) => this.handleSelectedCell(cell),
      });
    } else {
      this.renderer.api = this.api;
      this.renderer.assets = this.assets;
    }

    this.setSignedOutState();
    await this.loadWorlds();

    if (restoreSession) {
      await this.restoreSession();
    }

    this.renderer.render();
  }

  describeSelectedServer() {
    switch (this.serverSelection.mode) {
      case "stable":
        return "the stable BYMR server";
      case "local":
        return "the local BYMR server";
      default:
        return this.buildCustomBaseUrl(this.serverSelection.customHost, this.serverSelection.customPort);
    }
  }

  updateFavicon() {
    const favicon = document.getElementById("app-favicon");
    if (!favicon || favicon.tagName !== "LINK") {
      return;
    }

    favicon.href = `${this.config.cdnBaseUrl}/assets/missionicon/icon_maproom.png`;
  }

  async restoreSession() {
    const storedToken = window.localStorage.getItem(buildTokenStorageKey(this.config));
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
      window.localStorage.setItem(buildTokenStorageKey(this.config), session.token);
      this.session = session;
      this.elements.logoutButton.hidden = false;
      this.elements.loginForm.hidden = true;
      this.elements.sessionPanel.classList.add("signed-in");
      this.elements.sessionName.textContent = session.user.username || "Signed in";
      this.updateSessionWorld(session);
      this.setSidebarToggleVisible(true);
      this.refreshCooldownUntil = 0;
      this.clearRefreshCooldownTimer();
      this.setSessionStatus("");
      this.setSearchEnabled(false, "Loading full world map...");
      this.setFilterEnabled(false);
      await this.renderer.bootstrap(session);
      this.rebuildSearchIndex();
      this.rebuildFilterOptions();
      this.updateRefreshButtonState();
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
      this.updateRefreshButtonState();
      this.renderer.reset("Sign in to load live MR3 data.");
    }
  }

  handleLogout(message = "Signed out.") {
    this.refreshInFlight = false;
    this.refreshCooldownUntil = 0;
    this.clearRefreshCooldownTimer();
    window.localStorage.removeItem(buildTokenStorageKey(this.config));
    this.session = null;
    this.elements.logoutButton.hidden = true;
    this.elements.loginForm.hidden = false;
    this.elements.sessionPanel.classList.remove("signed-in");
    this.elements.loginButton.disabled = false;
    this.elements.sessionName.textContent = "Signed out";
    this.elements.sessionWorld.hidden = true;
    this.elements.sessionWorld.textContent = "";
    this.setSidebarToggleVisible(false);
    this.setSessionStatus(message);
    this.setSearchEnabled(false, "Sign in to search the loaded world map.");
    this.setFilterEnabled(false);
    this.updateRefreshButtonState();
    this.renderer.reset("Sign in to load live MR3 data.");
    this.selectedCell = null;
    this.hoveredCell = null;
    this.renderDetails();
  }

  async handleRefreshMap() {
    if (!this.session || !this.renderer || this.refreshInFlight) {
      return;
    }

    if (Date.now() < this.refreshCooldownUntil) {
      this.updateRefreshButtonState();
      return;
    }

    this.refreshInFlight = true;
    this.updateRefreshButtonState();

    try {
      await this.renderer.refreshMapData();
      this.rebuildSearchIndex();
      this.rebuildFilterOptions(true);
      this.renderDetails();
      this.startRefreshCooldown();
    } catch (error) {
      console.error(error);
      const sessionToken = this.session?.token || null;
      this.renderer.setOverlay(error.message || "Failed to refresh world map.");
      window.setTimeout(() => {
        if (this.session?.token === sessionToken && !this.refreshInFlight) {
          this.renderer?.setOverlay("");
        }
      }, 2200);
    } finally {
      this.refreshInFlight = false;
      this.updateRefreshButtonState();
    }
  }

  async loadWorlds() {
    const worldsResponse = await this.api.getWorlds();
    this.worlds = (worldsResponse.worlds || [])
      .filter((world) => Number(world.map_version) === 3)
      .sort((left, right) => Number(right.playerCount || 0) - Number(left.playerCount || 0));

    this.selectedWorldId = this.worlds[0]?.uuid || null;
    this.renderWorldList();
    if (this.session) {
      this.updateSessionWorld(this.session);
    }

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

      const header = document.createElement("div");
      header.className = "leaderboard-row leaderboard-header";
      header.innerHTML = `
        <span class="leaderboard-rank">#</span>
        <span class="leaderboard-name">Username</span>
        <span class="leaderboard-count">Resources</span>
        <span class="leaderboard-count">Strongholds</span>
      `;
      this.elements.leaderboardList.appendChild(header);

      rows.forEach((entry, index) => {
        const row = document.createElement("div");
        row.className = "leaderboard-row";
        row.innerHTML = `
          <strong class="leaderboard-rank">${index + 1}</strong>
          <span class="leaderboard-name" title="${escapeHtml(entry.username || "Unknown")}">${escapeHtml(entry.username || "Unknown")}</span>
          <span class="leaderboard-count">${formatNumber(Number(entry.outpost_count || 0))}</span>
          <span class="leaderboard-count">${formatNumber(Number(entry.stronghold_count || 0))}</span>
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

  rebuildFilterOptions(preserveState = false) {
    if (!preserveState) {
      this.filterState = createEmptyBaseFilter();
    }

    this.availableFilterLevels = this.renderer ? this.renderer.getAvailableWildBaseLevels() : [];
    this.playerFilterEntries = this.buildPlayerFilterEntries();
    if (preserveState) {
      const levelSet = new Set(this.availableFilterLevels);
      const validOwnerIds = new Set(this.playerFilterEntries.map((entry) => entry.ownerId));
      this.filterState = {
        ...this.filterState,
        levels: this.filterState.levels.filter((level) => levelSet.has(level)),
        playerOwnerId: validOwnerIds.has(Number(this.filterState.playerOwnerId || 0))
          ? Number(this.filterState.playerOwnerId || 0)
          : null,
        playerUsername: validOwnerIds.has(Number(this.filterState.playerOwnerId || 0))
          ? this.filterState.playerUsername
          : "",
      };
    }
    this.renderFilterOptions();
    this.applyFilters();
  }

  buildPlayerFilterEntries() {
    if (!this.renderer) {
      return [];
    }

    const seenOwnerIds = new Set();
    return this.renderer
      .getSearchablePlayerBases()
      .filter((entry) => {
        const ownerId = Number(entry.ownerId || 0);
        if (ownerId <= 0 || seenOwnerIds.has(ownerId)) {
          return false;
        }

        seenOwnerIds.add(ownerId);
        return true;
      })
      .sort((left, right) => {
        if (left.distance !== right.distance) {
          return Number(left.distance ?? Number.MAX_SAFE_INTEGER) - Number(right.distance ?? Number.MAX_SAFE_INTEGER);
        }

        return left.normalizedUsername.localeCompare(right.normalizedUsername);
      });
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

    if (this.elements.searchStatus) {
      this.elements.searchStatus.hidden = !message;
      this.elements.searchStatus.textContent = message;
    }
  }

  setFilterEnabled(enabled) {
    this.elements.filterToggleButton.disabled = !enabled;

    if (!enabled) {
      this.filterState = createEmptyBaseFilter();
      this.availableFilterLevels = [];
      this.playerFilterEntries = [];
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

  handlePlayerFilterInput() {
    const rawQuery = this.elements.filterPlayerInput.value.trim();
    if (!rawQuery) {
      this.filterState = {
        ...this.filterState,
        playerOwnerId: null,
        playerUsername: "",
      };
      this.renderFilterOptions();
      this.applyFilters();
      return;
    }

    const match = this.playerFilterEntries.find(
      (entry) => entry.normalizedUsername === rawQuery.toLocaleLowerCase(),
    );
    if (!match) {
      return;
    }

    this.filterState = {
      ...createEmptyBaseFilter(),
      playerOwnerId: match.ownerId,
      playerUsername: match.username,
    };
    this.renderFilterOptions();
    this.applyFilters();
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
      playerOwnerId: null,
      playerUsername: "",
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
    this.renderPlayerFilterOptions(filterEnabled);
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

  renderPlayerFilterOptions(enabled) {
    this.elements.filterPlayerInput.disabled = !enabled;
    this.elements.filterPlayerInput.value = this.filterState.playerUsername || "";
    this.elements.filterPlayerInput.placeholder = enabled
      ? "Filter by username"
      : "Sign in to filter by player";

    this.elements.filterPlayerOptions.replaceChildren();
    this.playerFilterEntries.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.username;
      this.elements.filterPlayerOptions.appendChild(option);
    });
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

    if (this.elements.filterToggleButton.disabled) {
      this.elements.filterToggleButton.textContent = "Filter Bases";
      return;
    }

    if (this.filterMenuOpen) {
      this.elements.filterToggleButton.textContent = "Hide Filters";
      return;
    }

    this.elements.filterToggleButton.textContent = hasActiveBaseFilterState(this.filterState)
      ? "Filters Active"
      : "Filter Bases";
  }

  updateFilterStatus(isEnabled) {
    if (!this.elements.filterStatus) {
      return;
    }

    if (!isEnabled) {
      this.elements.filterStatus.textContent = "Sign in to enable base filters.";
      return;
    }

    if (!hasActiveBaseFilterState(this.filterState)) {
      this.elements.filterStatus.textContent = "Showing all visible bases.";
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

    if (this.filterState.playerUsername) {
      segments.push(`Player: ${this.filterState.playerUsername}`);
    }

    this.elements.filterStatus.textContent = segments.join(" | ");
  }

  updateRefreshButtonState() {
    const button = this.elements.refreshButton;
    const hasSession = Boolean(this.session);
    const cooldownSeconds = Math.max(0, Math.ceil((this.refreshCooldownUntil - Date.now()) / 1000));
    const isCoolingDown = cooldownSeconds > 0;

    button.disabled = !hasSession || this.refreshInFlight || isCoolingDown;
    button.classList.toggle("loading", this.refreshInFlight);
    button.dataset.cooldown = isCoolingDown ? String(cooldownSeconds) : "";

    if (!hasSession) {
      button.title = "Sign in to refresh the world map";
      button.setAttribute("aria-label", "Sign in to refresh the world map");
      this.elements.findHomeButton.disabled = true;
      return;
    }

    this.elements.findHomeButton.disabled = false;

    if (this.refreshInFlight) {
      button.title = "Refreshing world map...";
      button.setAttribute("aria-label", "Refreshing world map");
      return;
    }

    if (isCoolingDown) {
      button.title = `Refresh available in ${cooldownSeconds}s`;
      button.setAttribute("aria-label", `Refresh available in ${cooldownSeconds} seconds`);
      return;
    }

    button.title = "Refresh world map";
    button.setAttribute("aria-label", "Refresh world map");
  }

  startRefreshCooldown() {
    this.refreshCooldownUntil = Date.now() + MAP_REFRESH_COOLDOWN_MS;
    this.clearRefreshCooldownTimer();
    this.updateRefreshButtonState();
    this.refreshCooldownTimer = window.setInterval(() => {
      if (Date.now() >= this.refreshCooldownUntil) {
        this.refreshCooldownUntil = 0;
        this.clearRefreshCooldownTimer();
      }

      this.updateRefreshButtonState();
    }, 1000);
  }

  clearRefreshCooldownTimer() {
    if (!this.refreshCooldownTimer) {
      return;
    }

    window.clearInterval(this.refreshCooldownTimer);
    this.refreshCooldownTimer = 0;
  }

  toggleSidebar() {
    this.setSidebarCollapsed(!this.sidebarCollapsed);
  }

  setSidebarCollapsed(collapsed) {
    this.sidebarCollapsed = Boolean(collapsed);
    this.elements.appRoot.classList.toggle("sidebar-collapsed", this.sidebarCollapsed);
    this.elements.sidebarToggleButton.setAttribute("aria-expanded", String(!this.sidebarCollapsed));
    this.elements.sidebarToggleButton.setAttribute(
      "aria-label",
      this.sidebarCollapsed ? "Show sidebar" : "Hide sidebar",
    );
    this.elements.sidebarToggleButton.title = this.sidebarCollapsed ? "Show sidebar" : "Hide sidebar";
    window.setTimeout(() => this.renderer?.render(), 200);
  }

  setSidebarToggleVisible(visible) {
    this.elements.sidebarToggleButton.hidden = !visible;
    if (!visible) {
      this.setSidebarCollapsed(false);
    }
  }

  handleSearchInput() {
    const query = this.elements.searchInput.value.trim().toLocaleLowerCase();
    if (!query) {
      this.searchMatches = [];
      this.searchActiveIndex = -1;
      this.renderSearchResults();
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
    this.renderer.focusCell(entry.cell, { animate: true });
  }

  setSessionStatus(message, isError = false) {
    this.elements.sessionStatus.hidden = !message;
    this.elements.sessionStatus.textContent = message;
    this.elements.sessionStatus.style.color = isError ? "#ffb59f" : "";
  }

  updateSessionWorld(session) {
    const worldId = String(
      session?.map?.worldid ||
      session?.map?.worldId ||
      session?.map?.wid ||
      "",
    );
    const directWorldName = String(
      session?.map?.worldName ||
      session?.map?.worldname ||
      "",
    ).trim();
    const world =
      this.worlds.find(
        (candidate) =>
          String(candidate.uuid || "") === worldId ||
          String(candidate.worldid || "") === worldId,
      ) || null;
    const worldLabel = directWorldName || world?.name || (worldId ? `World ${worldId}` : "");
    this.elements.sessionWorld.hidden = !worldLabel;
    this.elements.sessionWorld.textContent = worldLabel;
  }

  setSignedOutState() {
    this.elements.logoutButton.hidden = true;
    this.elements.loginForm.hidden = false;
    this.elements.sessionPanel.classList.remove("signed-in");
    this.elements.loginButton.disabled = false;
    this.elements.sessionName.textContent = "Signed out";
    this.elements.sessionWorld.hidden = true;
    this.elements.sessionWorld.textContent = "";
    this.setSidebarToggleVisible(false);
    this.setSessionStatus("Sign in with your own BYM credentials.");
    this.setSearchEnabled(false, "Sign in to search the loaded world map.");
    this.setFilterEnabled(false);
    this.updateRefreshButtonState();
    this.renderer?.reset("Sign in to load live MR3 data.");
    this.renderDetails();
  }
}

