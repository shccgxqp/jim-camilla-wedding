# AI Task Board

此檔是 Claude 與 Codex 的共享即時白板。每次開始、阻塞或完成一個任務時都必須更新。

最後更新：2026-07-14

## IN PROGRESS

目前沒有已認領任務。

| ID | Task | Owner | Branch / worktree | Files / scope | Started | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CF-001 | Cloudflare production deployment: Worker static site, R2/D1 photo storage migration, and feature verification | Codex | master | `cloudflare/**`, `wrangler.jsonc`, upload/API integration, docs | 2026-07-14 | DONE — Cloudflare is the sole deployment platform. Worker, R2/D1, gallery, remote camera relay, GIF and IG MP4 upload are deployed and acceptance-tested. |

<!--
新增格式：
| ID | 任務 | Owner | 分支 / worktree | 鎖定檔案 | 開始時間 | 狀態 |
| --- | --- | --- | --- | --- | --- | --- |
| PB-001 | 範例任務 | Codex 或 Claude | feat/example | src/example.js | 2026-07-14 14:00 | 實作中 |
-->

## BLOCKED / INTEGRATION REQUESTS

| ID | 需求 / 阻塞原因 | 提出者 | 需要的 Owner | 影響檔案 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| INT-001 | 新版婚禮頁型（`template-test` 分支）已在 `src/main.jsx` 新增 `/v2` 路由（共用高風險檔案），實作當下尚未發現本協作文件，因此未事先提整合請求。變更僅新增一個 route 條目，未動到既有 `/` 或 `/photo-booth/*` 邏輯。Codex 有空時請 review 這行新增是否與其他進行中工作衝突 | Claude | Codex（`src/main.jsx` 預設 Owner） | `src/main.jsx` | Codex review 後在 DONE 註記，或提出修改需求 |

<!--
格式：
| ID | 需求 / 阻塞原因 | 提出者 | 需要的 Owner | 影響檔案 | 下一步 |
| --- | --- | --- | --- | --- | --- |
-->

## READY

| ID | 任務 | 建議 Owner | 允許修改檔案 | 驗收條件 |
| --- | --- | --- | --- | --- |
| DOC-001 | 維護共用協作文件 | Codex | `AGENTS.md`, `docs/**` | 規則與任務板保持同步、清楚且可執行 |

## DONE

