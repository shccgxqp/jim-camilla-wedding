# Jim & Camilla Wedding — 專案現況

## 正式架構

- 正式網站與後端皆由 **Cloudflare Workers** 提供。
- **R2** 儲存私有照片、GIF 與 MP4；**D1** 儲存媒體索引；**Durable Object** 處理遠端相機配對訊號。
- 正式設定在 `wrangler.jsonc`，Worker 程式在 `cloudflare/worker.js`。
- Vercel 已停用為部署目標，專案不應再加入 Vercel 設定或 rewrites。

## 主要功能與位置

| 功能 | 位置 |
| --- | --- |
| 婚禮網站 | `src/wedding/` |
| 路由 | `src/main.jsx`；`/`、`/photo-booth/*` |
| 拍貼機流程 | `src/App.jsx`、`src/screens/CameraScreen.jsx` |
| 拍照、相框合成、GIF、影片 | `src/camera.js`、`src/compose.js`、`src/gif.js`、`src/video.js` |
| iPhone 遠端相機 | `src/remote/booth.js`、`src/screens/RemoteCameraPage.jsx` |
| 照片管理 | `src/screens/PhotoGalleryPage.jsx` |
| Cloudflare API 與媒體服務 | `cloudflare/worker.js` |

## 開發與部署

```powershell
npm run build
npm run cf:dev
npm run cf:deploy
```

- Cloudflare Worker：`https://jim-camilla-wedding.shccgxqp.workers.dev`
- 部署及帳戶操作請依照 `docs/CLOUDFLARE_RUNBOOK.md`。
- 本機完整測試使用 `npm run cf:dev`，使前端與 Cloudflare Worker API 在同一個本機環境運作。

## 安全與媒體

- R2 bucket 必須維持私有；媒體僅透過 `/photos/:token` 與 `/view/:token` 提供。
- `ADMIN_PIN` 是 Cloudflare Worker secret，不可提交到 Git。
- 正式環境須移除 `GALLERY_PIN_BYPASS: "true"`。
- QR 下載網址視為持有者連結：取得網址的人可查看對應媒體，不應公開散布。
