import { comics } from './comics.data.js';
import type { Comic } from './comics.schemas.js';
import type { CoverAsset } from '../covers/covers.js';

export function createCatalog(assets: ReadonlyMap<number, CoverAsset>, publicBaseUrl?: string): readonly Comic[] {
  return comics.map(comic => {
    const asset = assets.get(comic.id);
    if (!publicBaseUrl || !asset) return comic;
    return { ...comic, thumbnail: {
      path: publicBaseUrl + '/covers/' + asset.filename.slice(0, -4),
      extension: 'jpg',
    } };
  });
}

export const listComics = (catalog: readonly Comic[]) => catalog;
export const findComic = (catalog: readonly Comic[], id: number) => catalog.find(comic => comic.id === id);