| ID | Owner | 結果 | 驗證 |
| --- | --- | --- | --- |
| NAV-001 | Codex | 在 `/` 與 `/v2` 頁面最底部新增臨時「展示與管理快捷入口」，包含正式首頁、新版頁面、拍貼機、遠端相機、照片管理、投影幕、投影控制、照片庫，方便展示與測試期間快速跳轉。 | `npm.cmd run build` 於 2026-07-15 通過；`git diff --check` 無錯誤。 |
| LIB-001 | Codex | 新增 `/photo-library` 照片庫管理後台：可拖拉多檔上傳到 Cloudflare R2，D1 記錄分類、備註、排序與是否加入投影牆；新增 `/api/library`、`/api/library/:token`、`/api/live-wall-library`；投影牆改為優先讀照片庫素材，若沒有照片庫資料才 fallback 到目前 GitHub 靜態照片。 | `npm.cmd run build` 於 2026-07-15 通過；`git diff --check` 無錯誤；本機 Wrangler `/photo-library` 回 200；`GET /api/library`、`POST /api/library`、`GET /api/live-wall-library`、`GET /photos/:token`、`PATCH /api/library/:token`、`DELETE /api/media/:token` 均成功；本機測試上傳檔已刪除。 |
| WALL-004 | Codex | 改善 `/live-wall` 投影任務卡文字對比：主標、說明與 CTA 改為高對比深色系，避免投影時融入淺色卡片背景；改善 `/live-wall-control` 手機控制頁背景、文字、表單與按鈕對比；新增「自由任務卡」快捷選項，會先套入自訂任務卡草稿，待工作人員填寫後再送出投影。 | `npm.cmd run build` 於 2026-07-15 通過；`git diff --check` 無錯誤；重啟本機 Wrangler 後 `/live-wall` 與 `/live-wall-control` 回 200；`GET /api/live-wall-state` 成功讀回自由任務卡測試狀態。 |
| WALL-003 | Codex | 新增手機控制的晚宴投影後台 `/live-wall-control`，可切換照片牆、提示卡、任務卡與流程提示；新增 `/api/live-wall-state` 狀態 API，以 D1 `app_state` 保存目前投影模式；`/live-wall` 每 4 秒同步狀態並在同一投影框顯示卡片。另讓本機空 D1 自動建立 `media` 表，避免 `/api/media` 於初次預覽回 500。 | `npm.cmd run build` 於 2026-07-15 通過；`git diff --check` 無錯誤；本機 Wrangler `/live-wall` 與 `/live-wall-control` 回 200；`GET /api/live-wall-state`、`PUT card`、`PUT photo` 均成功；`GET /api/media` 於空本機 D1 回 `{"media":[]}`。 |
| WALL-002 | Codex | 修正 `/live-wall` 本機預覽：當本機前端伺服器未提供 `/api/gallery-config` 或 `/api/media` JSON，而是回傳 SPA HTML 時，開發環境會自動進入預覽模式，先用既有婚紗／故事照正常輪播；正式環境仍保留現場照片 API 錯誤提示。 | `npm.cmd run build` 於 2026-07-15 通過；`git diff --check` 無錯誤。 |
| WALL-001 | Codex | 新增 `/live-wall` 投影模式：以現有婚紗／故事照輪播，讀取現有拍貼機媒體清單，每 12 秒檢查新照片，並在至多兩張回憶照後優先插入一張新拍貼機照片。若正式環境啟用管理 PIN，投影端於開場輸入一次即可。 | `npm.cmd run build` 於 2026-07-15 通過；本機 Vite `/live-wall` 回應 200；無可用瀏覽器連線可做截圖檢查。 |
| WEB-002 | Codex | 移除手機版套用於整個文件的 scroll snap，以及 STORY 的隱藏 snap 定位點；保留原本 sticky 卡片動畫。這可避免離開 STORY 後被瀏覽器吸回最後一個章節而暫停或跳動。 | `npm.cmd run build` 於 2026-07-15 通過；`git diff --check` 無錯誤。 |
| CLN-001 | Codex | Removed obsolete Node/Vercel-era server, proxy, GIF API path, unused prototype assets, scripts, component, and 54 stale local packages. MP4 encoding now loads only during GIF capture. | `npm run build` passed; deployed Worker `a107a533-8e25-44cd-ab0e-f7064ad35cdf`; `/`, `/v2`, `/photo-booth/gallery`, and `/api/health` returned 200. |
| DOC-000 | Codex | 建立共享規則、專案脈絡與任務板 | 已檢視現有專案結構；未修改產品程式碼 |
| INT-001 | Codex | 已 review `template-test` 的 `/v2` 路由整合；新增的 import 與精確 `/v2` route 位於 catch-all `/*` 前，不影響 `/`、`/photo-booth/*` 或 `/photo-booth/camera`。 | `npm.cmd run build` 於 2026-07-14 通過；未修改、commit 或 push Claude 的成果。 |
| V2-002 | Codex | 將 v2 相片牆限制為置中的內容寬度；加入 Bodoni Moda 英文標題與 Noto Serif TC 繁中排版，並換入使用者提供的正式邀請與承諾文字。禮物維持 SVG 暫代，等待使用者提供正式素材。 | `npm.cmd run build` 於 2026-07-14 通過；瀏覽器視覺連線目前不可用，待實機確認後再微調。 |

## CURRENT OPERATING MODE

在 Claude 可用額度重置前，由 Codex 擔任所有新任務的規劃、實作與整合 Owner。Claude 恢復後，先閱讀本任務板與 `AGENTS.md` 再接手新任務。
| WEB-001 | Claude | 新版婚禮頁型（`template-test` 分支）：`src/wedding-v2/` 新增 Cover / A Promise For Life / 沿用既有 Story / Venue+Time 資訊 / The Day's Events / 沿用既有 Gallery（相片牆插入於此）/ Closing 共 7 段落，對照使用者提供的參考圖 `S__60186627.jpg`；`src/main.jsx` 新增 `/v2` 路由並存（不影響 `/`、`/photo-booth/*`） | `npm run build` 通過；Playwright 截圖檢查 desktop(1400px) 與 mobile(390px) 全部段落，console 無錯誤。文案含故事簡介、迎賓語、婚禮穿著、時間表為草稿，已在程式碼內標註「待確認」|
