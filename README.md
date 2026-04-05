# BYM MR Viewer

A static Map Room 3 viewer for Backyard Monsters Refitted.

The viewer now runs entirely in the browser. It talks directly to the BYM game server for auth, world metadata, and live MR3 cell data, and it loads map art straight from the BYM CDN. The only Python left is a tiny static-file host for local development.

## Architecture

- No Python API proxy.
- Browser calls the BYM server directly.
- User auth token is stored in the browser.
- Full MR3 map data is cached for the current browser session only.
- Assets are loaded from the BYM server CDN.

This works because the BYM server already exposes permissive CORS headers.

## Current Scope

- Map Room 3 only.
- Per-user BYM login.
- Live data fetched from the configured BYM server.
- Search and filter tools run entirely in-browser.
- World listing and leaderboards are available for every MR3 world.

## Important Limitation

The current BYM API does not expose MR3 cell data for arbitrary worlds. It only returns MR3 cells for the authenticated player's current `worldid`.

Because this viewer must not modify the BYM server, the map canvas can only render the logged-in player's current MR3 world. The worlds list still works for browsing metadata and leaderboards.

## Runtime Config

Edit [app/static/config.js](C:\Users\Ben\Documents\GitHub\bym-mr-viewer\app\static\config.js) to point the viewer at a different BYM server:

```js
window.BYM_MR_VIEWER_CONFIG = {
  bymBaseUrl: "http://localhost:3001",
  cdnBaseUrl: "http://localhost:3001",
  apiVersion: "v1.5.4-beta",
};
```

For the local demo stack, both API and CDN should stay on `http://localhost:3001`.

## Run Locally

```bash
python dev_server.py
```

By default this serves [app/static](C:\Users\Ben\Documents\GitHub\bym-mr-viewer\app\static) on `http://localhost:8080`.

Example with a custom port in PowerShell:

```bash
$env:PORT=9090
python dev_server.py
```

If your machine exposes Python as `python3` instead of `python`, use that command instead.

Optional environment variables:

- `HOST`: bind host for the static server, default `0.0.0.0`
- `PORT`: bind port for the static server, default `8080`
- `STATIC_DIR`: alternate static directory, default `app/static`

## TODO

- Add a refresh control to invalidate the session map cache and pull a fresh full world snapshot.
- Make the left pane collapsible after login.
- Add tooltips for the home and zoom controls.
- Refactor the frontend into smaller JS modules.
- Add a server selector for switching between demo, live, or custom BYM hosts.
- Add a favicon.
- Add a credits/footer panel with issue reporting info.
