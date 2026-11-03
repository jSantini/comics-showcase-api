import { createHash } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/app.js';
import { readEnv } from '../src/config/env.js';
import { comics } from '../src/modules/comics/comics.data.js';
import { coverManifest, maxCoverBytes } from '../src/modules/covers/covers.js';

function temporaryCovers(t: { after: (fn: () => void) => void }) {
  const directory = mkdtempSync(join(tmpdir(), 'comics-covers-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('IDs 1–6 retain every original field and new entries have independent metadata', () => {
  const original = JSON.parse(readFileSync(new URL('./fixtures/original-comics.json', import.meta.url), 'utf8'));
  assert.deepEqual(comics.slice(3), original);
  assert.equal(new Set(comics.map(comic => comic.id)).size, 9);
  const titles = ['Protocolo Ômega: Última Transmissão', 'Distrito Neon: Código Fantasma', 'O Reino das Cinzas: Herdeira do Fogo'];
  comics.slice(0, 3).forEach((comic, index) => {
    assert.equal(comic.title, titles[index]);
    assert.equal(comic.id, 7 + index);
    assert.equal(comic.issueNumber, 1);
    assert.equal(comic.publicationYear, 2026);
    assert.ok(comic.series && comic.genre);
    assert.ok(comic.shortSynopsis.length > 50);
    assert.ok(comic.synopsis.length > 300);
    assert.notEqual(comic.shortSynopsis, comic.synopsis);
    assert.equal(comic.description, comic.synopsis);
    assert.equal(comic.coverKey, undefined);
  });
});

test('pending covers never advertise nonexistent URLs and missing images are not cached', async t => {
  const coversDirectory = temporaryCovers(t);
  const app = buildApp({}, { coversDirectory, publicBaseUrl: 'https://comics.example.test' });
  t.after(() => app.close());
  const list = await app.inject('/api/comics');
  assert.equal(list.headers['cache-control'], 'no-store');
  for (const comic of list.json().data.results) assert.equal(comic.thumbnail, undefined);
  for (const { filename } of coverManifest) {
    const response = await app.inject('/covers/' + filename);
    assert.equal(response.statusCode, 404);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.json().error.code, 'COVER_NOT_FOUND');
  }
});

test('available covers use existing Android thumbnail contract and safe HTTP caching', async t => {
  const coversDirectory = temporaryCovers(t);
  // Synthetic JPEG transport bytes used only in a temporary test directory, never shipped as artwork.
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xd9]);
  for (const { filename } of coverManifest) writeFileSync(join(coversDirectory, filename), bytes);
  writeFileSync(join(coversDirectory, 'private.txt'), 'must not be served');
  const app = buildApp({}, { coversDirectory, publicBaseUrl: 'https://comics.example.test/' });
  t.after(() => app.close());
  const list = await app.inject({ url: '/api/comics', headers: { host: 'attacker.test', 'x-forwarded-host': 'attacker.test' } });
  for (const { id, filename } of coverManifest) {
    const comic = list.json().data.results.find((item: { id: number }) => item.id === id);
    const thumbnail = comic.thumbnail;
    const url = new URL(thumbnail.path + '.' + thumbnail.extension);
    assert.equal(url.href, 'https://comics.example.test/covers/' + filename);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.search + url.hash + url.username + url.password, '');
    assert.equal(comic.coverKey, undefined);
    const detail = await app.inject('/api/comics/' + id);
    assert.deepEqual(detail.json(), comic);
    const response = await app.inject(url.pathname);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.rawPayload, bytes);
    assert.equal(response.headers['content-type'], 'image/jpeg');
    assert.equal(response.headers['content-length'], String(bytes.length));
    assert.equal(response.headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.ok(response.headers.etag);
    for (const validator of [response.headers.etag!, 'W/' + response.headers.etag!, '*']) {
      const cached = await app.inject({ url: url.pathname, headers: { 'if-none-match': validator } });
      assert.equal(cached.statusCode, 304);
      assert.equal(cached.body, '');
    }
    assert.equal((await app.inject({ url: url.pathname, headers: { 'if-none-match': '"old"' } })).statusCode, 200);
    const head = await app.inject({ method: 'HEAD', url: url.pathname });
    assert.equal(head.statusCode, 200);
    assert.equal(head.body, '');
  }
  for (const path of ['/covers/private.txt', '/covers/README.md', '/covers/.env', '/covers/unknown.jpg', '/covers/%2e%2e%2fpackage.json']) {
    assert.equal((await app.inject(path)).statusCode, 404, path);
  }
  const noOrigin = buildApp({}, { coversDirectory });
  t.after(() => noOrigin.close());
  assert.equal((await noOrigin.inject('/api/comics/7')).json().thumbnail, undefined);
});

test('invalid origins and invalid artwork fail configuration without publishing broken URLs', t => {
  for (const PUBLIC_BASE_URL of ['', 'http://example.test', 'https://user:pass@example.test', 'https://example.test/api/', 'https://example.test/?token=x', 'https://example.test/#x', 'https://example.test/?']) {
    assert.throws(() => readEnv({ PUBLIC_BASE_URL }));
    assert.throws(() => buildApp({}, { publicBaseUrl: PUBLIC_BASE_URL }));
  }
  assert.equal(readEnv({ PUBLIC_BASE_URL: 'https://example.test/' }).publicBaseUrl, 'https://example.test');
  const coversDirectory = temporaryCovers(t);
  const filename = coverManifest[0].filename;
  for (const bytes of [Buffer.alloc(0), Buffer.from('not a JPEG'), Buffer.alloc(maxCoverBytes + 1)]) {
    writeFileSync(join(coversDirectory, filename), bytes);
    assert.throws(() => buildApp({}, { coversDirectory }));
  }
});

test('bundled final artwork is served for IDs 7–9 with the configured public origin', async t => {
  const app = buildApp({}, { publicBaseUrl: 'https://comics.example.test' });
  t.after(() => app.close());
  const response = await app.inject('/api/comics');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().data.results.map((comic: { id: number }) => comic.id), [7, 8, 9, 1, 2, 3, 4, 5, 6]);
  for (const { id, filename } of coverManifest) {
    const bytes = readFileSync(new URL('../public/covers/' + filename, import.meta.url));
    assert.ok(bytes.length > 0 && bytes.length <= maxCoverBytes);
    const comic = response.json().data.results.find((item: { id: number }) => item.id === id);
    assert.deepEqual(comic.thumbnail, {
      path: 'https://comics.example.test/covers/' + filename.slice(0, -4),
      extension: 'jpg',
    });
    assert.equal(comic.coverKey, undefined);
    const image = await app.inject('/covers/' + filename);
    assert.equal(image.statusCode, 200);
    assert.deepEqual(image.rawPayload, bytes);
    assert.equal(image.headers['content-type'], 'image/jpeg');
    assert.equal(image.headers.etag, '"' + createHash('sha256').update(bytes).digest('hex') + '"');
    assert.equal(image.headers['cache-control'], 'public, max-age=31536000, immutable');
    const head = await app.inject({ method: 'HEAD', url: '/covers/' + filename });
    assert.equal(head.statusCode, 200);
    assert.equal(head.body, '');
    assert.equal(head.headers.etag, image.headers.etag);
    const cached = await app.inject({ url: '/covers/' + filename, headers: { 'if-none-match': image.headers.etag! } });
    assert.equal(cached.statusCode, 304);
    const detail = await app.inject('/api/comics/' + id);
    assert.deepEqual(detail.json(), comic);
  }
  for (const comic of response.json().data.results.slice(3)) assert.equal(comic.thumbnail, undefined);
});
