import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { comics } from '../src/modules/comics/comics.data.js';

test('catalog preserves Android envelope and nine ordered entries', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const response = await app.inject('/api/comics');
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['content-type']!, /application\/json/);
  assert.deepEqual(response.json(), { data: { results: comics } });
  assert.deepEqual(comics.map(c => c.id), [7, 8, 9, 1, 2, 3, 4, 5, 6]);
  assert.equal(comics[3]?.title, 'Aurora: O Primeiro Sinal');
  assert.equal(comics[7]?.volumeNumber, 1);
  assert.equal(comics[7]?.issueNumber, undefined);
  for (const comic of comics) {
    assert.equal(comic.synopsis, comic.description);
    const detail = await app.inject('/api/comics/' + comic.id);
    assert.equal(detail.statusCode, 200);
    assert.deepEqual(detail.json(), comic);
  }
});

test('unknown comic returns a standardized 404', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const response = await app.inject('/api/comics/999');
  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), { error: { code: 'COMIC_NOT_FOUND', message: 'Comic not found' } });
});

test('invalid IDs return 400', async t => {
  const app = buildApp();
  t.after(() => app.close());
  for (const id of ['0', '-1', 'abc', '1.5', '1e0', '01', '2147483648', '99999999999999999999', '%20', '1%20']) {
    const response = await app.inject('/api/comics/' + id);
    assert.equal(response.statusCode, 400, id);
    assert.equal(response.json().error.code, 'INVALID_REQUEST', id);
  }
});
