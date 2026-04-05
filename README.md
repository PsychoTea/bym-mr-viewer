# BYM MR Viewer

A standalone Dockerized Python application that signs users into Backyard Monsters Refitted, fetches live Map Room 3 data from the BYM server, and renders the map in a browser using CDN-hosted game assets.

## Current scope

- Map Room 3 only.
- Per-user BYM login.
- BYM auth token is stored in the browser so users stay signed in.
- The viewer fetches live BYM data on demand instead of maintaining its own world cache.
- World listing and leaderboards are available for every MR3 world.

## Important limitation

The current BYM API does not expose MR3 cell data for arbitrary worlds. It only returns MR3 cells for the authenticated player's current `worldid`.

Because this viewer must not modify the BYM server, the map canvas can only render the logged-in player's current MR3 world. The worlds list still works for browsing metadata and leaderboards.

## Run with Docker

```bash
docker compose up --build
```

The viewer runs on `http://localhost:8081` by default.

## Environment

- `BYM_BASE_URL`: BYM game server base URL used for API calls.
- `BYM_CDN_BASE_URL`: BYM asset host used for MR3 images. For the demo server this should be browser-reachable, typically `http://localhost:3001`.
- `BYM_API_VERSION`: API version segment, default `v1.5.4-beta`.
- `PORT`: Host port published by Docker compose, default `8081`.
- `REQUEST_TIMEOUT_SECONDS`: Upstream BYM request timeout.

## Demo setup

When the BYM demo server is running on the host machine at `localhost:3001`:

- the Python container talks to the API through `http://host.docker.internal:3001`
- the browser fetches CDN assets from `http://localhost:3001`
