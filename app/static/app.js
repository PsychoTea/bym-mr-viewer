import { getViewerConfig } from "./js/shared.js";
import { ViewerApp } from "./js/viewer-app.js";

applyFavicon();

window.addEventListener("DOMContentLoaded", () => {
  const app = new ViewerApp();
  app.start().catch((error) => {
    console.error(error);
    document.getElementById("session-status").textContent = error.message || "Viewer failed to start.";
  });
});

function applyFavicon() {
  const favicon = document.getElementById("app-favicon");
  if (!favicon || favicon.tagName !== "LINK") {
    return;
  }

  const { cdnBaseUrl } = getViewerConfig();
  favicon.href = `${cdnBaseUrl}/assets/missionicon/icon_maproom.png`;
}
