# Cloudflare migration runbook

## Deployment model

- The current Vercel site stays live until Cloudflare acceptance testing is complete.
- `feat/cloudflare-parallel` deploys an isolated Worker named `jim-camilla-wedding-preview`.
- The Worker serves the Vite build, D1 indexes private media tokens, and R2 stores the media bytes.
- No custom domain or Vercel DNS record is changed during preview.

## One-time Cloudflare account setup

1. In **Workers & Pages**, register the account's `workers.dev` subdomain.
2. In **R2 Object Storage**, enable R2 for the account and accept the billing setup.
3. Do not create a public R2 bucket. Media must remain private and be served only through `/photos/:token`.

## Provision and deploy

After R2 is enabled, run these commands from the repository root:

```powershell
npx wrangler r2 bucket create jim-camilla-wedding-media-preview
npx wrangler deploy
```

Add the returned bucket binding to `wrangler.jsonc` as `MEDIA`, then deploy again. D1 preview database `jim-camilla-wedding-preview` already exists and has the `media` schema.

## Verified in local Workers runtime

- `/` and `/v2` SPA routes return 200.
- `/api/config` and `/api/backgrounds` return expected data.
- Static photo-booth backgrounds return 200.
- Upload returns 503 until the private R2 binding exists (expected safe failure).

## Verified on Cloudflare preview

- Preview URL: `https://jim-camilla-wedding-preview.shccgxqp.workers.dev`
- The Worker has private `MEDIA` (R2) and `DB` (D1) bindings.
- `/api/health`, `/api/config`, `/`, and `/v2` returned 200.
- PNG upload to R2, secure `/photos/:token`, and `/view/:token` returned 200.
- A byte-range request returned 206 with correct `Content-Range`; this is required for video streaming.
- Smoke-test objects and their D1 rows were deleted after each test.

## Not yet Cloudflare-compatible

- GIF frame composition relies on Node filesystem, native image codecs, and `ffmpeg`; it is deliberately 501 in the preview Worker.
- iPhone remote camera signaling relies on a process-local `ws` server. It needs a Durable Object before Cloudflare cutover.
- Existing Node server remains the fallback for these features until their replacements pass device tests.

## Feature status (2026-07-14)

| Feature | Cloudflare preview status | Evidence / next action |
| --- | --- | --- |
| Wedding pages (`/`, `/v2`) | Ready | Remote HTTP smoke test returned 200. |
| Photo-booth settings and frames | Ready | `/api/config`, `/api/backgrounds`, and static background assets returned 200. |
| Local-device photo capture → storage | Ready to device-test | The browser posts composed image data to `/api/photos`; an end-to-end R2 upload and secure read test passed. |
| Local-device video upload → storage | Ready to device-test | Uses the same `/api/photos` route. Byte-range reads returned 206, required for video playback. |
| QR / private media download page | Ready | `/photos/:token` and `/view/:token` returned 200 in remote smoke testing. |
| GIF composition | Blocked | Worker intentionally returns 501; requires a Cloudflare-compatible composition design. |
| iPhone remote camera pairing | Blocked | Both clients connect to `/ws`, but the deployed Worker has no WebSocket endpoint; `GET /ws` is currently the SPA HTML fallback, not an Upgrade response. Requires Durable Object signaling. |

## Acceptance checks before DNS cutover

1. iPad camera: each layout, filters, photo upload, QR, and phone download.
2. Video upload and mobile playback/download, including byte-range streaming.
3. GIF capture and all quality modes.
4. iPhone remote camera pairing, reconnect, and capture.
5. Run a private-event test with actual tablet and iPhone over the venue-like network.
