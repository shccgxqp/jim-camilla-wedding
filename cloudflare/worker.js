import weddingConfig from "../config/wedding.json";

const BACKGROUNDS = [
  "frame01background.png",
  "frame02background.png",
  "frame03background.png",
  "frame04background.png",
  "frame05background.png",
  "photo01.jpg",
  "select01.jpg",
];

const MIME_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function noStore(response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}

function mediaConfig() {
  return {
    coupleName: weddingConfig.coupleName,
    weddingDate: weddingConfig.weddingDate,
    tagline: weddingConfig.tagline,
    countdownSeconds: Number(weddingConfig.countdownSeconds || 3),
    theme: weddingConfig.theme,
    gifMode: weddingConfig.gifMode || "low",
  };
}

function extensionFor(contentType) {
  return MIME_TO_EXTENSION[contentType.split(";", 1)[0].toLowerCase()] || null;
}

function filenameFor(token, extension) {
  const stamp = new Date().toISOString().replaceAll(/[-:.TZ]/g, "").slice(0, 14);
  return `wedding-${stamp}-${token.slice(0, 8)}.${extension}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mediaView(row, token, gifToken) {
  const isVideo = row.content_type.startsWith("video/");
  const mediaUrl = `/photos/${encodeURIComponent(token)}`;
  const element = isVideo
    ? `<video controls autoplay muted loop playsinline src="${mediaUrl}"></video>`
    : `<img src="${mediaUrl}" alt="Wedding photo">`;
  const gifLink = gifToken
    ? `<p><a href="/photos/${encodeURIComponent(gifToken)}">下載 GIF</a></p>`
    : "";
  return new Response(`<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(weddingConfig.coupleName)} Photo Booth</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#251510;color:#fff7ef;font-family:system-ui,sans-serif}main{width:min(92vw,560px);text-align:center}img,video{display:block;width:100%;border-radius:14px}a{color:#ffe0c6}</style></head><body><main><p>${escapeHtml(weddingConfig.coupleName)} · Photo Booth</p>${element}<p><a href="${mediaUrl}" download="${escapeHtml(row.filename)}">下載原始檔</a></p>${gifLink}</main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}

function parseRange(rangeHeader, size) {
  if (!rangeHeader?.startsWith("bytes=")) return null;
  const [startText, endText] = rangeHeader.slice(6).split("-", 2);
  const start = Number(startText);
  const end = endText ? Number(endText) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= size) return "invalid";
  return { offset: start, length: Math.min(end, size - 1) - start + 1 };
}

async function findMedia(env, token) {
  if (!env.DB || !env.MEDIA) return null;
  return env.DB.prepare("SELECT token, object_key, filename, content_type, size FROM media WHERE token = ?")
    .bind(token)
    .first();
}

async function uploadMedia(request, env) {
  if (!env.DB || !env.MEDIA) return json({ error: "Media storage is not configured yet." }, 503);
  const contentType = request.headers.get("content-type") || "";
  const extension = extensionFor(contentType);
  const length = Number(request.headers.get("content-length") || 0);
  if (!extension || !request.body) return json({ error: "Unsupported or empty upload." }, 415);
  if (length > 25 * 1024 * 1024) return json({ error: "Upload is larger than 25 MB." }, 413);

  const token = crypto.randomUUID();
  const filename = filenameFor(token, extension);
  const objectKey = `photos/${new Date().toISOString().slice(0, 10)}/${token}.${extension}`;
  await env.MEDIA.put(objectKey, request.body, {
    httpMetadata: { contentType: contentType.split(";", 1)[0] },
  });
  try {
    await env.DB.prepare("INSERT INTO media (token, object_key, filename, content_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(token, objectKey, filename, contentType.split(";", 1)[0], length, new Date().toISOString())
      .run();
  } catch (error) {
    await env.MEDIA.delete(objectKey);
    throw error;
  }
  return json({ token, filename, downloadUrl: `/photos/${token}` }, 201);
}

async function serveMedia(request, env, token) {
  const row = await findMedia(env, token);
  if (!row) return new Response("Not found.", { status: 404 });
  const range = parseRange(request.headers.get("range"), row.size);
  if (range === "invalid") return new Response(null, { status: 416, headers: { "content-range": `bytes */${row.size}` } });
  const object = await env.MEDIA.get(row.object_key, range ? { range } : undefined);
  if (!object) return new Response("Not found.", { status: 404 });
  const headers = new Headers({
    "content-type": row.content_type,
    "accept-ranges": "bytes",
    "content-disposition": `inline; filename="${row.filename.replaceAll('"', "")}"`,
    etag: object.httpEtag,
  });
  if (range) {
    headers.set("content-length", String(range.length));
    headers.set("content-range", `bytes ${range.offset}-${range.offset + range.length - 1}/${row.size}`);
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("content-length", String(row.size));
  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (request.method === "GET" && pathname === "/api/health") return noStore(json({ ok: true, storage: Boolean(env.MEDIA && env.DB) }));
    if (request.method === "GET" && pathname === "/api/config") return noStore(json(mediaConfig()));
    if (request.method === "GET" && pathname === "/api/backgrounds") return noStore(json({ backgrounds: BACKGROUNDS.map((filename) => ({ filename, url: `/backgrounds/${encodeURIComponent(filename)}` })) }));
    if (request.method === "POST" && pathname === "/api/photos") return uploadMedia(request, env);
    if (request.method === "GET" && pathname.startsWith("/photos/")) return serveMedia(request, env, decodeURIComponent(pathname.slice(8)));
    if (request.method === "GET" && pathname.startsWith("/view/")) {
      const token = decodeURIComponent(pathname.slice(6));
      const row = await findMedia(env, token);
      return row ? mediaView(row, token, url.searchParams.get("gif")) : new Response("Not found.", { status: 404 });
    }
    if (pathname.startsWith("/api/gif/")) return json({ error: "GIF composition is not yet available in the Cloudflare preview." }, 501);
    return new Response("Not found.", { status: 404 });
  },
};
