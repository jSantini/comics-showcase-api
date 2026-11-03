# Comics Showcase API

A deployed portfolio backend for [Comics Sample for Android](https://github.com/jSantini/comics_sample), built with **Node.js 22, TypeScript strict, Fastify 5, Docker and Railway**. It demonstrates explicit HTTP contracts, schema validation, automated tests and HTTP image caching in a small Android-to-backend integration.

The Android app offers **six offline comics** from its embedded catalog and **nine online comics** from this API. Three remote-exclusive stories appear first and load their covers over HTTPS; the original six retain their bundled Android covers. The Android integration has been exercised successfully with all nine stories and the three remote images.

## Live Demo

The backend is running on Railway. No API key or account is required.

| Resource | Public link |
| --- | --- |
| API health | [GET /health](https://comics-showcase-api-production.up.railway.app/health) |
| Nine-story catalog | [GET /api/comics](https://comics-showcase-api-production.up.railway.app/api/comics) |
| Protocolo Ômega cover | [JPEG](https://comics-showcase-api-production.up.railway.app/covers/protocolo-omega-v1.jpg) |
| Distrito Neon cover | [JPEG](https://comics-showcase-api-production.up.railway.app/covers/distrito-neon-v1.jpg) |
| O Reino das Cinzas cover | [JPEG](https://comics-showcase-api-production.up.railway.app/covers/reino-das-cinzas-v1.jpg) |

Explore the [HTTP contract](#http-contract), [Android integration](#android-integration), [image delivery](#image-delivery-and-cache) or [Railway deployment](#railway-deployment).

## Quick Start

### Run locally

Install Node.js 22 and npm, then run from the repository root:

```sh
npm ci
npm run dev
```

The API listens at http://localhost:3000. Development mode watches TypeScript sources for changes.

To advertise thumbnails while running locally, set `PUBLIC_BASE_URL` to the published HTTPS origin **before** starting the server:

```powershell
$env:PUBLIC_BASE_URL = "https://comics-showcase-api-production.up.railway.app"
npm run dev
```

This serves the catalog locally while its thumbnail URLs point to the published Railway images. For a fully local image integration, use an HTTPS origin that reaches your local server. If `PUBLIC_BASE_URL` is unset, the catalog still works and the image routes still serve files, but `thumbnail` is omitted.

### Typecheck, build and test

```sh
npm run typecheck
npm run build
npm test
```

To run the compiled server after building:

```sh
npm start
```

All commands above are defined in [package.json](package.json). [`.env.example`](.env.example) documents non-sensitive settings; the server does **not** load environment files automatically.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Integer from 1 to 65535; supplied by Railway in production |
| `LOG_LEVEL` | `info` | One of `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` |
| `PUBLIC_BASE_URL` | Unset | HTTPS origin used to construct remote thumbnail URLs |

`PUBLIC_BASE_URL` accepts an origin with an optional trailing slash, but no credentials, path other than `/`, query or fragment. The server normalizes it to an origin. `NODE_ENV=production` is set in the Docker runtime image.

## HTTP Contract

| Endpoint | Success response |
| --- | --- |
| `GET /health` | `200`, `{"status":"ok"}` |
| `GET /api/comics` | `200`, `{"data":{"results":[...]}}` |
| `GET /api/comics/:id` | `200`, one comic object, without the list envelope |
| `GET /covers/:filename` | `200`, a registered JPEG cover |
| `HEAD /covers/:filename` | Image headers without a response body |

The catalog contains nine records in this order: **7, 8, 9, 1, 2, 3, 4, 5, 6**. IDs identify records; they do not define display order.

| ID | Remote-exclusive story | Series | Issue | Genre | Year |
| --- | --- | --- | --- | --- | --- |
| 7 | Protocolo Ômega: Última Transmissão | Protocolo Ômega | 1 | Ficção científica / Suspense | 2026 |
| 8 | Distrito Neon: Código Fantasma | Distrito Neon | 1 | Cyberpunk / Investigação | 2026 |
| 9 | O Reino das Cinzas: Herdeira do Fogo | O Reino das Cinzas | 1 | Fantasia épica | 2026 |

The following is an excerpt of the first list item. The other eight records and the long `description`/`synopsis` fields are omitted here for readability; they are present in the actual response.

```json
{
  "data": {
    "results": [
      {
        "id": 7,
        "title": "Protocolo Ômega: Última Transmissão",
        "series": "Protocolo Ômega",
        "issueNumber": 1,
        "genre": "Ficção científica / Suspense",
        "publicationYear": 2026,
        "shortSynopsis": "Uma analista recebe um pedido de socorro enviado com sua própria voz e tem seis horas para impedir que uma estação apague os últimos sinais da Terra.",
        "thumbnail": {
          "path": "https://comics-showcase-api-production.up.railway.app/covers/protocolo-omega-v1",
          "extension": "jpg"
        }
      }
    ]
  }
}
```

Every record includes `id`, `title`, `description`, `series`, `genre`, `publicationYear`, `shortSynopsis` and `synopsis`. In this catalog, `description` equals the full `synopsis`. Optional `issueNumber` and `volumeNumber` are omitted when absent.

IDs 1–6 preserve their original texts, metadata and local `coverKey`. IDs 7–9 omit `coverKey` and include `thumbnail` when the corresponding cover is available and `PUBLIC_BASE_URL` is configured. The image URL is `thumbnail.path + "." + thumbnail.extension`.

### Validation and errors

JSON schemas validate route parameters and define serialized responses. IDs must be canonical positive Android `Int` values, from 1 to 2147483647. Zero, signs, leading zeroes, decimals and overflow return `400`; an unknown valid ID such as `999` returns `404`.

```json
{
  "error": {
    "code": "COMIC_NOT_FOUND",
    "message": "Comic not found"
  }
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Invalid request parameters |
| 404 | `COMIC_NOT_FOUND` | Unknown comic ID |
| 404 | `COVER_NOT_FOUND` | Unavailable or unregistered cover filename |
| 404 | `NOT_FOUND` | Unknown route |
| 500 | `INTERNAL_ERROR` | Unexpected server failure; internal details are not returned |

List and detail routes set `Cache-Control: no-store`, so refreshed catalog requests can receive current metadata and image URLs.

## Android Integration

The integration uses the existing Retrofit `@GET("comics")` endpoint and `data.results` envelope. Configure the Android build's `COMICS_BASE_URL` as:

```text
https://comics-showcase-api-production.up.railway.app/api/
```

The trailing slash matters: Retrofit appends `comics` to this base URL.

| Mode | Catalog | Cover source |
| --- | --- | --- |
| Offline/demo | Six embedded stories, IDs 1–6 | Bundled Android resources |
| Online | Nine stories; IDs 7–9 appear first | HTTPS images for IDs 7–9; bundled resources for IDs 1–6 |

The Offline mode always uses `DemoComicsRepository`. The Online mode uses `RemoteComicsRepository` when `COMICS_BASE_URL` is configured; otherwise, it reports a recoverable network error. There is no automatic fallback from Online to Offline.

`ComicsResponseDto.toComics()` maps the nullable DTO metadata and combines `thumbnail.path`/`extension` into `imageUrl`. Image URLs must use HTTPS without credentials, query strings or fragments. `ComicCover` prefers a recognized local `coverKey`, then the remote `imageUrl`; `ComicImageClient` does not follow redirects. The API's direct HTTPS image URLs fit this contract without an additional URL field.

No Android change is required for the inspected contract. The original six offline records and their local resources remain separate from the three online-exclusive stories. If a thumbnail is absent or an image fails to load, the Android cover component has an unavailable-cover state.

The contract reference is [Android revision acc2a13d](https://github.com/jSantini/comics_sample/tree/acc2a13d750d6f0da7a1beac9a9d8e48180c7d34). Relevant files include `ComicsAPI.kt`, `ComicsResponseDto.kt`, `NetworkModule.kt`, `ComicCover.kt` and `ComicImageClient.kt`.

## Architecture

The application keeps a small module structure without a database, authentication or external API calls:

```text
src/
  app.ts                         # injectable app factory and deployment snapshot
  server.ts                      # startup, structured logs and graceful shutdown
  config/env.ts                  # validated environment
  modules/
    comics/
      comics.data.ts             # nine immutable fictional records
      comics.schemas.ts          # TypeScript types and JSON schemas
      comics.service.ts          # catalog reads and thumbnail projection
      comics.routes.ts           # HTTP boundary
    covers/covers.ts             # cover allowlist, bounded assets and HTTP cache
  shared/errors.ts               # centralized safe error responses
public/covers/                    # three bundled JPEG covers and asset inventory
tests/                           # Fastify inject tests and original catalog fixture
.github/workflows/ci.yml          # Node.js 22 validation pipeline
Dockerfile                       # multistage production image
railway.toml                     # build, start and readiness configuration
```

[Comics routes](src/modules/comics/comics.routes.ts) handle HTTP concerns, the [service](src/modules/comics/comics.service.ts) projects catalog data, and [schemas](src/modules/comics/comics.schemas.ts) define validation and response serialization. [`buildApp()`](src/app.ts) creates the application independently of the listening process, allowing tests to use Fastify inject without an external server.

Startup validates environment values and loads the available cover snapshot. Configuration errors or invalid cover files stop startup. The server binds to `0.0.0.0`, handles listening failures and closes on `SIGTERM`/`SIGINT` with a ten-second shutdown deadline.

Logs include request ID, method, route template and response status. Raw request URLs, headers, bodies and credentials are not logged. Thumbnail origins come only from validated configuration, never from client `Host` or forwarded headers.

## Image Delivery and Cache

The three final JPEGs are bundled in [public/covers](public/covers/README.md) and copied into the Docker runtime image. Only filenames listed in the [cover manifest](src/modules/covers/covers.ts) are served. Other files, including the asset README, are not exposed by that route.

At startup, the server loads each available file, checks its JPEG signature and enforces a nonempty-file limit of **400 KiB per cover**. The three encoded buffers use at most 1200 KiB per process, plus normal application overhead. A missing file is omitted from thumbnail projection; an invalid or oversized file stops startup. Final asset dimensions, sizes and SHA-256 hashes are recorded in the [asset inventory](public/covers/README.md).

Successful image responses include:

```http
Content-Type: image/jpeg
Cache-Control: public, max-age=31536000, immutable
ETag: "<SHA-256 of the image bytes>"
X-Content-Type-Options: nosniff
```

`HEAD` returns the image headers without a body. `If-None-Match` supports conditional `304 Not Modified` responses, including weak validators and `*`. Missing or unregistered cover filenames return `404` with `Cache-Control: no-store`.

Versioned filenames make long-lived caching safe: use a new filename and update the manifest when artwork changes, rather than replacing published `v1` bytes. Keep earlier files/routes available during a version transition. Image resizing and range requests are not implemented.

There is no paid external storage, upload endpoint or persistent volume. Images still consume Railway bandwidth and request capacity. On Android, Coil can fetch lazily, decode to display size and reuse its memory/disk caches; the catalog carries URLs rather than base64 image data.

## Tests and CI

[GitHub Actions](.github/workflows/ci.yml) runs `npm ci`, typecheck, build and tests on Node.js 22 for pushes and pull requests. Dependencies are pinned in [package.json](package.json) and [package-lock.json](package-lock.json).

The automated suite uses Fastify inject and covers:

- Nine-story ordering, unique IDs, metadata and list/detail serialization.
- Exact preservation of all original fields for IDs 1–6 through a [regression fixture](tests/fixtures/original-comics.json).
- Invalid IDs, missing comics/routes, environment validation and sanitized errors.
- Actual bundled cover bytes, the Android thumbnail contract and configured HTTPS origins.
- Missing, invalid and oversized artwork; exclusion of arbitrary filenames.
- Image content types, ETags, cache headers, `HEAD` and conditional `304` responses.

Run the commands in [Quick Start](#quick-start) to validate a checkout. Android UI/device tests belong to the Android project; this repository tests the backend HTTP boundary.

## Railway Deployment

The live service uses the checked-in [Railway configuration](railway.toml) and [multistage Dockerfile](Dockerfile):

- The build stage uses Node.js 22, installs the lockfile with `npm ci`, compiles TypeScript and removes development dependencies.
- The runtime image contains compiled code, production dependencies and `public/`, runs as the non-root `node` user and starts with `npm start`.
- Railway supplies `PORT`; the server listens on `0.0.0.0`.
- `PUBLIC_BASE_URL` is the public HTTPS origin used in thumbnail responses:

```text
PUBLIC_BASE_URL=https://comics-showcase-api-production.up.railway.app
```

Use the origin only—do not append `/api/` or `/covers/`. That differs from Android's `COMICS_BASE_URL`, which includes `/api/`.

The readiness endpoint is `/health`, with a configured 30-second timeout. The restart policy is `ON_FAILURE` with a maximum of three retries. Railway readiness checks govern deployment activation; they are not continuous uptime monitoring. See [Railway health checks](https://docs.railway.com/deployments/healthchecks).

The Node 22 Docker base tag receives upstream updates; dependency installation is lockfile-based, while the base image is not pinned to a digest. Catalog and artwork updates are delivered as part of a new application image. No database or image-storage credentials are required.

## Limits and Trade-offs

An immutable nine-record catalog keeps setup, deployment and review simple. Each instance serves the same snapshot from its application image, but content updates require a build and deployment. A database would become useful for independently managed or substantially larger catalogs.

There are no write operations, pagination, search, authentication or editorial tools. Browser CORS is not enabled because the native Android client does not require it. The public service is a focused portfolio demonstration, with no dependency on Marvel or another content provider.

## Catalog Provenance

IDs 1–6 retain the Portuguese texts, synopses, metadata and local cover keys from `DemoComicsRepository.kt` at [Android revision 34fd9132](https://github.com/jSantini/comics_sample/tree/34fd91326e3d270ad3e6abd7580c60838d9f7ed2).

IDs 7–9 are fictional stories written for this backend, with dedicated short/full synopses and cover artwork. Protocolo Ômega includes the approved Portuguese title correction. The service uses no Marvel content, credentials or external API dependencies.
