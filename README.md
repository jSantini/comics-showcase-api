# Comics Showcase API

A small public portfolio backend for [jSantini/comics_sample](https://github.com/jSantini/comics_sample), demonstrating an Android-to-backend integration with an explicit contract, strict validation and reproducible checks.

## Architecture

Node.js 22, TypeScript strict, Fastify 5 and npm. Routes validate and serialize HTTP contracts, a service reads an immutable in-memory catalog, and one error handler produces safe error envelopes. No database, authentication, external API calls or runtime network dependencies.

```text
src/
  app.ts                        # injectable application factory
  server.ts                     # process lifecycle and structured logs
  config/env.ts                 # validated environment
  modules/comics/
    comics.data.ts              # original six fictional entries
    comics.schemas.ts           # types and JSON schemas
    comics.service.ts           # catalog reads
    comics.routes.ts            # HTTP boundary
  shared/errors.ts              # centralized safe errors
tests/                          # Node test runner + Fastify inject
.github/workflows/ci.yml
Dockerfile
railway.toml
```

## Run locally

Install Node.js 22 and npm. From the repository root:

```sh
npm ci
npm run dev
```

The default address is http://localhost:3000. PORT must be an integer between 1 and 65535; the host is 0.0.0.0. LOG_LEVEL defaults to info. NODE_ENV=production is set by the production image. .env.example documents non-sensitive values; environment files are not automatically loaded. Set variables in your shell or hosting settings.

```sh
npm run typecheck
npm run build
npm test
npm start
```

Tests use inject and do not need a listening server. They cover the complete serialized catalog, all details, invalid IDs, missing comics/routes, health, configuration and sanitized internal errors. CI runs npm ci, typecheck, build and tests on Node 22.

Dependency versions are pinned in package.json and package-lock.json. The production image uses Node 22 and npm ci; its base image receives Node 22 security updates rather than being pinned to an old patch or digest.

## HTTP contract

| Endpoint | Success |
| --- | --- |
| GET /health | 200, {"status":"ok"} |
| GET /api/comics | 200, {"data":{"results":[...]}} |
| GET /api/comics/:id | 200, a single comic object |

Example list response (first item only; the real response contains six):

```json
{
  "data": {
    "results": [
      {
        "id": 1,
        "title": "Aurora: O Primeiro Sinal",
        "description": "Em 2187, a comandante Aurora Voss lidera uma missão de reconhecimento além de Netuno. Ao interceptar uma transmissão impossível de decifrar, sua tripulação descobre coordenadas de uma estação desaparecida há mais de cem anos. Agora, Aurora precisa escolher entre obedecer às ordens de retorno ou seguir um sinal que parece conhecer seu passado.",
        "series": "Aurora",
        "issueNumber": 1,
        "genre": "Ficção científica",
        "publicationYear": 2026,
        "shortSynopsis": "Quando um sinal desconhecido surge nas fronteiras do sistema solar, a capitã Aurora descobre uma mensagem que pode mudar o destino da humanidade.",
        "synopsis": "Em 2187, a comandante Aurora Voss lidera uma missão de reconhecimento além de Netuno. Ao interceptar uma transmissão impossível de decifrar, sua tripulação descobre coordenadas de uma estação desaparecida há mais de cem anos. Agora, Aurora precisa escolher entre obedecer às ordens de retorno ou seguir um sinal que parece conhecer seu passado.",
        "coverKey": "aurora"
      }
    ]
  }
}
```

description and synopsis preserve the original long synopsis. shortSynopsis preserves the original short text. issueNumber and volumeNumber are omitted when absent in the source. IDs are canonical positive decimal Android Int values, from 1 to 2147483647; zero, signs, leading zeroes, decimals and overflow return 400. Unknown valid IDs return 404.

```json
{"error":{"code":"COMIC_NOT_FOUND","message":"Comic not found"}}
```

Other codes: INVALID_REQUEST (400), NOT_FOUND (404, unknown route), INTERNAL_ERROR (500). Internal details are never returned. Logs record request ID, method, route template and status, without raw URLs, headers, payloads or credentials. Cover images are not hosted; there is no thumbnail field. The Android client may resolve coverKey to bundled resources.

## Android integration and next changes

Reference branch: feature/offline-comics-details. Inspected revision: [34fd91326e3d270ad3e6abd7580c60838d9f7ed2](https://github.com/jSantini/comics_sample/tree/34fd91326e3d270ad3e6abd7580c60838d9f7ed2).

Inspected files:

- data/.../remote/ComicsAPI.kt: Retrofit @GET("comics").
- data/.../remote/response/ComicsResponseDto.kt: data.results, nullable DTOs and toComics().
- data/.../repository/RemoteComicsRepository.kt: maps successful bodies and translates network failures.
- data/.../di/NetworkModule.kt: selects the demo repository when COMICS_BASE_URL is blank.
- domain/.../ComicsRepository.kt: optional domain metadata and synopsis defaults.
- data/.../repository/DemoComicsRepository.kt: exact catalog source.

Use the actual deployed HTTPS origin followed by /api/ as COMICS_BASE_URL, including the trailing slash. Retrofit will then request /api/comics. No API key or Marvel configuration is needed. No public deployment URL exists yet.

The current DTO accepts id/title/description/thumbnail and Gson ignores additional fields, so the API is compatible with the current online list. The existing mapper constructs Comic with only the first four fields; it therefore drops series, issue/volume, genre, year, coverKey and the dedicated short synopsis.

For the next Android change, extend ComicDto with nullable fields series: String?, issueNumber: Int?, volumeNumber: Int?, genre: String?, publicationYear: Int?, shortSynopsis: String?, synopsis: String? and coverKey: String?. Update toComics() to pass those fields to Comic with named arguments, retaining existing ID/title/duplicate validation and using shortSynopsis ?: description and synopsis ?: description as fallbacks. Validate positive issue/volume/year values if present. Keep imageUrl null when thumbnail is absent; resolve the known coverKey values through the existing bundled cover pipeline. Add mapper/HTTP tests for additive metadata, omitted numbering, fallback synopses and all six cover keys. The domain already supports these fields. The Android repository has not been modified.

## Railway deployment (manual, after approval)

1. Publish this backend as its own GitHub repository when approved; do not publish the Android project with it.
2. Create a Railway service from that repository, with the repository root as its build context.
3. The checked-in railway.toml selects the multistage Dockerfile. It runs npm ci, builds TypeScript and removes development dependencies.
4. Railway starts npm start, supplies PORT, and checks /health. The application listens on 0.0.0.0 and handles SIGTERM/SIGINT with a ten-second shutdown deadline.
5. Generate a public Railway domain, verify /health, /api/comics, /api/comics/1 and /api/comics/999, then use that real HTTPS origin plus /api/ in Android.
6. Do not configure credentials; optionally set LOG_LEVEL=info.

No remote repository, push or deployment is performed by this implementation. Railway health checks confirm deployment readiness; they are not continuous uptime monitoring. See [Railway health checks](https://docs.railway.com/deployments/healthchecks).

## Trade-offs

Six immutable records are easy to inspect, test and deploy. No persistence layer means no database setup or operational dependency. Catalog updates require code review and deployment; there are no writes, pagination, search, remote covers or editorial interface. Horizontal instances serve identical data from the same build. A database becomes useful when content needs independent updates or grows beyond a small showcase. Browser CORS is unnecessary for the native Android client and is not enabled.

## Catalog credits and provenance

All six fictional titles, Portuguese descriptions, short synopses, metadata and cover keys come from jSantini/comics_sample, DemoComicsRepository.kt at the revision linked above. synopsis is copied from description because the Android domain default uses that exact value. No catalog text or numbering was invented. Catalog IDs and order are retained. This service has no Marvel affiliation and includes no Marvel content, credentials or external calls. Artwork is not redistributed here.
