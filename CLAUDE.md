# CLAUDE.md

本文件提供 Claude Code 在此專案中的開發指引。

## 專案常駐 Agent

以下 6 個 agent 已安裝於 `.claude/agents/`，Claude 應主動判斷情境委派，不需使用者每次指定：

| Agent | 自動觸發時機 |
|-------|-------------|
| `engineering-frontend-developer` | 任何 `src/wedding/`、JSX、CSS 異動 |
| `engineering-backend-architect` | `server.cjs`、API 路由、上傳流程異動 |
| `engineering-devops-automator` | 部署、CI/CD、nginx、環境變數、Docker |
| `engineering-security-engineer` | 上線前、後端 API 異動、token/加密相關 |
| `engineering-code-reviewer` | commit 前、PR、任何超過 2 個檔案的改動 |
| `paid-media-ppc-strategist` | 行銷、廣告投放、婚宴宣傳策略討論 |

其餘 178 個全域 agent 仍可手動呼叫。

---

## 常用指令

```bash
npm install          # 安裝所有套件
npm run dev          # 啟動 Vite 開發伺服器（port 5173）+ 後端（port 3000）
npm run build        # Vite 建置 → dist/
npm start            # 正式環境：node server.cjs（在 port 3000 提供 dist/）
```

健康檢查：`GET http://localhost:3000/health` → `{ "ok": true }`

開發時前端跑在 **5173**（Vite HMR）。`/api/*`、`/photos/*`、`/view/*`、`/backgrounds/*`、`/frames/*`、`/frontImg/*` 代理到後端 port 3000。

**ffmpeg（影片模式必要）：**
```bash
brew install ffmpeg      # macOS
apt install ffmpeg       # Ubuntu/Debian
winget install ffmpeg    # Windows
```
未安裝時影片仍可錄製，但不會轉成 H.264 MP4，LINE / IG 可能不相容。

---

## 網站架構（雙路由）

本專案包含兩個獨立網站，由同一個 React SPA + React Router 統一管理：

| 路徑 | 網站 | 說明 |
|------|------|------|
| `/` | 婚宴資訊網站 | `src/wedding/WeddingSite.jsx` |
| `/photo-booth/*` | 拍貼機 SPA | `src/App.jsx` |

**路由入口**：`src/main.jsx` — BrowserRouter + Routes

```
/           → <WeddingSite />
/photo-booth/* → <AppProvider><App /></AppProvider>
```

**CSS 隔離**：
- 婚宴：`src/wedding/wedding.css`（vanilla CSS，不含 Tailwind）
- 拍貼機：`src/app.css`（Tailwind v4），在 `src/App.jsx` 內 import

**⚠️ overflow 規則**：婚宴網站需要 document-level scroll。`app.css` 不可對 `html/body/#root` 設 `overflow:hidden`，由 `.app-shell` 自己管理 `overflow:hidden`。婚宴 CSS 用 `overflow-x:clip`（不是 `overflow-x:hidden`，後者會建立 scroll container 導致 `position:sticky` 失效）。

---

## 後端

