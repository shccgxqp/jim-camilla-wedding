const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile, spawn } = require("node:child_process");
const { promisify } = require("node:util");
const execFileAsync = promisify(execFile);
const { PNG } = require("pngjs");
const omggif = require("omggif");
const GIFEncoder = require("gif-encoder-2");
const {
  GIFEncoder: GifencEncoder,
  quantize: gifencQuantize,
  applyPalette: gifencApplyPalette,
} = require("gifenc");
const jpeg = require("jpeg-js");

const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const uploadsDir = path.join(rootDir, "uploads");
const publicDir = path.join(rootDir, "dist");
const backgroundsDir = path.join(rootDir, "public", "backgrounds");
const configPath = path.join(rootDir, "config", "wedding.json");

fs.mkdirSync(uploadsDir, { recursive: true });

// Load .env without external dependencies
function loadEnv() {
  try {
    const lines = fs
      .readFileSync(path.join(rootDir, ".env"), "utf8")
      .split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {}
}
loadEnv();

const UPLOAD_SECRET = process.env.UPLOAD_SECRET || "";
if (!UPLOAD_SECRET)
  console.warn("[security] UPLOAD_SECRET not set — photo URLs are insecure");

// Derive 32-byte AES key from UPLOAD_SECRET
const CIPHER_KEY = crypto
  .createHash("sha256")
  .update(UPLOAD_SECRET || "insecure-default")
  .digest();

// Encrypt filename → URL-safe token (AES-256-GCM, random IV each call)
function encryptFilename(filename) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", CIPHER_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(filename, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

// Decrypt token → filename; returns null if invalid/tampered
function decryptToken(token) {
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", CIPHER_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    return null;
  }
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function readConfig() {
  const fallback = {
    coupleName: "HAN & YU",
    weddingDate: "2026.05.22",
    tagline: "Wedding Photo Booth",
    countdownSeconds: 3,
    publicBaseUrl: "",
    theme: {
      primary: "#f28ca8",
      secondary: "#fff4f7",
      ink: "#49333a",
    },
  };

  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(configPath, "utf8")) };
  } catch {
    return fallback;
  }
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function safeJoin(baseDir, requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const cleanPath = decoded.replace(/^[/\\]+/, "");
  const filePath = path.normalize(path.join(baseDir, cleanPath));
  return filePath.startsWith(baseDir) ? filePath : null;
}

