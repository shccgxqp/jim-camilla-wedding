import { DurableObject } from "cloudflare:workers";
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

function validPairCode(value) {
  return /^[A-HJ-NP-Z2-9]{4}$/.test(value || "");
}

function parseMessage(message) {
  try {
    if (typeof message === "string") return JSON.parse(message);
    return JSON.parse(new TextDecoder().decode(message));
  } catch {
    return null;
  }
}

export class RemoteCameraSession extends DurableObject {
  async fetch(request) {
    if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket upgrade.", { status: 426 });
    }
    const pair = new URL(request.url).searchParams.get("pair")?.toUpperCase() || "";
    if (!validPairCode(pair)) return new Response("Invalid pair code.", { status: 400 });

    const [client, server] = Object.values(new WebSocketPair());
    server.serializeAttachment({ pair, role: null });
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  peers(role, except = null) {
    return this.ctx.getWebSockets().filter((socket) => {
      const state = socket.deserializeAttachment();
      return socket !== except && state?.role === role;
    });
  }

  send(socket, payload) {
    try {
      socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
    } catch {}
  }

  notify(role, payload, except = null) {
    this.peers(role, except).forEach((socket) => this.send(socket, payload));
  }

  webSocketMessage(socket, message) {
    const state = socket.deserializeAttachment();
    const msg = parseMessage(message);
    if (!state || !msg) return;

    if (msg.type === "ping") {
      this.send(socket, { type: "pong" });
      return;
    }

    if (msg.type === "hello") {
      const role = msg.role === "booth" ? "booth" : msg.role === "camera" ? "camera" : null;
      const claimedPair = typeof msg.pair === "string" ? msg.pair.toUpperCase() : "";
      if (!role || claimedPair !== state.pair) {
        this.send(socket, { type: "pair-rejected" });
        socket.close(1008, "Invalid pairing");
        return;
      }

      this.peers(role, socket).forEach((existing) => {
        this.send(existing, { type: "replaced" });
        existing.close(4001, "Replaced by a newer connection");
      });
      socket.serializeAttachment({ ...state, role });
      const peerRole = role === "booth" ? "camera" : "booth";
      const peers = this.peers(peerRole);
      if (peers.length) {
        this.send(socket, { type: "peer-joined" });
        peers.forEach((peer) => this.send(peer, { type: "peer-joined" }));
      }
      return;
    }

    if (!state.role) return;
    const peerRole = state.role === "booth" ? "camera" : "booth";
    this.peers(peerRole).forEach((peer) => this.send(peer, message));
  }

  webSocketClose(socket) {
    const state = socket.deserializeAttachment();
    if (!state?.role) return;
    const peerRole = state.role === "booth" ? "camera" : "booth";
    this.notify(peerRole, { type: "peer-left" });
  }

  webSocketError(socket) {
    try { socket.close(1011, "WebSocket error"); } catch {}
  }
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
  const storedObject = await env.MEDIA.put(objectKey, request.body, {
    httpMetadata: { contentType: contentType.split(";", 1)[0] },
  });
  try {
    await env.DB.prepare("INSERT INTO media (token, object_key, filename, content_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(token, objectKey, filename, contentType.split(";", 1)[0], storedObject.size, new Date().toISOString())
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
    if (pathname === "/ws") {
      const pair = url.searchParams.get("pair")?.toUpperCase() || "";
      if (!validPairCode(pair)) return new Response("Invalid pair code.", { status: 400 });
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response("Expected a WebSocket upgrade.", { status: 426 });
      return env.REMOTE_CAMERA_SESSION.getByName(pair).fetch(request);
    }
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
