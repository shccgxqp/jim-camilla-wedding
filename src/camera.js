function clamp(v) {
  return Math.round(Math.max(0, Math.min(255, v)));
}

// Pure pixel-level filter — no ctx.filter API, works on all browsers/iOS versions
export function applyFilterToPixels(data, filterId) {
  if (!filterId || filterId === "none") return;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i],
      g = data[i + 1],
      b = data[i + 2];

    if (filterId === "bw") {
      const v = clamp(0.299 * r + 0.587 * g + 0.114 * b);
      data[i] = data[i + 1] = data[i + 2] = v;
      continue;
    }

    if (filterId === "natural") {
      // brightness(1.06) contrast(0.9) saturate(0.95)
      r = clamp(r * 1.06);
      g = clamp(g * 1.06);
      b = clamp(b * 1.06);
      r = clamp((r - 128) * 0.9 + 128);
      g = clamp((g - 128) * 0.9 + 128);
      b = clamp((b - 128) * 0.9 + 128);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray + 0.95 * (r - gray));
      g = clamp(gray + 0.95 * (g - gray));
      b = clamp(gray + 0.95 * (b - gray));
    } else if (filterId === "fresh") {
      // brightness(1.12) contrast(0.86) saturate(0.8)
      r = clamp(r * 1.12);
      g = clamp(g * 1.12);
      b = clamp(b * 1.12);
      r = clamp((r - 128) * 0.86 + 128);
      g = clamp((g - 128) * 0.86 + 128);
      b = clamp((b - 128) * 0.86 + 128);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray + 0.8 * (r - gray));
      g = clamp(gray + 0.8 * (g - gray));
      b = clamp(gray + 0.8 * (b - gray));
    } else if (filterId === "vintage") {
      // brightness(0.9) contrast(1.24) saturate(1.19) sepia(1) grayscale(0.17)
      r = clamp(r * 0.9);
      g = clamp(g * 0.9);
      b = clamp(b * 0.9);
      r = clamp((r - 128) * 1.24 + 128);
      g = clamp((g - 128) * 1.24 + 128);
      b = clamp((b - 128) * 1.24 + 128);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray + 1.19 * (r - gray));
      g = clamp(gray + 1.19 * (g - gray));
      b = clamp(gray + 1.19 * (b - gray));
      // sepia(1) — full sepia matrix
      const sr = clamp(0.393 * r + 0.769 * g + 0.189 * b);
      const sg = clamp(0.349 * r + 0.686 * g + 0.168 * b);
      const sb = clamp(0.272 * r + 0.534 * g + 0.131 * b);
      r = sr;
      g = sg;
      b = sb;
      // grayscale(0.17) — 17% blend toward luminance
      const gray2 = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray2 * 0.17 + r * 0.83);
      g = clamp(gray2 * 0.17 + g * 0.83);
      b = clamp(gray2 * 0.17 + b * 0.83);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function triggerFlash(flashEl) {
  if (!flashEl) return wait(450);
  flashEl.classList.remove("flashing");
  void flashEl.offsetWidth;
  flashEl.classList.add("flashing");
  return wait(450);
}

export async function startCamera(streamRef, videoEl, facingMode, onError, aspectRatio = '3:4') {
  stopCamera(streamRef);
  try {
    const isIPad =
      /iPad/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // iPad 3:4: request 1080×1440 → native 4:3 sensor, minimal crop
    // iPad 9:16: no resolution constraint → let iOS pick native stream (may give wider FOV)
    // iPhone/desktop: landscape ideal → iOS gives 1080×1920 portrait; desktop gets 1920×1080
    const videoConstraints = isIPad
      ? aspectRatio === '9:16'
        ? { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 }, frameRate: { ideal: 30 } }
        : { facingMode, width: { ideal: 1080 }, height: { ideal: 1440 }, frameRate: { ideal: 30 } }
      : { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } };
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });
    streamRef.current = stream;

    // Best-effort: reset zoom to minimum (iOS Safari rarely exposes this, but try)
    const track = stream.getVideoTracks()[0];
    if (track?.applyConstraints) {
      const cap = track.getCapabilities?.() ?? {};
      if (cap.zoom?.min !== undefined) {
        await track.applyConstraints({ advanced: [{ zoom: cap.zoom.min }] }).catch(() => {});
      }
    }

    videoEl.srcObject = stream;
    await videoEl.play();
  } catch (err) {
    onError?.(err);
    console.error(err);
  }
}

export function stopCamera(streamRef) {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }
}

export async function runCountdown(seconds, onTick) {
  for (let count = seconds; count > 0; count -= 1) {
    onTick(count);
    await wait(850);
  }
  onTick("smile");
  await wait(700);
  onTick(null);
}

