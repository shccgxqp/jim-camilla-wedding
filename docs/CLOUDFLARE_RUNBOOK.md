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
- A chunked upload without `Content-Length` recorded the actual R2 object size in D1 correctly.
- Smoke-test objects and their D1 rows were deleted after each test.
- Gallery administration route `/photo-booth/gallery` returned 200. Anonymous and incorrect PIN requests returned 401; authorized list and delete were verified end-to-end.

## Cloudflare implementation notes

- GIF composition now occurs in the booth browser. The final animated GIF and, when the device supports WebCodecs H.264, an IG-friendly MP4 are uploaded to R2; Node filesystem, native image codecs, and `ffmpeg` are not used by the normal booth flow.
- The browser GIF path produces one 720px-wide GIF variant. Its companion MP4 loops the same frames four times (about six seconds) and is encoded as H.264 in an MP4 container. If that device cannot encode H.264, the saved GIF remains available and the capture still succeeds.
- Video result pages use the browser's native file-share sheet for the primary **儲存到照片** action. On iPhone, the guest chooses **儲存影片** in that sheet; web pages cannot silently write a video to the Photos library. A normal file download remains as a fallback.
- Remote camera signaling uses one Cloudflare Durable Object per pairing code.

## Feature status (2026-07-14)

| Feature | Cloudflare preview status | Evidence / next action |
| --- | --- | --- |
| Wedding pages (`/`, `/v2`) | Ready | Remote HTTP smoke test returned 200. |
| Photo-booth settings and frames | Ready | `/api/config`, `/api/backgrounds`, and static background assets returned 200. |
| Local-device photo capture → storage | Ready to device-test | The browser posts composed image data to `/api/photos`; an end-to-end R2 upload and secure read test passed. |
| Local-device video upload → storage | Ready to device-test | Uses the same `/api/photos` route. Byte-range reads returned 206, required for video playback. |
| QR / private media download page | Ready | `/photos/:token` and `/view/:token` returned 200 in remote smoke testing. |
| Online photo management | Ready | `/photo-booth/gallery` lists up to 500 private R2 media records by date, supports newest/oldest order, and can delete an object plus its D1 record after PIN verification. |
| GIF composition + IG MP4 | Ready to device-test | Browser composes the framed animation, uploads the GIF, then best-effort encodes/uploads a H.264 MP4 companion for IG. Verify both files and composition time on the actual booth device. |
| iPhone remote camera pairing | Ready to device-test | `/ws?pair=CODE` now uses one Durable Object per four-character pairing code. Deployed WebSocket tests passed for pairing, signaling relay, and two isolated simultaneous host/camera pairs. Physical phone camera + WebRTC test remains required. |

## Acceptance checks before DNS cutover

1. iPad camera: each layout, filters, photo upload, QR, and phone download.
2. Video upload and mobile playback/download, including byte-range streaming.
3. GIF capture on every layout, including visual quality, composition time, and IG MP4 playback plus iPhone **儲存影片** on the actual booth device.
4. iPhone remote camera pairing, reconnect, and capture.
5. Run a private-event test with actual tablet and iPhone over the venue-like network.

## Photo management

- URL: `/photo-booth/gallery`
- Viewing the collection and deleting an item both require the Worker secret `ADMIN_PIN` through the management page.
- The PIN is a Cloudflare Worker secret, never committed to the repository. Change it with `npx wrangler secret put ADMIN_PIN` when needed.
- Deletion is permanent: the R2 object and its D1 metadata row are both removed.
- The current preview has `GALLERY_PIN_BYPASS: "true"` for development convenience. Before production deployment, remove this variable (or set it to `"false"`) and verify anonymous gallery requests return 401.

## Booth performance baseline

- Camera preview is capped at 30fps and the camera requests an ideal 30fps stream; final captured-photo resolution is unchanged.
- Preview canvas no longer resizes itself on every animation frame, and unused camera-debug React updates were removed.
- Captured images use asynchronous `canvas.toBlob()` encoding before conversion to the existing composition format, reducing the main-thread pause after each shutter.
- These changes target browser main-thread contention. Adding another server does not improve countdown smoothness because the countdown and preview render on the booth device.
