# Final cover assets

All three supplied cover files are bundled. Their source filenames end in .png, but the detected format is JPEG. Source files were left unchanged. No image was cropped; all proportions were preserved. Protocolo Omega lettering was corrected to the approved Portuguese title. All outputs have no EXIF.

| Comic ID | Filename | Dimensions | Bytes | KiB |
| --- | --- | --- | --- | --- |
| 7 | protocolo-omega-v1.jpg | 1054 x 1492 | 245291 | 239.54 |
| 8 | distrito-neon-v1.jpg | 1200 x 1200 | 254537 | 248.57 |
| 9 | reino-das-cinzas-v1.jpg | 832 x 1280 | 176602 | 172.46 |

SHA-256:

- protocolo-omega-v1.jpg: `9991e89b59c8af9ca403a93096d616854e1af875064165090ca72d790b05eb82`
- distrito-neon-v1.jpg: `731c9753811a03efbf589f8fb9e7652679296ec46622e7fbf1781d4fdde0765e`
- reino-das-cinzas-v1.jpg: `40ef9f03286cce7b7d047e83fa3ce6aa9f5b29aa280e11c3e351760d8ec865ad`

Reino das Cinzas retains its original JPEG bytes. Protocolo Omega was edited with ImageGen to replace the title with PROTOCOLO ÔMEGA / ÚLTIMA TRANSMISSÃO, preserving the scene and proportions, then encoded as optimized progressive JPEG at quality 87 without EXIF. Distrito Neon was resized from 1920 x 1920 to 1200 x 1200 using Lanczos and encoded at JPEG quality 82 with progressive/optimized compression and no source metadata.

The corrected Protocolo Omega cover was reviewed and approved. Distrito Neon remains square, preserving the supplied composition.

Files are loaded once at startup from this directory. Only these three exact filenames are served. This README and unrelated files are never public routes. Missing files return 404 with no-store and are omitted from comic thumbnails. Invalid or oversized files stop startup.

Set PUBLIC_BASE_URL to the real HTTPS origin, without a path, credentials, query or fragment. It is never derived from client Host or forwarded headers. An unset origin disables thumbnail advertisement while preserving the catalog.

Successful GET and HEAD responses use image/jpeg, nosniff, a content-based ETag and public, max-age=31536000, immutable. Conditional If-None-Match requests support 304. Change the versioned filename in the manifest when artwork changes; never replace published v1 bytes. Future v2 deployments should keep old v1 assets/routes available during client cache transitions (extend the manifest/route list accordingly).

The three bounded files use at most 1.2 MiB of encoded image memory per instance and ship inside the Docker image. There are no uploads, volumes, remote storage, redirects or resize requests. Clients should request/decode images lazily at display size. Bandwidth and requests still count toward Railway usage.