function serveFile(res, filePath, options = {}) {
  if (
    !filePath ||
    !fs.existsSync(filePath) ||
    !fs.statSync(filePath).isFile()
  ) {
    sendText(res, 404, "Not found.");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const headers = {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
  };

  if (options.disposition) {
    headers["Content-Disposition"] = options.disposition;
  }

  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildViewPage({ filename, rawToken, isVideo, config, gifToken, gifFilename }) {
  const photoUrl = `/photos/${encodeURIComponent(rawToken)}`;
  const gifUrl = gifToken ? `/photos/${encodeURIComponent(gifToken)}` : null;
  const safeFile = escHtml(filename);
  const safeName = escHtml(config.coupleName || "Jim & Camilla");
  const safeDate = escHtml(config.weddingDate || "");
  const safeTag = escHtml(config.tagline || "Wedding Photo Booth");
  const safePink = escHtml((config.theme && config.theme.primary) || "#f28ca8");
  const btnLabel = isVideo ? "儲存影片到相簿" : "長按圖片儲存 / 分享";
  const hintText = isVideo
    ? "點按後選「儲存影片」存到相簿，再上傳 IG 限動或傳 LINE。"
    : "長按圖片選「儲存影像」存到相簿，或點下方按鈕分享。";

  const mediaEl = isVideo
    ? `<video id="mainVideo" src="${escHtml(photoUrl)}" autoplay loop muted playsinline preload="auto" style="width:100%;display:block;border-radius:14px;"></video>`
    : `<img id="mainImg" src="${escHtml(photoUrl)}" alt="wedding photo" style="width:100%;display:block;border-radius:14px;">`;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta property="og:title" content="${safeName} 婚禮拍照">
<meta property="og:type" content="website">
<meta property="og:description" content="${safeTag} · ${safeDate}">
<title>${safeName} · ${safeTag}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(ellipse at 50% 35%,#241712 0%,#140d09 75%,#0a0605 100%);
  color:#F4EAD6;font-family:-apple-system,"Helvetica Neue",sans-serif;
  min-height:100dvh;display:flex;flex-direction:column;align-items:center;
  justify-content:center;padding:24px 16px;gap:16px;text-align:center}
.label{font-size:.72rem;letter-spacing:.38em;color:#C9AE84;text-transform:uppercase}
.couple{font-size:1.45rem;font-weight:700;letter-spacing:.08em;color:#FBF4E6}

/* Loading box */
#loadingBox{display:flex;flex-direction:column;align-items:center;gap:14px;
  width:100%;max-width:320px}
.ld-ring{width:52px;height:52px;border-radius:50%;
  border:3px solid rgba(228,201,126,.2);border-top-color:#E4C97E;
  animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.ld-label{font-size:.78rem;letter-spacing:.32em;color:#C9AE84}
.ld-track{width:200px;height:4px;background:rgba(228,201,126,.18);border-radius:999px;overflow:hidden}
.ld-bar{height:100%;width:0%;background:linear-gradient(90deg,#BD9A4E,#E4C97E);
  border-radius:999px;transition:width .3s ease}
.ld-pct{font-size:.72rem;color:#937659;font-variant-numeric:tabular-nums;min-width:3ch}

/* Media */
.media{max-width:360px;width:100%;border-radius:14px;overflow:hidden;
  box-shadow:0 36px 70px -28px rgba(0,0,0,.82);display:none}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.media.ready{display:block;animation:fadeUp .45s ease}

/* Buttons */
.save-btn{background:linear-gradient(180deg,#E4C97E,#8C6E32);color:#3a2c12;
  border:none;border-radius:999px;padding:15px 0;font-size:1rem;font-weight:700;
  cursor:pointer;width:100%;max-width:360px;-webkit-tap-highlight-color:transparent;
  box-shadow:0 12px 26px -10px rgba(0,0,0,.65);letter-spacing:.18em}
.save-btn:disabled{opacity:.55;cursor:wait}
.hint{font-size:.78rem;color:#937659;max-width:300px;line-height:1.65}
.open-safari{display:none;background:rgba(244,234,214,.08);
  border:1px solid rgba(228,201,126,.3);border-radius:999px;
  padding:11px 0;font-size:.88rem;color:#F4EAD6;cursor:pointer;
  width:100%;max-width:360px}
.gif-btn{display:none;background:rgba(244,234,214,.08);
  border:1.5px solid rgba(228,201,126,.45);border-radius:999px;
  padding:13px 0;font-size:.95rem;font-weight:700;color:#E4C97E;cursor:pointer;
  width:100%;max-width:360px;letter-spacing:.18em;
  -webkit-tap-highlight-color:transparent}
.gif-btn:disabled{opacity:.55;cursor:wait}
</style>
</head>
<body>
<p class="label">${safeTag}</p>
<p class="couple">${safeName}</p>

<div id="loadingBox">
  <div class="ld-ring"></div>
  <div class="ld-track"><div class="ld-bar" id="ldBar"></div></div>
  <div class="ld-label">載 入 中 &nbsp;<span id="ldPct">0%</span></div>
</div>

<div class="media" id="mediaWrap">${mediaEl}</div>

<button class="save-btn" id="saveBtn" style="display:none">${btnLabel}</button>
${gifUrl ? `<button class="gif-btn" id="gifBtn">下載 GIF 動圖</button>` : ""}
<button class="open-safari" id="safariBtn">在 Safari 中開啟</button>
<p class="hint" id="hint" style="display:none">${hintText}</p>

<script>
(function(){
  var PHOTO_URL = ${JSON.stringify(photoUrl)};
  var FILENAME  = ${JSON.stringify(filename)};
  var IS_VIDEO  = ${isVideo};
  var loadBox = document.getElementById('loadingBox');
  var mediaWrap = document.getElementById('mediaWrap');
  var saveBtn = document.getElementById('saveBtn');
  var hint = document.getElementById('hint');
  var safBtn = document.getElementById('safariBtn');
  var ldBar = document.getElementById('ldBar');
  var ldPct = document.getElementById('ldPct');

  function showMedia() {
    loadBox.style.display = 'none';
    mediaWrap.classList.add('ready');
    saveBtn.style.display = 'block';
    hint.style.display = 'block';
    var gb = document.getElementById('gifBtn');
    if (gb) gb.style.display = 'block';
  }

  function setProgress(pct) {
    var p = Math.min(Math.round(pct), 100);
    ldBar.style.width = p + '%';
    ldPct.textContent = p + '%';
  }

  if (IS_VIDEO) {
    var vid = document.getElementById('mainVideo');
    // Track buffering progress
    function onProgress() {
      if (vid.buffered.length > 0 && vid.duration) {
        setProgress(vid.buffered.end(vid.buffered.length - 1) / vid.duration * 100);
      }
    }
    vid.addEventListener('progress', onProgress);
    vid.addEventListener('timeupdate', onProgress);
    vid.addEventListener('canplay', function onReady() {
      vid.removeEventListener('canplay', onReady);
      setProgress(100);
      setTimeout(showMedia, 120);
    });
    vid.addEventListener('error', function() {
      ldPct.textContent = '載入失敗';
      loadBox.querySelector('.ld-ring').style.display = 'none';
    });
  } else {
    var img = document.getElementById('mainImg');
    img.addEventListener('load', function() {
      setProgress(100);
      setTimeout(showMedia, 80);
    });
    img.addEventListener('error', function() {
      ldPct.textContent = '載入失敗';
    });
    // If already cached / fast load
    if (img.complete && img.naturalWidth) { setProgress(100); showMedia(); }
  }

  // LINE / WeChat in-app browser
  var ua = navigator.userAgent || '';
  var inApp = /Line|MicroMessenger|FBAV|Instagram/.test(ua);
  if (inApp) {
    safBtn.style.display = 'block';
    hint.textContent = '請點「在 Safari 中開啟」後，再點「儲存影片」。';
  }
  safBtn.addEventListener('click', function(){ window.open(location.href, '_blank'); });

  saveBtn.addEventListener('click', async function(){
    saveBtn.disabled = true;
    saveBtn.textContent = '載入中...';
    try {
      var res  = await fetch(PHOTO_URL);
      var blob = await res.blob();
      var file = new File([blob], FILENAME, { type: IS_VIDEO ? 'video/mp4' : 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '${safeName} 婚禮影片' });
      } else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = FILENAME;
        a.click();
      }
    } catch(e) {
      if (e.name !== 'AbortError') {
        hint.textContent = '請在 Safari 中開啟此頁面再儲存。';
        safBtn.style.display = 'block';
      }
    }
    saveBtn.disabled = false;
    saveBtn.textContent = ${JSON.stringify(btnLabel)};
  });

  var GIF_URL = ${JSON.stringify(gifUrl)};
  var GIF_FILENAME = ${JSON.stringify(gifFilename || "photo.gif")};
  var gifBtn = document.getElementById('gifBtn');
  if (gifBtn && GIF_URL) {
    gifBtn.addEventListener('click', async function(){
      gifBtn.disabled = true;
      gifBtn.textContent = '載入中...';
      try {
        var res  = await fetch(GIF_URL);
        var blob = await res.blob();
        var file = new File([blob], GIF_FILENAME, { type: 'image/gif' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '${safeName} 婚禮 GIF' });
        } else {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = GIF_FILENAME;
          a.click();
        }
      } catch(e) {
        if (e.name !== 'AbortError') {
          hint.textContent = '請在 Safari 中開啟此頁面再儲存。';
          safBtn.style.display = 'block';
        }
      }
      gifBtn.disabled = false;
      gifBtn.textContent = '下載 GIF 動圖';
    });
  }
})();
</script>
</body>
</html>`;
}

// Range-request-aware video serving (required by iOS Safari for <video> playback)
function serveVideoFile(req, res, filePath, contentType, options = {}) {
  if (
    !filePath ||
    !fs.existsSync(filePath) ||
    !fs.statSync(filePath).isFile()
  ) {
    sendText(res, 404, "Not found.");
    return;
  }
  const fileSize = fs.statSync(filePath).size;
  const rangeHeader = req.headers.range;
  const headers = { "Content-Type": contentType, "Accept-Ranges": "bytes" };
  if (options.disposition) headers["Content-Disposition"] = options.disposition;

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    let start = match && match[1] ? parseInt(match[1], 10) : 0;
    let end = match && match[2] ? parseInt(match[2], 10) : fileSize - 1;
    // Clamp to valid file bounds
    start = Math.max(0, Math.min(start, fileSize - 1));
    end = Math.max(start, Math.min(end, fileSize - 1));
    const chunkSize = end - start + 1;
    headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
    headers["Content-Length"] = chunkSize;
    res.writeHead(206, headers);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    headers["Content-Length"] = fileSize;
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  }
}

function getOrigin(req) {
  const configured = process.env.PUBLIC_BASE_URL || readConfig().publicBaseUrl;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function safeLayoutName(value) {
  const cleaned = String(value || "photo")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  return cleaned.replace(/-+/g, "-").replace(/^-|-$/g, "") || "photo";
}

function readRequestBody(req, maxBytes = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Convert any video to H.264 MP4 with moov atom at front (faststart).
// Required for LINE preview and IG compatibility.
// Silently skips if ffmpeg is not installed.
async function convertVideoToMp4(inputPath, outputPath) {
  await execFileAsync(
    "ffmpeg",
    [
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-profile:v",
      "baseline",
      "-level",
      "3.1",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      "-y",
      outputPath,
    ],
    { timeout: 60_000 },
  );
}

async function handlePhotoUpload(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const layout = url.searchParams.get("layout") || "photo";
  const contentType = (req.headers["content-type"] || "").split(";")[0].trim();

  const allowedTypes = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  const ext = allowedTypes[contentType];
  if (!ext) {
    sendJson(res, 400, {
      error:
        "Only image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm are accepted.",
    });
    return;
  }

  const isVideo = ext === "mp4" || ext === "webm";
  const buffer = await readRequestBody(
    req,
    isVideo ? 100 * 1024 * 1024 : 30 * 1024 * 1024,
  );
  if (buffer.length < 100) {
    sendJson(res, 400, { error: "File is too small or empty." });
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = crypto.randomBytes(4).toString("hex");

  // For video: raw upload gets .raw.EXT to avoid same-path collision when input is already .mp4
  const rawFilename = isVideo
    ? `${date}_${safeLayoutName(layout)}_${timestamp}_${random}.raw.${ext}`
    : `${date}_${safeLayoutName(layout)}_${timestamp}_${random}.${ext}`;
  const finalFilename = `${date}_${safeLayoutName(layout)}_${timestamp}_${random}.mp4`;

  const rawPath = path.join(uploadsDir, rawFilename);
  fs.writeFileSync(rawPath, buffer);

  let savedFilename = rawFilename;

  if (isVideo) {
    const mp4Path = path.join(uploadsDir, finalFilename);
    try {
      await convertVideoToMp4(rawPath, mp4Path);
      fs.unlinkSync(rawPath);
      savedFilename = finalFilename;
    } catch (err) {
      // ffmpeg not installed or failed — keep raw file, warn operator
      console.warn(
        "[video] ffmpeg conversion skipped:",
        err.message.split("\n")[0],
      );
    }
  }

  const token = encryptFilename(savedFilename);

  sendJson(res, 201, {
    id: path.parse(savedFilename).name,
    filename: savedFilename,
    token,
    downloadUrl: `${getOrigin(req)}/photos/${token}`,
  });
}

// ── GIF compositing helpers ──────────────────────────────────────────────────

function scaleImage(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH * 4);
  const sx = srcW / dstW,
    sy = srcH / dstH;
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const sxf = dx * sx,
        syf = dy * sy;
      const x0 = Math.min(Math.floor(sxf), srcW - 1),
        x1 = Math.min(x0 + 1, srcW - 1);
      const y0 = Math.min(Math.floor(syf), srcH - 1),
        y1 = Math.min(y0 + 1, srcH - 1);
      const fx = sxf - x0,
        fy = syf - y0;
      const w00 = (1 - fx) * (1 - fy),
        w10 = fx * (1 - fy),
        w01 = (1 - fx) * fy,
        w11 = fx * fy;
      const i00 = (y0 * srcW + x0) * 4,
        i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4,
        i11 = (y1 * srcW + x1) * 4;
      const di = (dy * dstW + dx) * 4;
      for (let c = 0; c < 4; c++)
        dst[di + c] = Math.round(
          src[i00 + c] * w00 +
            src[i10 + c] * w10 +
            src[i01 + c] * w01 +
            src[i11 + c] * w11,
        );
    }
  }
  return dst;
}

function blitCover(src, srcW, srcH, dst, dstW, dstX, dstY, zoneW, zoneH) {
  const srcRatio = srcW / srcH;
  const dstRatio = zoneW / zoneH;
  let cropX = 0,
    cropY = 0,
    cropW = srcW,
    cropH = srcH;
  if (srcRatio > dstRatio) {
    cropW = Math.round(srcH * dstRatio);
    cropX = Math.round((srcW - cropW) / 2);
  } else {
    cropH = Math.round(srcW / dstRatio);
    cropY = Math.round((srcH - cropH) / 2);
  }
  const scaleX = cropW / zoneW;
  const scaleY = cropH / zoneH;
  for (let dy = 0; dy < zoneH; dy++) {
    for (let dx = 0; dx < zoneW; dx++) {
      const sxf = cropX + dx * scaleX;
      const syf = cropY + dy * scaleY;
      const x0 = Math.min(Math.floor(sxf), srcW - 1);
      const y0 = Math.min(Math.floor(syf), srcH - 1);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const y1 = Math.min(y0 + 1, srcH - 1);
      const fx = sxf - x0;
      const fy = syf - y0;
      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;
      const di = ((dstY + dy) * dstW + (dstX + dx)) * 4;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      dst[di] = Math.round(
        src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11,
      );
      dst[di + 1] = Math.round(
        src[i00 + 1] * w00 +
          src[i10 + 1] * w10 +
          src[i01 + 1] * w01 +
          src[i11 + 1] * w11,
      );
      dst[di + 2] = Math.round(
        src[i00 + 2] * w00 +
          src[i10 + 2] * w10 +
          src[i01 + 2] * w01 +
          src[i11 + 2] * w11,
      );
    }
  }
}

// Separable box blur (2-pass, radius 1) — reduces video noise before GIF quantization
function blurRGBA(src, w, h) {
  const tmp = new Uint8ClampedArray(src.length);
  // horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const l = x > 0 ? i - 4 : i;
      const r = x < w - 1 ? i + 4 : i;
      tmp[i] = (src[l] + src[i] + src[r]) / 3;
      tmp[i + 1] = (src[l + 1] + src[i + 1] + src[r + 1]) / 3;
      tmp[i + 2] = (src[l + 2] + src[i + 2] + src[r + 2]) / 3;
      tmp[i + 3] = 255;
    }
  }
  // vertical pass back into src
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const u = y > 0 ? i - w * 4 : i;
      const d = y < h - 1 ? i + w * 4 : i;
      src[i] = (tmp[u] + tmp[i] + tmp[d]) / 3;
      src[i + 1] = (tmp[u + 1] + tmp[i + 1] + tmp[d + 1]) / 3;
      src[i + 2] = (tmp[u + 2] + tmp[i + 2] + tmp[d + 2]) / 3;
      src[i + 3] = 255;
    }
  }
}

function alphaOver(dst, dstW, overlay, overlayW, overlayH) {
  for (let y = 0; y < overlayH; y++) {
    for (let x = 0; x < overlayW; x++) {
      const si = (y * overlayW + x) * 4;
      const di = (y * dstW + x) * 4;
      const a = overlay[si + 3] / 255;
      if (a === 0) continue;
      dst[di] = Math.round(overlay[si] * a + dst[di] * (1 - a));
      dst[di + 1] = Math.round(overlay[si + 1] * a + dst[di + 1] * (1 - a));
      dst[di + 2] = Math.round(overlay[si + 2] * a + dst[di + 2] * (1 - a));
    }
  }
}

// POST /api/gif/frame?session=<id>&clip=<n>&frame=<n>
// Body: image/jpeg (single frame from HQ recording)
async function handleGifFrameUpload(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const session = url.searchParams.get("session") || "";
  const clip = parseInt(url.searchParams.get("clip") || "-1");
  const frame = parseInt(url.searchParams.get("frame") || "-1");

  if (
    !/^[a-zA-Z0-9_-]{8,64}$/.test(session) ||
    clip < 0 ||
    clip > 20 ||
    frame < 0 ||
    frame > 60
  ) {
    sendJson(res, 400, { error: "Invalid params" });
    return;
  }

  const buffer = await readRequestBody(req, 2 * 1024 * 1024);
  const framePath = path.join(
    uploadsDir,
    `frame_${session}_${clip}_${String(frame).padStart(3, "0")}.jpg`,
  );
  fs.writeFileSync(framePath, buffer);
  sendJson(res, 200, { ok: true });
}

// POST /api/gif/frames-batch?session=<id>&clip=<n>
// Body: [uint32BE frameCount] then per frame [uint32BE byteLength][jpeg bytes]
// Writes the same frame_<session>_<clip>_<idx>.jpg files as the per-frame endpoint,
// but in ONE request — kills per-request RTT overhead over tunnels.
async function handleGifFrameBatchUpload(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const session = url.searchParams.get("session") || "";
  const clip = parseInt(url.searchParams.get("clip") || "-1");

  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(session) || clip < 0 || clip > 20) {
    sendJson(res, 400, { error: "Invalid params" });
    return;
  }

  const buffer = await readRequestBody(req, 8 * 1024 * 1024);
  if (buffer.length < 4) {
    sendJson(res, 400, { error: "Bad payload" });
    return;
  }
  const count = buffer.readUInt32BE(0);
  if (count < 1 || count > 60) {
    sendJson(res, 400, { error: "Bad frame count" });
    return;
  }
  let off = 4;
  for (let i = 0; i < count; i++) {
    if (off + 4 > buffer.length) {
      sendJson(res, 400, { error: "Truncated payload" });
      return;
    }
    const len = buffer.readUInt32BE(off);
    off += 4;
    if (len < 1 || len > 2 * 1024 * 1024 || off + len > buffer.length) {
      sendJson(res, 400, { error: "Truncated payload" });
      return;
    }
    fs.writeFileSync(
      path.join(
        uploadsDir,
        `frame_${session}_${clip}_${String(i).padStart(3, "0")}.jpg`,
      ),
      buffer.subarray(off, off + len),
    );
    off += len;
  }
  sendJson(res, 200, { ok: true, frames: count });
}

// POST /api/gif/clip?session=<id>&idx=<n>
// Body: image/gif (single compressed clip)
async function handleGifClipUpload(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const session = url.searchParams.get("session") || "";
  const idx = parseInt(url.searchParams.get("idx") || "-1");

  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(session) || idx < 0 || idx > 20) {
    sendJson(res, 400, { error: "Invalid params" });
    return;
  }

  const buffer = await readRequestBody(req, 10 * 1024 * 1024);
  const clipPath = path.join(uploadsDir, `clip_${session}_${idx}.gif`);
  fs.writeFileSync(clipPath, buffer);
  sendJson(res, 200, { ok: true });
}

// Encode RGBA frames to GIF via ffmpeg palettegen/paletteuse.
// Native encode is ~10x faster than pure-JS NeuQuant; sierra2_4a dithering
// avoids the face color-banding that made gifenc unusable.
function encodeGifFfmpeg(frames, w, h, fps) {
  return new Promise((resolve, reject) => {
    const tmpOut = path.join(
      uploadsDir,
      `tmp_gif_${crypto.randomBytes(6).toString("hex")}.gif`,
    );
    const proc = spawn(
      "ffmpeg",
      [
        "-f", "rawvideo",
        "-pix_fmt", "rgba",
        "-s", `${w}x${h}`,
        "-r", String(fps),
        "-i", "pipe:0",
        "-filter_complex",
        "split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a",
        "-loop", "0",
        "-y", tmpOut,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d; });
    proc.on("error", reject); // ffmpeg not installed
    proc.on("close", (code) => {
      if (code !== 0) {
        fs.unlink(tmpOut, () => {});
        reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-300)}`));
        return;
      }
      try {
        const buf = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpOut);
        resolve(buf);
      } catch (err) {
        reject(err);
      }
    });
    proc.stdin.on("error", () => {}); // EPIPE if ffmpeg dies early — close handler reports
    for (const f of frames) {
      proc.stdin.write(Buffer.from(f.buffer, f.byteOffset, f.byteLength));
    }
    proc.stdin.end();
  });
}

