import {
  MR3,
  buildBymUrl,
  buildSessionPayload,
  extractErrorMessage,
  fetchJson,
  getViewerConfig,
  normalizeApiVersion,
  parseJsonPayload,
} from "./shared.js";

export class ApiClient {
  constructor(config = getViewerConfig()) {
    this.config = config;
    this.mapCellsRequestGate = Promise.resolve();
    this.mapCellsRequestTimestamps = [];
  }

  async getConfig() {
    return this.config;
  }

  async resolveApiVersion() {
    const probeVersion = "__viewer_probe__";
    const probeUrl = buildBymUrl(`/api/${probeVersion}/player/getinfo`, null, this.config);

    try {
      await fetchJson(probeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
        body: new URLSearchParams({
          sessionType: "game",
        }),
      });
    } catch (error) {
      const fromProbe = this.extractApiVersion(error?.message || "");
      if (fromProbe) {
        return fromProbe;
      }
    }

    try {
      const response = await fetch(buildBymUrl("/init", null, this.config), {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({}),
      });
      const payload = parseJsonPayload(await response.text());
      const fromInit = this.extractApiVersion(extractErrorMessage(payload) || "");
      if (fromInit) {
        return fromInit;
      }
    } catch (error) {
      void error;
    }

    return normalizeApiVersion(this.config.apiVersion);
  }

  async login(email, password) {
    const loginResponse = await fetchJson(this.buildApiUrl("/player/getinfo"), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: new URLSearchParams({
        email,
        password,
        sessionType: "game",
      }),
    });

    const map = await this.getMapMeta(loginResponse.token);
    return buildSessionPayload(loginResponse, map);
  }

  async refresh(token) {
    const loginResponse = await fetchJson(this.buildApiUrl("/player/getinfo"), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: new URLSearchParams({
        token,
        sessionType: "game",
      }),
    });

    const map = await this.getMapMeta(loginResponse.token);
    return buildSessionPayload(loginResponse, map);
  }

  async getWorlds() {
    return fetchJson(this.buildApiUrl("/worlds"));
  }

  async getLeaderboard(worldId, mapVersion = 3) {
    return fetchJson(this.buildApiUrl("/leaderboards", {
      worldid: worldId,
      mapversion: mapVersion,
    }));
  }

  async getMapMeta(token) {
    return fetchJson(this.buildApiUrl("/bm/getnewmap"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: new URLSearchParams(),
    });
  }

  async getMapInit(token) {
    return fetchJson(buildBymUrl("/worldmapv3/initworldmap", null, this.config), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getMapCells(token, cellIds) {
    if (!Array.isArray(cellIds) || !cellIds.length) {
      return { celldata: [] };
    }

    if (cellIds.length > MR3.fullMapRequestChunkSize) {
      throw new Error(`Cell batch exceeds the ${MR3.fullMapRequestChunkSize} cell limit.`);
    }

    await this.waitForMapCellsRequestSlot();

    return fetchJson(buildBymUrl("/worldmapv3/getcells", null, this.config), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: new URLSearchParams({
        cellids: JSON.stringify(cellIds),
      }),
    });
  }

  buildApiUrl(path, query = null) {
    return buildBymUrl(`/api/${this.config.apiVersion}${path}`, query, this.config);
  }

  async waitForMapCellsRequestSlot() {
    let releaseGate = null;
    const previousGate = this.mapCellsRequestGate;
    this.mapCellsRequestGate = new Promise((resolve) => {
      releaseGate = resolve;
    });

    await previousGate;

    try {
      const maxRequests = Math.max(1, Number(MR3.fullMapRequestsPerMinute) || 1);
      const windowMs = Math.max(1, Number(MR3.fullMapRequestWindowMs) || 60_000);

      while (true) {
        const now = Date.now();
        const cutoff = now - windowMs;
        this.mapCellsRequestTimestamps = this.mapCellsRequestTimestamps.filter(
          (startedAt) => startedAt > cutoff,
        );

        if (this.mapCellsRequestTimestamps.length < maxRequests) {
          this.mapCellsRequestTimestamps.push(now);
          return;
        }

        const oldestStartedAt = this.mapCellsRequestTimestamps[0];
        const waitMs = Math.max(0, oldestStartedAt + windowMs - now + 5);
        await new Promise((resolve) => globalThis.setTimeout(resolve, waitMs));
      }
    } finally {
      releaseGate();
    }
  }

  extractApiVersion(message) {
    const match = String(message || "").match(/Expected:\s*([^,\s]+)/i);
    return match ? normalizeApiVersion(match[1]) : null;
  }
}
