import qrcode from 'qrcode-generator';

async function uploadMedia(blob, layoutId, fallbackType) {
  const layout = encodeURIComponent(layoutId);
  const response = await fetch(`/api/photos?layout=${layout}`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || fallbackType },
    body: blob,
  });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return response.json();
}

export async function uploadPhoto(blob, layoutId) {
  const data = await uploadMedia(blob, layoutId, 'image/jpeg');
  data.downloadUrl = `${window.location.origin}/photos/${data.token}`;
  return data;
}

export async function uploadVideo(blob, layoutId = 'video') {
  const data = await uploadMedia(blob, layoutId, 'video/mp4');
  // QR points at a landing page so iPhone guests can choose Save Video.
  data.downloadUrl = `${window.location.origin}/view/${data.token}`;
  data.rawUrl = `${window.location.origin}/photos/${data.token}`;
  return data;
}

export async function uploadGif(blob, layoutId = 'gif') {
  const data = await uploadMedia(blob, layoutId, 'image/gif');
  data.downloadUrl = `${window.location.origin}/photos/${data.token}`;
  return data;
}

export async function renderQrCode(url, canvasEl) {
  clearQr(canvasEl);
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const image = new Image();
  image.src = qr.createDataURL(8, 2);
  await image.decode();
  const ctx = canvasEl.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, canvasEl.width, canvasEl.height);
}

export function clearQr(canvasEl) {
  if (!canvasEl) return;
  canvasEl.getContext('2d').clearRect(0, 0, canvasEl.width, canvasEl.height);
}
