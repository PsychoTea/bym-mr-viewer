import { ASSET_PATHS, TILE_DEFINITIONS } from "./shared.js";
export class AssetCache {
  constructor(config) {
    this.config = config;
    this.images = new Map();
  }

  async preload() {
    const assetList = new Set([...Object.values(ASSET_PATHS), ...TILE_DEFINITIONS.map((tile) => tile.src)]);
    await Promise.all(
      [...assetList].map(async (path) => {
        const image = await this.loadImage(path);
        if (image) {
          this.images.set(path, image);
        }
      }),
    );
  }

  urlFor(path) {
    return `${this.config.cdnBaseUrl}/assets/${path}`;
  }

  get(path) {
    return this.images.get(path) || null;
  }

  async loadImage(path) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = this.urlFor(path);
    });
  }

  pickTile(cell, cellIndex) {
    const altitude = Number(cell.i ?? 0);
    const options = TILE_DEFINITIONS.filter((tile) => altitude >= tile.min && altitude <= tile.max);

    if (!options.length) {
      return null;
    }

    let hash = cellIndex | 0;
    hash ^= hash << 21;
    hash ^= hash >>> 3;
    hash ^= hash << 4;
    const tile = options[Math.abs(hash) % options.length];
    return this.get(tile.src);
  }
}