**[server.cjs](server.cjs)**：純 `node:http`，無框架。正式環境提供 `dist/`（SPA fallback）。路由：
- `GET /view/:token` → HTML landing page（預覽 + 儲存按鈕，QR code 指向此處）
- `GET /photos/:token` → `uploads/` 原始檔（影片支援 Range requests）
- `POST /api/photos` → 接受 image/* 或 video/*；影片自動 ffmpeg 轉 H.264 MP4 faststart
- `GET /backgrounds/:filename` → `public/backgrounds/`
- `GET /*` → 先嘗試 `dist/` 靜態檔，找不到則回傳 `dist/index.html`（React Router 接管）

---

## 前端檔案結構

```
src/
  main.jsx                  React 根節點，BrowserRouter + Routes
  App.jsx                   拍貼機根元件（import app.css 在此）
  app.css                   Tailwind v4 + 拍貼機自訂 CSS
  context/AppContext.jsx    拍貼機全域狀態
  data/constants.js         layouts、filters、DEFAULT_CONFIG
  screens/                  LayoutScreen、CameraScreen、LoadingScreen、ResultScreen、FilterEditorScreen、ErrorScreen
  components/               TopBar、FilterLab
  frames/                   frame01–05 ZONES + overlay URL
  camera.js                 startCamera、stopCamera、runCountdown、captureFrame、triggerFlash
  compose.js                Canvas 合成
  gif.js                    GIF 逐格錄影 + 上傳
  video.js                  MediaRecorder clip + client-side 合成
  upload.js                 uploadPhoto、uploadVideo、QR code

  wedding/
    WeddingSite.jsx         婚宴根元件（import wedding.css 在此）
    wedding.css             婚宴專屬樣式（vanilla CSS，RWD 900px + 480px）
    WeddingNav.jsx          Nav + 手機 hamburger drawer
    sections/
      Hero.jsx
      Countdown.jsx         useEffect + setInterval 倒數
      Story.jsx             scroll stack 動畫（960vh 捲動）
      Gallery.jsx           相片牆 + lightbox 觸發
      Venue.jsx             SVG 地圖 + 交通資訊
      Faq.jsx               <details> FAQ 手風琴
      Footer.jsx
    modals/
      RsvpModal.jsx         React state 表單驗證
      Lightbox.jsx          全螢幕相片預覽

public/
  frames/                   frame01–05.png（拍貼機框格）
  backgrounds/              frameXXbackground.png
  frontImg/                 版型預覽圖
  wedding/
    images/                 婚宴照片（story-1~5, gallery-1~8）
```

**設定檔** — [config/wedding.json](config/wedding.json)：熱重載，改完不須重啟。

---

## 主要流程

**靜態照片 → 合成 → 上傳：**
1. `CameraScreen` 掛載時透過 `startCamera(streamRef, videoEl, facingMode)` 啟動鏡頭
2. `handleCapture()` 循環 `requiredShots` 次：`runCountdown` → `captureFrame`（含水平翻轉）→ `triggerFlash`
3. 拍完呼叫 `onAllShotsTaken(shots)`，交給 `App.jsx`
4. `App.jsx` 呼叫 `composePhoto(workCanvas, layout, shots)`
5. `uploadPhoto(blob, layoutId)` POST 到 `/api/photos`，伺服器存入 `uploads/`
6. QR code 指向 `/photos/:token`

**影片 → 合成 → 上傳：**
1. `handleVideoCapture()` 循環 `requiredShots` 次：`runCountdown` → `startVideoClipRecorder(stream, 2000ms)` → `triggerFlash`
2. `composeMultiZoneVideo(clips, zones, layoutW, layoutH, overlayUrl)` client-side 合成
3. `uploadVideo` → server ffmpeg 轉 H.264 MP4 + faststart
4. QR code 指向 `/view/:token`

**畫面流程：**
```
版型選擇 → 拍照（靜態 / 影片 / GIF）→ 載入中 → 結果
```

---

## 賓客下載影片流程（/view/:token）

- **iOS Safari**：Web Share API → 儲存影片 → 相簿
- **LINE 內建瀏覽器**：顯示「在 Safari 中開啟」按鈕
- **Android Chrome**：Web Share API 或 fallback download
- **桌機**：blob download fallback

---

## 版型（Layouts）

定義於 [src/data/constants.js](src/data/constants.js)：

| id | 名稱 | 張數 | 輸出尺寸 | shotRatio |
|----|------|------|----------|-----------|
| `frame05` | 仙女雙格 | 2 | 960×1707 | 790/510 |
| `frame04` | 派對四格 | 4 | 2090×3135 | 910/1074 |
| `frame03` | 雲朵直條 | 4 | 858×2532 | 724/543 |
| `frame02` | 星空直條 | 3 | 784×1176 | 545/365 |
| `frame01` | 愛心拍貼 | 6 | 779×1172 | 315/332 |

> ⚠️ **frame05 ZONES 待校準**：`src/frames/frame05.js` 的 ZONES 是估算值。

**新增框格版型步驟：**
1. 將 PNG 放入 `public/frames/`
2. 建立 `src/frames/frameXX.js`，含 `OVERLAY_URL`、`ZONES`
3. 在 `constants.js` 的 `layouts` 加入新項目
4. 在 `compose.js` 新增 frameXX compose 分支 + import
5. 在 `CameraScreen.jsx` 的 `FRAME_GUIDE` 加入新版型
6. 在 `app.css` 新增 `.preview-frameXX` 預覽 CSS

---

## Tailwind CSS（拍貼機專用）

使用 **Tailwind v4**（`@tailwindcss/vite` 外掛）。無 `tailwind.config.js`，設定全在 [src/app.css](src/app.css)：

- `@theme { }` — 設計 token（顏色、字型）
- `:root { }` — CSS 自訂屬性（`--pink`、`--blush`、`--ink`），可由 JS 覆寫
- `@apply` — 自訂 class 內使用

---

## 婚宴網站 RWD 斷點

| 範圍 | 版面 |
|------|------|
| > 900px | 桌機：三欄 nav、雙欄 venue |
| ≤ 900px | 平板：hamburger 選單、單欄 venue |
| ≤ 480px | 手機：story text 移至卡片下方、gallery 2 欄 |

---

## 拍貼機 RWD 斷點

| 範圍 | 版面 |
|------|------|
| > 860px | 桌機：版型選擇 3 欄，鏡頭／結果左右並排 |
| 600–860px | 平板直向：版型選擇 2 欄 |
| ≤ 599px | 手機：垂直堆疊 |
| max-height ≤ 480px | 橫放手機：縮小最小高度 |

---

## 婚禮設定

編輯 `config/wedding.json`（熱重載，不須重啟）：
- `coupleName`：`"jim & camilla"`
- `weddingDate`：`"2026.11.07"`
- `tagline`：`"Wedding Photo Booth"`
- `publicBaseUrl`：設為 HTTPS 網域，QR code 用
- `theme.primary/secondary/ink`：CSS 顏色覆寫（拍貼機用）

---

## 上線前檢查清單

- 執行 `npm run build` 再 `npm start`
- 在 `config/wedding.json` 設定 `publicBaseUrl` 或 `PUBLIC_BASE_URL` 環境變數
- 確認 `ffmpeg` 已安裝（`ffmpeg -version`）
- 活動前清空 `uploads/`
- 部署於 HTTPS（iPad／手機鏡頭存取必要）
- 婚宴照片放入 `public/wedding/images/`（story-1~5、gallery-1~8）

---

## 伺服器部署指南

### 本機開發（Windows）

```bash
winget install ffmpeg
ffmpeg -version
npm run dev
```

### 正式伺服器（Linux）

```bash
apt update && apt install -y ffmpeg nodejs npm
```

### 雲端平台部署方式

| 平台 | 方式 | 備註 |
|------|------|------|
| **Ubuntu VPS**（Hetzner / DigitalOcean） | `apt install ffmpeg` | 最穩，推薦 |
| **Railway** | `nixpacks.toml` 加 `ffmpeg` | 自動 build |
| **Render** | Dockerfile `RUN apt-get install -y ffmpeg` | |
| **Fly.io** | Dockerfile `RUN apt-get install -y ffmpeg` | |
| **Vercel / Netlify** | ❌ 不支援 | 無法常駐 server process |

### Railway 快速部署（nixpacks）

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "ffmpeg"]

[start]
cmd = "node server.cjs"
```

環境變數：`PUBLIC_BASE_URL=https://your-app.railway.app`、`PORT=3000`

---

## 待測試 / 進行中分支

### `fix/ipad-camera-zoom` — ⏳ 等待 iPad 9 實機測試

**問題**：iPad 9 拍照第二張時鏡頭放大、拍出來壓扁；重新整理後正常。

**根因**：iOS Safari `canvas.drawImage(videoEl)` 觸發攝影機串流解析度重新協商，第二張 crop 計算錯誤。

**修復內容**（`src/screens/CameraScreen.jsx`、`src/app.css`）：
- 每張之間重新 `videoEl.srcObject = stream` + `play()` 重置串流
- `<video>` 加 inline style 防止 Safari re-render 時 CSS 失效
- 移除全域 `video { transform: scaleX(-1) }` → 改為 inline style

**此分支也包含**：婚宴網站 JSX 整合、React Router 雙路由、RWD 改善

**測試步驟**：
1. iPad 9 開啟 `https://<local-ip>:5173/photo-booth/`
2. 選任一版型 → 拍照 → 確認第二張 preview **不放大** → 拍出照片比例正確
3. 測試所有版型（frame01 六張最嚴格）
4. 開啟 `https://<local-ip>:5173/` 確認婚宴網站正常捲動

**測試通過後**：`git checkout master && git merge fix/ipad-camera-zoom && git push`

---

### iPad 9:16 比例功能 — ⏳ 實機測試中（2026-06-04）

**功能**：拍照頁偵測到 iPad 時，Photo X of Y 右側顯示 `3:4 / 9:16` 切換按鈕。

**已實作**：
- `src/screens/CameraScreen.jsx`：`aspectRatio` state（預設 `'3:4'`）、`aspectRatioRef`、`isIPad` 偵測，全在 component 頂部宣告（避免 TDZ）
- 切換 9:16 → `useEffect` 重啟相機，`startCamera` 傳入 `aspectRatio`
- CSS：`.camera-shot-title-row`（position: relative）、`.camera-ratio-toggle`（absolute right:0）、`.camera-ratio-btn`
- `src/camera.js`：`startCamera` 接受 `aspectRatio`，9:16 時 `height: { ideal: 1920 }`（請求更高串流）；`captureFrame` 接受 `aspectRatio`，**iPad 3:4 / 9:16 統一用 full native FOV**，讓 compose 做唯一一次 cover crop（避免雙重裁切臉部放大）；所有 debugData 加 `aspectRatio` 欄位；filter 改用 `workCanvas.width/height`（修正舊 bug）
- drawLoop iPad portrait 統一用 cover logic（不 stretch）

**已確認問題**：
- iOS Safari getUserMedia 比原生相機窄（系統限制，非 code 問題）
- iPad 實際給回 `1080×1512`（非 1920），stream 比 3:4 略高但非真 9:16
- 雙重裁切問題已修復：舊邏輯 captureFrame 輸出 675×1200 → compose 再裁 33%，導致只剩臉

**待測試**：
1. iPad 切 9:16 → 鏡頭重啟正常
2. 拍出照片人物有上半身（不只臉部）
3. Preview 不拉伸變胖
4. 切回 3:4 鏡頭恢復正常
5. 拍照中途不切換比例（避免 race condition）

---

### iPhone 遠端相機（實驗中）— ⏳ 待實機測試（2026-07-03）

**動機**：iOS Safari iPad 前鏡頭 FOV 縮小（系統限制），iPhone 無此問題 → iPad 當螢幕、iPhone 當鏡頭。

**架構**：iPhone `getUserMedia` → WebRTC 推流給 iPad 做即時預覽；拍照時 iPad 經 WS 發 capture 指令，iPhone 本地全解析度 `captureFrame`（JPEG）→ WS 回傳 dataUrl → iPad 走原本 compose/upload 流程。

**檔案**：
- `server.cjs`：WS hub（`/ws`，`ws` 套件），booth/camera 單配對 relay
- `src/remote/booth.js`：iPad 端 singleton（WS + WebRTC answer + requestCapture）
- `src/screens/RemoteCameraPage.jsx`：iPhone 頁 `/photo-booth/camera`（獨立 route，非 AppProvider 內）
- `src/screens/SettingsScreen.jsx`：⚙️ 進入（LayoutScreen 右上），local/remote 切換 + QR 配對
- `AppContext`：`cameraSource`（localStorage `pb_camera_source`，預設 `local`）
- `CameraScreen`：`isRemote` 分支 — 掛 remote stream、capture 走 `requestCapture`、隱藏 ratio/video toggle
- `vite.config.js`：`/ws` proxy（`ws: true`）

**進度（2026-07-03 完成）**：拍照 ✅ + GIF ✅ 實機測試通過。影片模式仍 local only（需 raw MediaStream，WebRTC 重編碼畫質損失）。

**Mode toggle**：local = 拍照/影片/GIF；remote = 拍照/GIF。GIF 快門 = 金色圓鈕。

**穩定性（斷線黑畫面修復）**：
- Server：25s protocol ping，殭屍 socket `terminate()` → 對端收 `peer-left`；app-level `ping`→`pong`
- booth.js / RemoteCameraPage：15s app-level ping，10s 無 pong 強制 close → 2s 自動重連
- iPhone 端：`track.onended` → 自動重開相機+重推流；`visibilitychange` → 重拿 wake lock + 檢查 track；WebRTC failed → 1.5s renegotiate；「重新連線」手動按鈕（iOS 需 user gesture 時的 fallback）

**效能優化**：
- 拍照：flash 與 remote dataUrl 傳輸並行（拍完即閃，不等傳輸）
- GIF：拍完立即進 loading（上傳背景跑）；frames batch 上傳（每格 1 請求，`/api/gif/frames-batch`，binary 格式 `[u32 count][u32 len][jpeg]...`）；GIF 輸出鎖 720px 寬（編碼快 5-9x）
- LoadingScreen 補上 `camera-screen-bg`（原白畫面）

**限制**：iPhone 需 Auto-Lock 設「永不」。

**測試**：iPad 開 `/photo-booth/` → ⚙️ → 選 iPhone 遠端 → iPhone 掃 QR 開 `/photo-booth/camera` → 配對後拍完整流程。

---

### `frame05` 仙女雙格 — ✅ ZONES 已校準（2026-07-03）

由 PNG alpha 分析（alpha<128 bounding box + 4px bleed）取得精確值：
top `{144,168,683,423}`、bottom `{156,1008,643,402}`，shotRatio 更新為 `683/423`。

---

### 上線前安全（2026-07-03 完成）

- **配對碼**：booth 產生 4 位碼（localStorage `pb_pair_code`，去除 0/O/1/I），hello 帶 `pair`，server 比對不符 → `pair-rejected` + 斷線。QR 帶 `?pair=CODE`；iPhone 無 code 時顯示輸入畫面。防賓客誤開 `/photo-booth/camera` 劫持鏡頭
- **frame06 RAW 診斷框**：預設隱藏，settings debug checkbox（localStorage `pb_show_raw`）開啟才出現在版型選單
- **UPLOAD_SECRET**：`.env` 已設定（gitignored）。部署新機器要重新生成
