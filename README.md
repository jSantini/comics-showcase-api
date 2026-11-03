# Comics Showcase API

A public portfolio backend for [jSantini/comics_sample](https://github.com/jSantini/comics_sample), demonstrating an explicit Android contract, strict validation and reproducible checks.

## Architecture

Node.js 22, TypeScript strict, Fastify 5 and npm. Routes validate and serialize HTTP contracts; a service projects the immutable catalog; a central handler produces safe errors. No database, authentication, external APIs or runtime network dependencies.

```text
src/
  app.ts                        # injectable app and deployment snapshot
  server.ts                     # process lifecycle and structured logs
  config/env.ts                 # validated environment
  modules/comics/
    comics.data.ts              # three new stories followed by six unchanged originals
    comics.schemas.ts           # types and response/parameter schemas
    comics.service.ts           # catalog and available-cover projection
    comics.routes.ts            # HTTP boundary
  modules/covers/covers.ts       # explicit filenames, bounded assets, HTTP caching
  shared/errors.ts              # centralized safe errors
public/covers/README.md          # bundled JPEG inventory and delivery specification
tests/fixtures/original-comics.json  # regression baseline from main
.github/workflows/ci.yml
Dockerfile
railway.toml
```

## Local development and validation

Use Node.js 22 and npm:

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm test
npm start
```

Default: http://localhost:3000, host 0.0.0.0. PORT must be 1–65535; LOG_LEVEL defaults to info. Set variables in the shell or hosting settings: .env.example is documentation, not automatically loaded. Optional PUBLIC_BASE_URL is the real HTTPS origin without a path, credentials, query or fragment. Leave it unset until the public origin is known.

Dependencies and the lockfile are unchanged by this feature. Native Node APIs serve the three bounded cover assets without an extra package. CI runs npm ci, typecheck, build and tests on Node 22. Tests use Fastify inject without external servers. They cover catalog ordering, unique IDs, original-record regression, metadata, details, invalid IDs, missing resources, URL safety, byte responses, HEAD, ETag/304, cache headers, artwork constraints, configuration and safe internal errors.

## HTTP contract

| Endpoint | Response |
| --- | --- |
| GET /health | 200, {"status":"ok"} |
| GET /api/comics | 200, {"data":{"results":[...]}} |
| GET /api/comics/:id | 200, one comic object |
| GET or HEAD /covers/:filename | JPEG only for an available, explicitly registered cover |

The list contains exactly nine stories in order **7, 8, 9, 1, 2, 3, 4, 5, 6**. IDs do not encode display order. New entries:

| ID | Title | Series | Issue | Genre | Year |
| --- | --- | --- | --- | --- | --- |
| 7 | Protocolo Ômega: Última Transmissão | Protocolo Ômega | 1 | Ficção científica / Suspense | 2026 |
| 8 | Distrito Neon: Código Fantasma | Distrito Neon | 1 | Cyberpunk / Investigação | 2026 |
| 9 | O Reino das Cinzas: Herdeira do Fogo | O Reino das Cinzas | 1 | Fantasia épica | 2026 |

All records include id, title, description, series, genre, publicationYear, shortSynopsis and synopsis. description equals the full synopsis. issueNumber/volumeNumber are omitted when absent. IDs 1–6 keep every original field and local coverKey; IDs 7–9 omit coverKey entirely.

A new record with PUBLIC_BASE_URL unset (the real list has nine items):

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
        "synopsis": "Na estação de escuta Nadir, a analista de comunicações Helena Reis monitora um corredor espacial abandonado. Durante um turno de rotina, ela recebe uma transmissão com sua própria voz, gravada seis horas no futuro: ninguém deve ativar o Protocolo Ômega. Quando os sistemas começam a eliminar registros da Terra e os colegas negam lembrar do planeta, Helena encontra mensagens escondidas nos intervalos do ruído cósmico. Cada uma descreve uma tentativa anterior de fuga que ela não recorda ter vivido. Com a estação se preparando para transmitir um comando irreversível, Helena precisa descobrir se o aviso veio de uma versão sua que tentou salvá-los ou de algo que aprendeu a imitá-la.",
        "description": "Na estação de escuta Nadir, a analista de comunicações Helena Reis monitora um corredor espacial abandonado. Durante um turno de rotina, ela recebe uma transmissão com sua própria voz, gravada seis horas no futuro: ninguém deve ativar o Protocolo Ômega. Quando os sistemas começam a eliminar registros da Terra e os colegas negam lembrar do planeta, Helena encontra mensagens escondidas nos intervalos do ruído cósmico. Cada uma descreve uma tentativa anterior de fuga que ela não recorda ter vivido. Com a estação se preparando para transmitir um comando irreversível, Helena precisa descobrir se o aviso veio de uma versão sua que tentou salvá-los ou de algo que aprendeu a imitá-la."
      }
    ]
  }
}
```

Once the corresponding final JPEG exists and PUBLIC_BASE_URL is set, only that new record gains the existing Android thumbnail shape:

```json
{
  "thumbnail": {
    "path": "https://comics.example.test/covers/protocolo-omega-v1",
    "extension": "jpg"
  }
}
```

The domain above is illustrative, not a deployed address. Android joins path + "." + extension. No new coverUrl field is needed. Missing images or an unset public origin omit thumbnail, rather than advertising a broken or temporary image. URLs never depend on Host or forwarded headers. List/detail responses use Cache-Control: no-store to allow refreshed catalog metadata.

IDs are canonical positive Android Int values (1–2147483647); zero, signs, leading zeroes, decimals and overflow return 400. Unknown valid IDs return 404.

```json
{"error":{"code":"COMIC_NOT_FOUND","message":"Comic not found"}}
```

Other codes: INVALID_REQUEST (400), NOT_FOUND (404 route), COVER_NOT_FOUND (404 cover), INTERNAL_ERROR (500). Internal details are not returned. Logs record request ID, method, route template and status without raw URLs, headers, bodies or credentials.

## Original cover delivery

The implementation serves these three exact files from public/covers:

- protocolo-omega-v1.jpg
- distrito-neon-v1.jpg
- reino-das-cinzas-v1.jpg

The three final JPEGs are included; no placeholder artwork is shipped. See public/covers/README.md for production requirements: original portrait JPEG, preferably 800 x 1200, target 150–250 KiB, maximum 400 KiB per file, with EXIF removed and a visual review before publication.

The server loads available files once at startup, checks JPEG signatures/size and computes content-based ETags. Invalid files fail startup. Encoded bytes consume at most 1.2 MiB per process. Files ship inside the Docker image; no paid external storage, upload endpoint or persistent volume is needed. Only explicit filenames are routable; README and arbitrary filesystem paths are never served.

Successful responses use image/jpeg, nosniff and Cache-Control: public, max-age=31536000, immutable. Conditional requests support If-None-Match/304, including weak validators, and HEAD returns headers without a body. Missing covers return 404/no-store. Rename artwork to v2 (and update the manifest and thumbnail projection) for future changes; do not change published v1 bytes. Keep older version routes/files during cache transitions. Range requests and image resizing are not implemented.

Images consume Railway bandwidth/requests and some process memory. Android should keep Coil's lazy fetching, display-sized decoding and normal memory/disk caching. Long-lived asset URLs avoid repeated transfers; no base64 is embedded in JSON.

## Android compatibility

The original catalog was sourced at [34fd91326e3d270ad3e6abd7580c60838d9f7ed2](https://github.com/jSantini/comics_sample/tree/34fd91326e3d270ad3e6abd7580c60838d9f7ed2). For this feature, the contract was re-inspected on feature/offline-comics-details at [acc2a13d750d6f0da7a1beac9a9d8e48180c7d34](https://github.com/jSantini/comics_sample/tree/acc2a13d750d6f0da7a1beac9a9d8e48180c7d34).

ComicsAPI uses @GET("comics"); configure COMICS_BASE_URL with the real HTTPS origin plus /api/, including the trailing slash. ComicsResponseDto.toComics() already accepts thumbnail.path/extension, validates HTTPS without credentials/query/fragment, and maps the additional catalog metadata. ComicCover prefers a known local coverKey, then imageUrl. ComicImageClient requires HTTPS and does not follow redirects.

**No Android production code change is required for the inspected branch.** New records omit coverKey and use remote thumbnails when available. Until then, the current unavailable-cover UI is expected. Keep the six demo comics and bundled covers unchanged. Recommended Android tests: nine remote entries in server order, thumbnail URL composition, absent thumbnail, no local resource fallback for new IDs and valid remote image rendering. Older Android revisions lacking metadata mapping need the nullable metadata fields/mapper updates described by the current branch; no new URL DTO field is necessary.

## Railway publication plan — after approval

1. Review this feature diff and the three bundled JPEG covers, including the approved Portuguese title correction documented in public/covers/README.md.
2. Run npm ci, typecheck, build and tests. Validate the Docker image locally when Docker Desktop is running; the existing COPY public ./public includes all three JPEGs.
3. After explicit approval, commit/push the feature branch, review CI and merge through the normal process. No commit, push, merge or deploy is performed by this feature task.
4. Railway uses railway.toml and the multistage Dockerfile; the runtime image now includes public/. Reuse an existing service if one is configured, or create a service from this backend repository with the repository root as context.
5. Set PUBLIC_BASE_URL to the service's actual public HTTPS origin. Railway supplies PORT; npm start binds 0.0.0.0 and /health confirms readiness. No image storage credentials are needed.
6. Verify health, nine-item ordering, details for IDs 1 and 7–9, original metadata, full thumbnail HTTPS URLs, JPEG bytes/headers, HEAD/304 and unknown-cover 404. Check URLs without redirects because Android disables them.
7. Use the real origin plus /api/ in Android and verify remote rendering on device, cache behavior and unchanged local demo mode.

The infrastructure is prepared; no Railway deployment is claimed. If publishing before artwork is ready, the nine stories work with no thumbnails and no misleading image URLs. See [Railway health checks](https://docs.railway.com/deployments/healthchecks) for readiness semantics.

## Trade-offs and provenance

Nine immutable records need no database and remain easy to review. Catalog/artwork changes require a build and deployment. Instances serve identical snapshots from their image. There are no writes, pagination, search or editorial tools. A database becomes useful when content needs independent updates or grows beyond this small showcase. Native Android does not require browser CORS.

IDs 1–6 retain the exact Portuguese texts and metadata from jSantini/comics_sample's DemoComicsRepository.kt at the original revision above. A checked-in regression fixture protects every field. IDs 7–9 are new fictional stories written for this backend; their short/full synopses, series and issue metadata are original to this change. No Marvel content, credentials, third-party artwork or external API dependencies are included.