// Encode RGBA frames to a looped H.264 MP4 (IG Stories can't animate GIFs —
// guests need a video file to post an animated story).
function encodeMp4FromFrames(frames, w, h, fps, loops = 4) {
  return new Promise((resolve, reject) => {
    const tmpOut = path.join(
      uploadsDir,
      `tmp_mp4_${crypto.randomBytes(6).toString("hex")}.mp4`,
    );
    const proc = spawn(
      "ffmpeg",
      [
        "-f", "rawvideo",
        "-pix_fmt", "rgba",
        "-s", `${w}x${h}`,
        "-r", String(fps),
        "-i", "pipe:0",
        // h264 requires even dimensions
        "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
        "-c:v", "libx264",
        "-profile:v", "baseline",
        "-level", "3.1",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        "-y", tmpOut,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d; });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        fs.unlink(tmpOut, () => {});
        reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-300)}`));
        return;
      }
      try {
        const buf = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpOut);
        resolve(buf);
      } catch (err) {
        reject(err);
      }
    });
    proc.stdin.on("error", () => {});
    for (let l = 0; l < loops; l++) {
      for (const f of frames) {
        proc.stdin.write(Buffer.from(f.buffer, f.byteOffset, f.byteLength));
      }
    }
    proc.stdin.end();
  });
}

// Compose 3 GIF variants from JPEG frames uploaded by HQ mode
async function composeGifFromJpegFrames(
  sessionId,
  layoutId,
  layoutW,
  layoutH,
  zones,
) {
  // Collect frame files for this session
  const allFiles = fs
    .readdirSync(uploadsDir)
    .filter((f) => f.startsWith(`frame_${sessionId}_`) && f.endsWith(".jpg"));

  const clipFrameMap = new Map();
  for (const f of allFiles) {
    const m = f.match(/^frame_[^_]+_(\d+)_(\d+)\.jpg$/);
    if (!m) continue;
    const clipIdx = parseInt(m[1]);
    const frameIdx = parseInt(m[2]);
    if (!clipFrameMap.has(clipIdx)) clipFrameMap.set(clipIdx, []);
    clipFrameMap.get(clipIdx).push({ frameIdx, file: f });
  }
  for (const frames of clipFrameMap.values()) {
    frames.sort((a, b) => a.frameIdx - b.frameIdx);
  }

  // Decode JPEG frames per zone
  const clips = zones.map((_, i) => {
    const frameList = clipFrameMap.get(i) || [];
    if (!frameList.length) return { frames: [], w: 720, h: 960 };
    const decoded = frameList.map(({ file }) => {
      const buf = fs.readFileSync(path.join(uploadsDir, file));
      return jpeg.decode(buf, { useTArray: true });
    });
    return {
      frames: decoded.map((d) => d.data),
      w: decoded[0].width,
      h: decoded[0].height,
    };
  });

  const actualClipW = clips.find((c) => c.frames.length > 0)?.w || 720;
  const actualClipH = clips.find((c) => c.frames.length > 0)?.h || 960;
  const maxZoneW = zones.reduce((m, z) => Math.max(m, z.w), 0) || actualClipW;

  const overlayPath = path.join(rootDir, "public", "frames", `${layoutId}.png`);
  const overlayPng = fs.existsSync(overlayPath)
    ? PNG.sync.read(fs.readFileSync(overlayPath))
    : null;

  const variants = [
    // high: NeuQuant 256色, capped at 720px wide — phones can't tell, encode is ~5-9x faster
    {
      name: "high",
      quality: 10,
      applyBlur: false,
      virtualClipW: actualClipW,
      maxOutW: 720,
      fps: 10,
      colors: 256,
      useGifenc: false,
    },
    // opt disabled — gifenc causes color banding on faces; keep for future research
    // { name: "opt", quality: 10, applyBlur: false, virtualClipW: actualClipW, maxOutW: 700, fps: 8, colors: 256, useGifenc: true },
  ];

  const results = {};
  let mp4Src = null; // reuse the 'high' variant's composed frames for the IG MP4

  for (const {
    name,
    quality,
    applyBlur,
    virtualClipW,
    maxOutW,
    fps,
    colors,
    useGifenc,
  } of variants) {
    const virtualClipH = Math.round((actualClipH * virtualClipW) / actualClipW);
    const GIF_MAX_W = Math.min(
      maxOutW || layoutW,
      Math.floor((virtualClipW * layoutW) / maxZoneW),
    );
    const scale = Math.min(GIF_MAX_W / layoutW, 1);
    const gifW = Math.round(layoutW * scale);
    const gifH = Math.round(layoutH * scale);
    const frameDelay = Math.round(1000 / fps);

    const overlayScaled = overlayPng
      ? scaleImage(
          overlayPng.data,
          overlayPng.width,
          overlayPng.height,
          gifW,
          gifH,
        )
      : null;

    const maxFrames = Math.max(...clips.map((c) => c.frames.length), 1);

    // Build all GIF frame pixel buffers
    const gifFrames = [];
    for (let f = 0; f < maxFrames; f++) {
      const frame = new Uint8ClampedArray(gifW * gifH * 4).fill(255);

      for (let z = 0; z < zones.length; z++) {
        const clip = clips[z];
        if (!clip.frames.length) continue;
        const rawData = clip.frames[f % clip.frames.length];

        let srcData, srcW, srcH;
        if (virtualClipW < actualClipW || applyBlur) {
          srcW = virtualClipW;
          srcH = virtualClipH;
          const scaled = scaleImage(
            rawData,
            actualClipW,
            actualClipH,
            srcW,
            srcH,
          );
          srcData = new Uint8ClampedArray(scaled);
          if (applyBlur) blurRGBA(srcData, srcW, srcH);
        } else {
          srcData = new Uint8ClampedArray(rawData);
          srcW = actualClipW;
          srcH = actualClipH;
        }

        const zone = zones[z];
        const dstX = Math.round(zone.x * scale);
        const dstY = Math.round(zone.y * scale);
        const zoneW = Math.round(zone.w * scale);
        const zoneH = Math.round(zone.h * scale);
        blitCover(srcData, srcW, srcH, frame, gifW, dstX, dstY, zoneW, zoneH);
      }

      if (overlayScaled) alphaOver(frame, gifW, overlayScaled, gifW, gifH);
      gifFrames.push(frame);
    }

    let gifBuffer = null;
    try {
      gifBuffer = await encodeGifFfmpeg(gifFrames, gifW, gifH, fps);
    } catch (err) {
      console.warn("[gif] ffmpeg encode unavailable, using JS encoder:", err.message);
    }
    if (gifBuffer) {
      // done — native path
    } else if (useGifenc) {
      // gifenc: Wu color quantization — better palette than NeuQuant, especially for photos
      const enc = GifencEncoder();
      for (let f = 0; f < gifFrames.length; f++) {
        const palette = gifencQuantize(gifFrames[f], colors);
        const index = gifencApplyPalette(gifFrames[f], palette);
        enc.writeFrame(index, gifW, gifH, {
          palette,
          delay: frameDelay,
          repeat: f === 0 ? 0 : undefined,
        });
      }
      enc.finish();
      gifBuffer = Buffer.from(enc.bytes());
    } else {
      const encoder = new GIFEncoder(gifW, gifH);
      encoder.setRepeat(0);
      encoder.setDelay(frameDelay);
      encoder.setQuality(quality);
      encoder.start();
      for (const frame of gifFrames) encoder.addFrame(frame);
      encoder.finish();
      gifBuffer = Buffer.from(encoder.out.getData());
    }

    const date = new Date().toISOString().slice(0, 10);
    const random = crypto.randomBytes(4).toString("hex");
    const filename = `${date}_${safeLayoutName(layoutId)}_gif_${name}_${random}.gif`;
    fs.writeFileSync(path.join(uploadsDir, filename), gifBuffer);
    results[name] = { token: encryptFilename(filename), filename };

    if (name === "high") mp4Src = { frames: gifFrames, w: gifW, h: gifH, fps };
  }

  // IG Stories variant: animated GIFs post as static images — provide MP4
  if (mp4Src) {
    try {
      const mp4Buffer = await encodeMp4FromFrames(
        mp4Src.frames,
        mp4Src.w,
        mp4Src.h,
        mp4Src.fps,
        4,
      );
      const date = new Date().toISOString().slice(0, 10);
      const random = crypto.randomBytes(4).toString("hex");
      const filename = `${date}_${safeLayoutName(layoutId)}_gif_story_${random}.mp4`;
      fs.writeFileSync(path.join(uploadsDir, filename), mp4Buffer);
      results.mp4 = { token: encryptFilename(filename), filename };
    } catch (err) {
      console.warn("[gif] MP4 story variant skipped:", err.message);
    }
  }

  // Cleanup JPEG frame files
  for (const f of allFiles) {
    fs.unlink(path.join(uploadsDir, f), () => {});
  }

  return results;
}

// POST /api/gif/compose
// Body JSON: { sessionId, layoutId, layoutW, layoutH, zones, mode? }
async function handleGifCompose(req, res) {
  try {
    const bodyBuf = await readRequestBody(req, 1024 * 1024);
    const { sessionId, layoutId, layoutW, layoutH, zones, mode } = JSON.parse(
      bodyBuf.toString("utf8"),
    );

    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(sessionId)) {
      sendJson(res, 400, { error: "Invalid session" });
      return;
    }

    // JPEG multi-mode path
    if (mode === "jpeg") {
      const results = await composeGifFromJpegFrames(
        sessionId,
        layoutId,
        layoutW,
        layoutH,
        zones,
      );
      const origin = getOrigin(req);
      const response = {};
      for (const [key, val] of Object.entries(results)) {
        response[key] = {
          token: val.token,
          filename: val.filename,
          downloadUrl: `${origin}/photos/${val.token}`,
        };
      }
      sendJson(res, 201, response);
      return;
    }

    // Decode clip GIFs
    const clips = zones.map((_, i) => {
      const p = path.join(uploadsDir, `clip_${sessionId}_${i}.gif`);
      if (!fs.existsSync(p)) {
        console.warn(`[gif] missing clip ${i}`);
        return { frames: [], w: 180, h: 240 };
      }
      const buf = fs.readFileSync(p);
      const gr = new omggif.GifReader(buf);
      const n = gr.numFrames();
      const info = gr.frameInfo(0);
      const fw = info.width,
        fh = info.height;
      const frames = Array.from({ length: n }, (_, f) => {
        const px = new Uint8Array(fw * fh * 4);
        gr.decodeAndBlitFrameRGBA(f, px);
        return px;
      });
      return { frames, w: fw, h: fh };
    });

    // Load overlay PNG
    const overlayPath = path.join(
      rootDir,
      "public",
      "frames",
      `${layoutId}.png`,
    );
    let overlayScaled = null;
    const maxZoneW = zones.reduce((m, z) => Math.max(m, z.w), 0);
    const clipW = clips.find((c) => c.frames.length > 0)?.w || 480;
    const GIF_MAX_W = Math.min(
      layoutW,
      Math.floor((clipW * layoutW) / (maxZoneW || clipW)),
    );
    const scale = Math.min(GIF_MAX_W / layoutW, 1);
    const gifW = Math.round(layoutW * scale);
    const gifH = Math.round(layoutH * scale);

    if (fs.existsSync(overlayPath)) {
      const png = PNG.sync.read(fs.readFileSync(overlayPath));
      overlayScaled = scaleImage(png.data, png.width, png.height, gifW, gifH);
    }

    // Encode GIF frames
    const maxFrames = Math.max(...clips.map((c) => c.frames.length), 1);
    const encoder = new GIFEncoder(gifW, gifH);
    encoder.setRepeat(0);
    encoder.setDelay(100);
    encoder.setQuality(1);
    encoder.start();

    for (let f = 0; f < maxFrames; f++) {
      const frame = new Uint8ClampedArray(gifW * gifH * 4).fill(255);

      for (let z = 0; z < zones.length; z++) {
        const clip = clips[z];
        if (!clip.frames.length) continue;
        const rawFrame = clip.frames[f % clip.frames.length];
        const smoothed = new Uint8ClampedArray(rawFrame);
        blurRGBA(smoothed, clip.w, clip.h);
        const zone = zones[z];
        const dstX = Math.round(zone.x * scale);
        const dstY = Math.round(zone.y * scale);
        const zoneW = Math.round(zone.w * scale);
        const zoneH = Math.round(zone.h * scale);
        blitCover(
          smoothed,
          clip.w,
          clip.h,
          frame,
          gifW,
          dstX,
          dstY,
          zoneW,
          zoneH,
        );
      }

      if (overlayScaled) alphaOver(frame, gifW, overlayScaled, gifW, gifH);
      encoder.addFrame(frame);
    }

    encoder.finish();
    const gifBuffer = Buffer.from(encoder.out.getData());

    const date = new Date().toISOString().slice(0, 10);
    const random = crypto.randomBytes(4).toString("hex");
    const filename = `${date}_${safeLayoutName(layoutId)}_gif_${random}.gif`;
    fs.writeFileSync(path.join(uploadsDir, filename), gifBuffer);
    const token = encryptFilename(filename);

    zones.forEach((_, i) => {
      fs.unlink(path.join(uploadsDir, `clip_${sessionId}_${i}.gif`), () => {});
    });

    sendJson(res, 201, {
      token,
      filename,
      downloadUrl: `${getOrigin(req)}/photos/${token}`,
    });
  } catch (err) {
    console.error("[gif/compose]", err);
    sendJson(res, 500, { error: String(err.message || err) });
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/debug") {
    if (process.env.DEBUG !== "true") {
      res.writeHead(204).end();
      return;
    }
    let body = "";
    req.on("data", (c) => {
      body += c;
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const ts = new Date().toISOString().slice(11, 23);
        const entries = Object.entries(data);
        const lines = [];
        for (let i = 0; i < entries.length; i += 5) {
          lines.push(
            entries
              .slice(i, i + 5)
              .map(([k, v]) => `${k}:${v}`)
              .join("  "),
          );
        }
        console.log("\x1b[36m[DEBUG %s]\x1b[0m\n  %s", ts, lines.join("\n  "));
      } catch {
        console.log("[DEBUG] (invalid json)");
      }
      res.writeHead(204).end();
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/config") {
    const config = readConfig();
    sendJson(res, 200, {
      coupleName: config.coupleName,
      weddingDate: config.weddingDate,
      tagline: config.tagline,
      countdownSeconds: Number(config.countdownSeconds || 3),
      theme: config.theme,
      gifMode: config.gifMode || "low",
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/photos") {
    sendText(res, 404, "Not found.");
    return;
  }

  if (req.method === "GET" && pathname === "/api/backgrounds") {
    fs.mkdirSync(backgroundsDir, { recursive: true });
    const files = fs
      .readdirSync(backgroundsDir)
      .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
      .sort();
    const backgrounds = files.map((f) => ({
      filename: f,
      url: `/backgrounds/${encodeURIComponent(f)}`,
    }));
    sendJson(res, 200, { backgrounds });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/backgrounds/")) {
    const filename = path.basename(
      decodeURIComponent(pathname.replace("/backgrounds/", "")),
    );
    serveFile(res, path.join(backgroundsDir, filename));
    return;
  }

  if (req.method === "POST" && pathname === "/api/photos") {
    handlePhotoUpload(req, res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/gif/frame") {
    return handleGifFrameUpload(req, res);
  }

  if (req.method === "POST" && pathname === "/api/gif/frames-batch") {
    return handleGifFrameBatchUpload(req, res);
  }

  if (req.method === "POST" && pathname === "/api/gif/clip") {
    return handleGifClipUpload(req, res);
  }

  if (req.method === "POST" && pathname === "/api/gif/compose") {
    return handleGifCompose(req, res);
  }

  if (req.method === "GET" && pathname.startsWith("/view/")) {
    const rawToken = decodeURIComponent(pathname.replace("/view/", ""));
    const filename = decryptToken(rawToken);
    if (!filename) {
      sendText(res, 404, "Not found.");
      return;
    }
    const filePath = path.join(uploadsDir, path.basename(filename));
    if (!fs.existsSync(filePath)) {
      sendText(res, 404, "Not found.");
      return;
    }
    const ext = path.extname(filename).toLowerCase();
    const isVideo = ext === ".mp4" || ext === ".webm";
    const config = readConfig();
    // Optional companion GIF (GIF captures: QR carries mp4 + ?gif=<token>)
    const viewUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const gifRaw = viewUrl.searchParams.get("gif") || "";
    const gifFilename = gifRaw ? decryptToken(gifRaw) : null;
    const html = buildViewPage({
      filename: path.basename(filename),
      rawToken,
      isVideo,
      config,
      gifToken: gifFilename ? gifRaw : null,
      gifFilename: gifFilename ? path.basename(gifFilename) : null,
    });
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/photos/")) {
    const rawToken = decodeURIComponent(pathname.replace("/photos/", ""));
    const filename = decryptToken(rawToken);
    if (!filename) {
      sendText(res, 404, "Not found.");
      return;
    }
    const filePath = path.join(uploadsDir, path.basename(filename));
    const ext = path.extname(filePath).toLowerCase();
    const disposition = `inline; filename="${path.basename(filename)}"`;
    if (ext === ".mp4" || ext === ".webm") {
      serveVideoFile(req, res, filePath, contentTypes[ext], { disposition });
    } else {
      serveFile(res, filePath, { disposition });
    }
    return;
  }

  // SPA: serve static file from dist/ if it exists, otherwise React Router index.html fallback
  if (req.method === "GET") {
    const filePath = safeJoin(publicDir, pathname);
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveFile(res, filePath);
    } else {
      serveFile(res, path.join(publicDir, "index.html"));
    }
    return;
  }

  sendText(res, 405, "Method not allowed.");
}

const server = http.createServer((req, res) => {
  Promise.resolve(route(req, res)).catch((error) => {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error." });
  });
});

// ── Remote camera signaling: iPad (booth) ⇆ iPhone (camera) ──
// Single-pair model: latest booth socket + latest camera socket are linked.
// All non-hello messages are relayed verbatim to the counterpart.
const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({ server, path: "/ws" });
let boothWs = null;
let cameraWs = null;

function wsSend(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

// Terminate sockets that stop answering protocol pings (zombie TCP after network blip)
const WS_HEARTBEAT_MS = 25000;
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate(); // fires 'close' → peer gets peer-left
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, WS_HEARTBEAT_MS);

wss.on("connection", (ws) => {
  let role = null;
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    // App-level ping: reply directly (browsers can't send protocol pings)
    if (msg.type === "ping") {
      wsSend(ws, { type: "pong" });
      return;
    }
    if (msg.type === "hello") {
      role = msg.role === "booth" ? "booth" : "camera";
      ws.pairCode =
        typeof msg.pair === "string" ? msg.pair.slice(0, 16).toUpperCase() : "";
      if (role === "booth") {
        if (boothWs && boothWs !== ws) {
          wsSend(boothWs, { type: "replaced" });
          boothWs.close();
        }
        boothWs = ws;
        if (cameraWs) {
          if (boothWs.pairCode && boothWs.pairCode === cameraWs.pairCode) {
            wsSend(boothWs, { type: "peer-joined" });
            wsSend(cameraWs, { type: "peer-joined" });
          } else {
            // waiting camera doesn't match this booth — drop it
            const c = cameraWs;
            cameraWs = null;
            wsSend(c, { type: "pair-rejected" });
            c.close();
          }
        }
      } else {
        // Validate BEFORE taking the slot — a wrong code must never disturb
        // an active camera (zombie sockets / guests opening the URL).
        if (
          boothWs &&
          (!ws.pairCode || ws.pairCode !== boothWs.pairCode)
        ) {
          wsSend(ws, { type: "pair-rejected" });
          ws.close();
          return;
        }
        if (cameraWs && cameraWs !== ws) {
          // same code = legit takeover (page reload) — tell the old page to stop
          wsSend(cameraWs, { type: "replaced" });
          cameraWs.close();
        }
        cameraWs = ws;
        if (boothWs) {
          wsSend(boothWs, { type: "peer-joined" });
          wsSend(cameraWs, { type: "peer-joined" });
        }
      }
      return;
    }
    const peer = role === "booth" ? cameraWs : boothWs;
    wsSend(peer, msg);
  });
  ws.on("close", () => {
    if (role === "booth" && boothWs === ws) {
      boothWs = null;
      wsSend(cameraWs, { type: "peer-left" });
    }
    if (role === "camera" && cameraWs === ws) {
      cameraWs = null;
      wsSend(boothWs, { type: "peer-left" });
    }
  });
});

server.listen(port);
