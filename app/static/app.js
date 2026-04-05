import { ViewerApp } from "./js/viewer-app.js";

window.addEventListener("DOMContentLoaded", () => {
  const app = new ViewerApp();
  app.start().catch((error) => {
    console.error(error);
    document.getElementById("session-status").textContent = error.message || "Viewer failed to start.";
  });
});
