import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { applyFilterToPixels } from './camera.js';

const CLIP_W = 480;
const CLIP_H = 640;
const CLIP_UPLOAD_W = 480;
const CLIP_UPLOAD_H = 640;
const HQ_CLIP_W = 720;
const HQ_CLIP_H = 960;
const FPS = 10;
const FRAME_DELAY = Math.round(1000 / FPS);
const MAX_CLIP_FRAMES = 15;
export const RECORD_MS = MAX_CLIP_FRAMES * FRAME_DELAY; // 1500ms

export function startClipRecorder(videoEl, filterId = 'none') {
  const offscreen = document.createElement('canvas');
  offscreen.width = CLIP_W;
  offscreen.height = CLIP_H;
  const ctx = offscreen.getContext('2d');
  const frames = [];

  function captureFrame() {
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    const srcRatio = vw / vh;
    const dstRatio = CLIP_W / CLIP_H;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (srcRatio > dstRatio) { sw = vh * dstRatio; sx = (vw - sw) / 2; }
    else { sh = vw / dstRatio; sy = (vh - sh) / 2; }

    ctx.setTransform(-1, 0, 0, 1, CLIP_W, 0);
    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, CLIP_W, CLIP_H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const imageData = ctx.getImageData(0, 0, CLIP_W, CLIP_H);
    applyFilterToPixels(imageData.data, filterId);
    frames.push(imageData.data.slice());
  }

  const intervalId = setInterval(captureFrame, FRAME_DELAY);
  captureFrame();

  return {
    stop() {
      clearInterval(intervalId);
      return frames.slice(-MAX_CLIP_FRAMES);
    },
  };
}

export function startClipRecorderHQ(videoEl, filterId = 'none') {
  const offscreen = document.createElement('canvas');
  offscreen.width = HQ_CLIP_W;
  offscreen.height = HQ_CLIP_H;
  const ctx = offscreen.getContext('2d');
  const frames = [];

  function captureFrame() {
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    const srcRatio = vw / vh;
    const dstRatio = HQ_CLIP_W / HQ_CLIP_H;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (srcRatio > dstRatio) { sw = vh * dstRatio; sx = (vw - sw) / 2; }
    else { sh = vw / dstRatio; sy = (vh - sh) / 2; }

    ctx.setTransform(-1, 0, 0, 1, HQ_CLIP_W, 0);
    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, HQ_CLIP_W, HQ_CLIP_H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const imageData = ctx.getImageData(0, 0, HQ_CLIP_W, HQ_CLIP_H);
    applyFilterToPixels(imageData.data, filterId);
    frames.push(imageData.data.slice());
  }

  const intervalId = setInterval(captureFrame, FRAME_DELAY);
  captureFrame();

  return {
    stop() {
      clearInterval(intervalId);
      return frames.slice(-MAX_CLIP_FRAMES);
    },
  };
}

export async function encodeFramesAsJpegs(frames, quality = 0.82) {
  const canvas = document.createElement('canvas');
  canvas.width = HQ_CLIP_W;
  canvas.height = HQ_CLIP_H;
  const ctx = canvas.getContext('2d');
  const blobs = [];
  for (const frameData of frames) {
    const imgData = new ImageData(new Uint8ClampedArray(frameData), HQ_CLIP_W, HQ_CLIP_H);
    ctx.putImageData(imgData, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    blobs.push(blob);
  }
  return blobs;
}

export function encodeClipGif(frames) {
  const encoder = GIFEncoder();
  frames.forEach((frameData) => {
    const data = new Uint8ClampedArray(frameData);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    encoder.writeFrame(index, CLIP_UPLOAD_W, CLIP_UPLOAD_H, { palette, delay: FRAME_DELAY });
  });
  encoder.finish();
  return new Blob([encoder.bytes()], { type: 'image/gif' });
}

function drawCover(ctx, source, x, y, width, height) {
  const srcW = source.width;
  const srcH = source.height;
  const srcRatio = srcW / srcH;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = srcW;
  let sh = srcH;
  if (srcRatio > targetRatio) {
    sw = srcH * targetRatio;
    sx = (srcW - sw) / 2;
  } else {
    sh = srcW / targetRatio;
    sy = (srcH - sh) / 2;
  }
  ctx.drawImage(source, sx, sy, sw, sh, x, y, width, height);
}

async function loadOverlay(url) {
  if (!url) return null;
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  await image.decode();
  return image;
}

// Cloudflare-compatible GIF composition: only the finished GIF is uploaded.
export async function composeGifInBrowser({ clips, zones, layoutW, layoutH, overlayUrl }) {
  const outputW = Math.min(720, layoutW);
  const scale = outputW / layoutW;
  const outputH = Math.round(layoutH * scale);
  const output = document.createElement('canvas');
  output.width = outputW;
  output.height = outputH;
  const outputCtx = output.getContext('2d', { willReadFrequently: true });
  const source = document.createElement('canvas');
  source.width = HQ_CLIP_W;
  source.height = HQ_CLIP_H;
  const sourceCtx = source.getContext('2d');
  const overlay = await loadOverlay(overlayUrl);
  const frameCount = Math.max(...clips.map((frames) => frames.length), 0);
  if (!frameCount) throw new Error('No GIF frames were captured.');

  const encoder = GIFEncoder();
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    outputCtx.fillStyle = '#ffffff';
    outputCtx.fillRect(0, 0, outputW, outputH);
    zones.forEach((zone, clipIndex) => {
      const frames = clips[clipIndex];
      if (!frames?.length) return;
      sourceCtx.putImageData(
        new ImageData(new Uint8ClampedArray(frames[frameIndex % frames.length]), HQ_CLIP_W, HQ_CLIP_H),
        0,
        0,
      );
      drawCover(
        outputCtx,
        source,
        Math.round(zone.x * scale),
        Math.round(zone.y * scale),
        Math.round(zone.w * scale),
        Math.round(zone.h * scale),
      );
    });
    if (overlay) outputCtx.drawImage(overlay, 0, 0, outputW, outputH);
    const pixels = outputCtx.getImageData(0, 0, outputW, outputH).data;
    const palette = quantize(pixels, 256);
    const index = applyPalette(pixels, palette);
    encoder.writeFrame(index, outputW, outputH, {
      palette,
      delay: FRAME_DELAY,
      repeat: frameIndex === 0 ? 0 : undefined,
    });
    if (frameIndex % 2 === 1) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  encoder.finish();
  return new Blob([encoder.bytes()], { type: 'image/gif' });
}
