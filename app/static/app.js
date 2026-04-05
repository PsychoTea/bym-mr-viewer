const TOKEN_STORAGE_KEY = "bym-mr-viewer-token";

window.addEventListener("DOMContentLoaded", () => {
  const state = {
    config: null,
  };

  const sessionName = document.getElementById("session-name");
  const sessionStatus = document.getElementById("session-status");
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-button");
  const mapOverlay = document.getElementById("map-overlay");

  async function boot() {
    state.config = await fetchJson("/api/config");
    mapOverlay.textContent = state.config.limitations.message;
    sessionName.textContent = "Viewer scaffold ready";
    sessionStatus.textContent = `Pointing at ${state.config.bymBaseUrl}`;

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      sessionStatus.textContent = "Authentication wiring is being completed.";
    });

    logoutButton.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStatus.textContent = "Signed out.";
    });
  }

  boot().catch((error) => {
    console.error(error);
    sessionStatus.textContent = error.message;
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
