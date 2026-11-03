import { comics } from './comics.data.js';

export const listComics = () => comics;
export const findComic = (id: number) => comics.find(comic => comic.id === id);
