import type { FastifyInstance } from 'fastify';
import { detailSchema, listSchema } from './comics.schemas.js';
import type { Comic } from './comics.schemas.js';
import { findComic, listComics } from './comics.service.js';

export async function comicsRoutes(app: FastifyInstance, options: { catalog: readonly Comic[] }) {
  app.get('/comics', { schema: listSchema }, (_request, reply) => reply.header('Cache-Control', 'no-store').send({ data: { results: listComics(options.catalog) } }));
  app.get<{ Params: { id: string } }>('/comics/:id', { schema: detailSchema }, (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const id = Number(request.params.id);
    if (id > 2147483647) {
      return reply.code(400).send({ error: { code: 'INVALID_REQUEST', message: 'Invalid request parameters' } });
    }
    const comic = findComic(options.catalog, id);
    if (!comic) {
      return reply.code(404).send({ error: { code: 'COMIC_NOT_FOUND', message: 'Comic not found' } });
    }
    return comic;
  });
}
