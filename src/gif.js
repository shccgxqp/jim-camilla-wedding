import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { applyFilterToPixels } from './camera.js';

const HQ_CLIP_W = 720;
const HQ_CLIP_H = 960;
const FPS = 10;
const FRAME_DELAY = Math.round(1000 / FPS);
const MAX_CLIP_FRAMES = 15;
export const RECORD_MS = MAX_CLIP_FRAMES * FRAME_DELAY; // 1500ms

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

function createComposition({ clips, zones, layoutW, layoutH, overlay }) {
  const outputW = Math.round(Math.min(720, layoutW) / 2) * 2;
  const scale = outputW / layoutW;
  // H.264 requires even dimensions.
  const outputH = Math.round(layoutH * scale / 2) * 2;
  const output = document.createElement('canvas');
  output.width = outputW;
  output.height = outputH;
  const outputCtx = output.getContext('2d', { willReadFrequently: true });
  const source = document.createElement('canvas');
  source.width = HQ_CLIP_W;
  source.height = HQ_CLIP_H;
  const sourceCtx = source.getContext('2d');
  const frameCount = Math.max(...clips.map((frames) => frames.length), 0);
  if (!frameCount) throw new Error('No GIF frames were captured.');

  function drawFrame(frameIndex) {
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
  }

  return { output, outputCtx, frameCount, drawFrame };
}

// Cloudflare-compatible GIF composition: only the finished GIF is uploaded.
export async function composeGifInBrowser({ clips, zones, layoutW, layoutH, overlayUrl }) {
  const overlay = await loadOverlay(overlayUrl);
  const { output, outputCtx, frameCount, drawFrame } = createComposition({
    clips, zones, layoutW, layoutH, overlay,
  });

  const encoder = GIFEncoder();
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    drawFrame(frameIndex);
    const pixels = outputCtx.getImageData(0, 0, output.width, output.height).data;
    const palette = quantize(pixels, 256);
    const index = applyPalette(pixels, palette);
    encoder.writeFrame(index, output.width, output.height, {
      palette,
      delay: FRAME_DELAY,
      repeat: frameIndex === 0 ? 0 : undefined,
    });
    if (frameIndex % 2 === 1) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  encoder.finish();
  return new Blob([encoder.bytes()], { type: 'image/gif' });
}

// Uses the same GIF frames to make an Instagram-friendly H.264 MP4. This is
// intentionally best-effort: WebCodecs is not available on every browser.
export async function composeGifMp4InBrowser({ clips, zones, layoutW, layoutH, overlayUrl }) {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('This browser cannot create an MP4 video.');
  }

  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output } = await import('mediabunny');
  const overlay = await loadOverlay(overlayUrl);
  const { output: canvas, frameCount, drawFrame } = createComposition({
    clips, zones, layoutW, layoutH, overlay,
  });
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const videoSource = new CanvasSource(canvas, {
    codec: 'avc',
    // A short 720px vertical clip stays small while retaining clear frame art.
    bitrate: 2_000_000,
    keyFrameInterval: 1.5,
  });
  output.addVideoTrack(videoSource, { frameRate: FPS });
  await output.start();

  // Four loops makes a 1.5-second GIF into a roughly six-second Story clip.
  for (let loop = 0; loop < 4; loop++) {
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      drawFrame(frameIndex);
      await videoSource.add((loop * frameCount + frameIndex) / FPS, 1 / FPS, {
        keyFrame: frameIndex === 0,
      });
    }
  }
  await output.finalize();
  if (!target.buffer) throw new Error('MP4 encoding produced no file.');
  return new Blob([target.buffer], { type: 'video/mp4' });
}
