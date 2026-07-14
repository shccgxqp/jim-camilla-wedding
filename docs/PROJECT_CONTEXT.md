# Jim & Camilla Wedding — 共用專案脈絡

## 目的

這是一個 React/Vite 婚禮網站，包含婚禮資訊頁與 iPad 拍貼機。拍貼機支援相片、GIF、影片、相框合成、上傳和 QR Code 下載；並可使用 iPhone 遠端相機。

## 常用指令

```powershell
npm run dev
npm run build
npm start
```

- 開發模式：Vite 與 Node server 共同啟動。
- 正式伺服器：`node server.cjs`，預設 port 3000。
- 健康檢查：`GET /health`。
- 影片輸出與轉碼需要系統安裝 `ffmpeg`。

## 路由與主要模組

| 範圍 | 入口 / 位置 | 用途 |
| --- | --- | --- |
| 婚禮網站 | `src/wedding/WeddingSite.jsx` | 首頁婚禮資訊與 RSVP |
| 婚禮網站新版 | `src/wedding-v2/WeddingSiteV2.jsx` | 新版婚禮頁面實作 |
| 拍貼機 | `src/App.jsx` | 拍貼機狀態、畫面流程與整合 |
| 主要路由 | `src/main.jsx` | `/` 與 `/photo-booth/*` 路由 |
| 拍照、合成、輸出 | `src/camera.js`、`src/compose.js`、`src/gif.js`、`src/video.js` | 相機、Canvas、GIF、影片處理 |
| 遠端相機 | `src/remote/booth.js`、`src/screens/RemoteCameraPage.jsx` | iPhone/iPad WebRTC 與配對 |
| 後端 | `server.cjs` | 靜態檔、上傳、下載頁與 WebSocket relay |
| 婚禮設定 | `config/wedding.json` | 新人資訊、日期、主題與公開網址 |

## 樣式規則

- 婚禮網站：`src/wedding/wedding.css`，原生 CSS。
- 拍貼機：`src/app.css`，Tailwind v4 與自訂 CSS。
- 優先維持既有架構與命名；除非任務明確要求，避免跨區重構。

## 使用者與裝置重點

- 拍貼機主要在 iPad 使用；相機功能需留意 iOS Safari、直橫向比例與真機測試。
- 遠端模式讓 iPhone 當相機、iPad 進行合成與輸出。
- `uploads/` 含執行期間使用者媒體，不可任意清除或提交。

## 目前工作樹注意事項

開始工作前先執行 `git status --short`。目前已存在未提交變更，包含：

- `src/main.jsx`
- `src/wedding-v2/`
- `S__60186627.jpg`

這些不是共享任務板所認領的變更；除非使用者明確指示，任何 agent 都不得覆寫、還原或納入自己的提交。
