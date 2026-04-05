# BYM MR Viewer

BYM MR Viewer is a browser-based Map Room 3 viewer for Backyard Monsters Refitted. It lets you open the world map outside the game client, browse bases in your current world, search for players, apply filters, and inspect live map data.

## Features

- Live Map Room 3 map viewing
- Stable, local, or custom BYM server selection
- Per-user sign-in with your own BYM account
- Search for player bases by username
- Filters for wild bases, tribes, levels, and player ownership
- Leaderboards and world metadata
- Base details including range and outpost counts
- Refreshing the current world snapshot on demand

## How It Works

The viewer runs entirely in your browser. After you choose a server, it connects directly to that BYM server for sign-in, world data, leaderboards, and map data. Map graphics are loaded from the selected server's CDN.

## Credentials and Privacy

Your BYM email and password are only sent to the server you choose in the viewer:

- `Stable` sends them to the live Backyard Monsters Refitted server
- `Local` sends them to your local BYM server
- `Custom` sends them to the custom host and port you enter

The viewer does not route your credentials through any separate backend of its own.

## Important Note

The current BYM API only exposes Map Room 3 cell data for the authenticated player's current world. Because of that, the map view can only render the world your logged-in account is currently in, even though the viewer can still show metadata and leaderboards for other MR3 worlds.

## Running It Locally

This repository includes a Python server for local/development use.

You need Python 3 installed.

From the project root, run:

```bash
python3 dev_server.py
```

Then browser to:

```text
http://localhost:8080
```

## Optional Server Settings

The local file server supports a few optional environment variables:

- `HOST` default: `0.0.0.0`
- `PORT` default: `8080`
- `STATIC_DIR` default: `app/static`

Example in PowerShell:

```powershell
$env:PORT=9090
python dev_server.py
```

## Bug Reports and Feature Requests

For bug reports and feature requests, please open an issue on our [issue tracker](https://github.com/PsychoTea/bym-mr-viewer/issues).