export async function captureFrame(
  videoEl,
  workCanvas,
  activeLayout,
  filterId,
  shotNum = "?",
  aspectRatio = "3:4",
  format = "png",
) {
  if (!videoEl || videoEl.videoWidth === 0 || videoEl.readyState < 2) {
    throw new Error(
      "相機尚未就緒（videoWidth=0 / readyState=" +
        (videoEl?.readyState ?? "null") +
        "）",
    );
  }
  if (!workCanvas) throw new Error("workCanvas 元素不存在");

  const shotRatio = activeLayout?.shotRatio || "4/3";
  const [rw, rh] = shotRatio.split("/").map(Number);
  const captureW = rw >= rh ? 1200 : Math.round((1200 * rw) / rh);
  const captureH = Math.round((captureW * rh) / rw);

  workCanvas.width = captureW;
  workCanvas.height = captureH;

  const vW = videoEl.videoWidth;
  const vH = videoEl.videoHeight;
  const ctx = workCanvas.getContext("2d");
  const targetRatio = captureW / captureH;
  let debugData;

  const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (vW < vH) {
    if (isIPad) {
      // Both 3:4 and 9:16: capture full native stream, let compose.js do the single cover crop.
      // 9:16 mode differs only in stream constraints (height:1920 vs 1440 in startCamera).
      const nativeCaptureH = Math.round(captureW * vH / vW);
      workCanvas.width = captureW;
      workCanvas.height = nativeCaptureH;
      ctx.setTransform(-1, 0, 0, 1, captureW, 0);
      ctx.drawImage(videoEl, 0, 0, vW, vH, 0, 0, captureW, nativeCaptureH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      debugData = { shot: `${activeLayout?.id}-${shotNum}`, vW, vH, captureW, captureH: nativeCaptureH, mode: 'ipad-native-fov', aspectRatio };
    } else {
      // iPhone: center-crop to target ratio + selfie mirror
      const srcRatio = vW / vH;
      let sx = 0, sy = 0, cropW = vW, cropH = vH;
      if (srcRatio > targetRatio) { cropW = vH * targetRatio; sx = (vW - cropW) / 2; }
      else { cropH = vW / targetRatio; sy = (vH - cropH) / 2; }
      ctx.setTransform(-1, 0, 0, 1, captureW, 0);
      ctx.drawImage(videoEl, sx, sy, cropW, cropH, 0, 0, captureW, captureH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      debugData = { shot: `${activeLayout?.id}-${shotNum}`, vW, vH, captureW, captureH, mode: 'portrait-crop', sx: Math.round(sx), sy: Math.round(sy), cropW: Math.round(cropW), cropH: Math.round(cropH), aspectRatio };
    }
  } else {
    // Landscape buffer (vW > vH)
    let sx = 0,
      sy = 0,
      cropW = vW,
      cropH = vH;
    if (isIPad) {
      // iPad pillarboxes portrait content into center vH×vH of the landscape buffer.
      // Valid area: x=(vW-vH)/2 .. (vW+vH)/2, y=0..vH (a vH×vH square).
      const validSize = vH;
      const validX = (vW - validSize) / 2;
      if (1.0 > targetRatio) {
        cropW = validSize * targetRatio;
        sx = validX + (validSize - cropW) / 2;
        cropH = validSize;
      } else {
        cropH = validSize / targetRatio;
        sy = (validSize - cropH) / 2;
        sx = validX;
        cropW = validSize;
      }
      debugData = {
        shot: `${activeLayout?.id}-${shotNum}`,
        vW,
        vH,
        captureW,
        captureH,
        mode: "ipad-landscape",
        sx: Math.round(sx),
        sy: Math.round(sy),
        cropW: Math.round(cropW),
        cropH: Math.round(cropH),
        aspectRatio,
      };
    } else {
      const srcRatio = vW / vH;
      if (srcRatio > targetRatio) {
        cropW = vH * targetRatio;
        sx = (vW - cropW) / 2;
      } else {
        cropH = vW / targetRatio;
        sy = (vH - cropH) / 2;
      }
      debugData = {
        shot: `${activeLayout?.id}-${shotNum}`,
        vW,
        vH,
        captureW,
        captureH,
        mode: "landscape-crop",
        sx: Math.round(sx),
        sy: Math.round(sy),
        cropW: Math.round(cropW),
        cropH: Math.round(cropH),
        aspectRatio,
      };
    }
    ctx.setTransform(-1, 0, 0, 1, captureW, 0);
    ctx.drawImage(videoEl, sx, sy, cropW, cropH, 0, 0, captureW, captureH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  if (filterId && filterId !== "none") {
    const imageData = ctx.getImageData(0, 0, workCanvas.width, workCanvas.height);
    applyFilterToPixels(imageData.data, filterId);
    ctx.putImageData(imageData, 0, 0);
  }

  const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
  const quality = format === "jpeg" ? 0.92 : undefined;
  const blob = await new Promise((resolve) => workCanvas.toBlob(resolve, mimeType, quality));
  if (!blob) throw new Error("Unable to encode captured photo.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Unable to read captured photo."));
    reader.readAsDataURL(blob);
  });
}

export async function switchCamera(
  streamRef,
  facingMode,
  videoEl,
  onFacingChange,
  onError,
) {
  const newMode = facingMode === "user" ? "environment" : "user";
  onFacingChange(newMode);
  await startCamera(streamRef, videoEl, newMode, onError);
}
