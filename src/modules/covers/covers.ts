import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';

export const coverManifest = [
  { id: 7, filename: 'protocolo-omega-v1.jpg' },
  { id: 8, filename: 'distrito-neon-v1.jpg' },
  { id: 9, filename: 'reino-das-cinzas-v1.jpg' },
] as const;

export const defaultCoversDirectory = new URL('../../../public/covers/', import.meta.url);
export const maxCoverBytes = 400 * 1024;
export interface CoverAsset { readonly filename: string; readonly bytes: Buffer; readonly etag: string }

/** Load a bounded, immutable deployment snapshot; absent final artwork is expected. */
export function loadCovers(directory: string): ReadonlyMap<number, CoverAsset> {
  const assets = new Map<number, CoverAsset>();
  for (const { id, filename } of coverManifest) {
    const path = join(directory, filename);
    try {
      const stat = statSync(path);
      if (!stat.isFile() || stat.size === 0 || stat.size > maxCoverBytes) {
        throw new Error('Cover must be a nonempty file no larger than 400 KiB');
      }
      const bytes = readFileSync(path);
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
        throw new Error('Cover must use JPEG format');
      }
      assets.set(id, { filename, bytes, etag: '"' + createHash('sha256').update(bytes).digest('hex') + '"' });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue;
      throw error;
    }
  }
  return assets;
}

export function registerCoverRoutes(app: FastifyInstance, assets: ReadonlyMap<number, CoverAsset>) {
  const byFilename = new Map([...assets.values()].map(asset => [asset.filename, asset]));
  app.get<{ Params: { filename: string } }>('/covers/:filename', (request, reply) => {
    const asset = byFilename.get(request.params.filename);
    if (!asset) {
      return reply.code(404).header('Cache-Control', 'no-store')
        .send({ error: { code: 'COVER_NOT_FOUND', message: 'Cover not found' } });
    }
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')
      .header('ETag', asset.etag).header('X-Content-Type-Options', 'nosniff');
    const validators = request.headers['if-none-match']?.split(',').map(value => value.trim());
    if (validators?.some(value => value === '*' || value.replace(/^W\//, '') === asset.etag)) {
      return reply.code(304).send();
    }
    return reply.type('image/jpeg').header('Content-Length', asset.bytes.length).send(asset.bytes);
  });
}
