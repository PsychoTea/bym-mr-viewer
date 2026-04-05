import { buildBymUrl, buildSessionPayload, fetchJson, getViewerConfig } from "./shared.js";
export class ApiClient {
  constructor(config = getViewerConfig()) {
    this.config = config;
  }

  async getConfig() {
    return this.config;
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
}

