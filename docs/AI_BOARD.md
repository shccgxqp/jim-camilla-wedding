# AI Task Board

此檔是 Claude 與 Codex 的共享即時白板。每次開始、阻塞或完成一個任務時都必須更新。

最後更新：2026-07-14

## IN PROGRESS

| STORY-005 | Reduce double-layer polaroid frame thickness while retaining a visible Story border | Codex | master | `src/wedding/wedding.css`, deployment | 2026-07-16 | DONE — build and diff check passed; deployed Worker `b0f55920-f425-4e9a-aa36-06bfe31f34ef`. Reduced total side/top white frame from 48px to 22px and reduced bottom frame spacing. |

| STORY-004 | Make Story polaroid borders unmistakable, prevent desktop captions clipping, and lift mobile title | Codex | master | `src/wedding/wedding.css`, deployment | 2026-07-16 | DONE — build and diff check passed; deployed Worker `a6d0105d-6db2-4461-bf29-a5dbfab6fffb`. Added explicit 24px/58px white overlay frame, lifted desktop stack to 47%, and moved mobile title to the top safe area. |

| STORY-003 | Strengthen the visible white polaroid borders on desktop and mobile Story cards | Codex | master | `src/wedding/wedding.css`, deployment | 2026-07-16 | DONE — build and diff check passed; deployed Worker `a575ec67-14e8-4648-9d81-ea79d2f3b554`. Desktop border is now 24px with 52px bottom margin; mobile uses 24px side/top and 48px bottom margin. |

| STORY-002 | Remove mobile chapter counter and restore a visibly polaroid-style Story photo frame | Codex | master | `src/wedding/sections/Story.jsx`, `src/wedding/wedding.css`, deployment | 2026-07-16 | DONE — build and diff check passed; deployed Worker `1839a014-d30e-4f04-ab92-dcb71148a9eb`. Removed the counter and restored a white polaroid frame with thicker border, lower caption margin, and stronger shadow. |

| STORY-001 | Improve mobile Story scroll settling and make chapter text transitions more legible | Codex | master | `src/wedding/sections/Story.jsx`, `src/wedding/wedding.css`, deployment | 2026-07-16 | DONE — build and diff check passed; deployed Worker `583d2d51-c905-421b-a70c-23dae64e7224`. Mobile uses near-only magnetic settling, longer chapter dwell, decisive text handoff, and visible chapter progress. |

| MEDIA-005 | Restore existing Git photo captions into the matching R2/D1 library records | Codex | master | Git history, `/api/library`, D1 media captions | 2026-07-16 | DONE — restored and verified 21 captions: 11 photo-wall, 3 site-top, and 7 Story records. New upload `S__11337732.jpg` was intentionally left blank because no Git caption exists. |

| MEDIA-004 | Compact photo-wall management preview thumbnails without changing public gallery layout | Codex | master | `src/screens/photo-library.css`, deployment | 2026-07-16 | DONE — build and diff check passed; deployed Worker `664e586c-41dc-4411-94fa-a9cb73e632b8`. Desktop preview thumbnails are 128px (148px for first-row emphasis); mobile thumbnails are 112px. |

| ID | Task | Owner | Branch / worktree | Files / scope | Started | Status |
| --- | --- | --- | --- | --- | --- | --- |
| MEDIA-003 | Replace numeric photo ordering with collection-specific visual previews, drag-and-drop ordering, and explicit save/discard actions | Codex | master | `src/screens/PhotoLibraryPage.jsx`, `photo-library.css`, deployment | 2026-07-16 | DONE — build and diff check passed; deployed visual draft editor. `/photo-library` returns 200 and photo-wall API returns 12 R2 photos, including the newly added `S__11337732.jpg`. |
| MEDIA-002 | Verify responsive R2 photo rendering and improve gallery auto-layout plus photo-library management controls | Codex | master | `src/wedding/**`, `src/screens/PhotoLibraryPage.jsx`, styles, deployment | 2026-07-16 | DONE — build and diff check passed; deployed Worker `87ac2715-9565-497c-a404-b2ebd83f3b4b`. Gallery handles 1–3 photos with dedicated responsive layouts and repeats the collage pattern beyond that; library now shows collection counts and supports automatic append plus move-forward/back ordering. |
| MEDIA-001 | Move wedding photo sources from Git-tracked public files to R2/D1 and provide explicit self-managed site-top, Story, photo-wall, and lunch-live libraries | Codex | master | `cloudflare/**`, wedding media pages/API, R2 migration/docs | 2026-07-16 | DONE — deployed Worker `7a8cfe19-1c09-470e-b3c9-b0fab0ea98e5`; migrated 3 site-top, 7 Story, and 11 photo-wall images to R2/D1; public collection and private media read verified (200 image/jpeg). |

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
| WEB-005 | Codex | V2 婚禮資訊已補上 2F 天翼廳（Le Ciel）；婚禮穿著改為著裝建議，加入白、藍、灰低飽和色票；交通摘要更新為文湖線松山機場站與可展開的停車詳情。 | `npm.cmd run build` 於 2026-07-20 通過；`git diff --check` 無錯誤。 |
| WEB-004 | Codex | 已將目前 V2 的封面、承諾段落與倒數文案更新提交至 GitHub 並發布到 Cloudflare 正式 Worker。 | `npm.cmd run build`、`git diff --check` 通過；Cloudflare Worker version `eb855ab4-e1c2-48fa-89a4-123904ef95cc` 已部署。 |
| WEB-003 | Codex | V2 封面姓名改為「Jim & Camilla」並增加字距、日期列移除 Le Ciel；A Promise For Life 拉開字距與行距，並換入指定的四段故事文案及換行。 | `npm.cmd run build` 於 2026-07-20 通過；`git diff --check` 無錯誤。 |
| VENUE-002 | Codex | 已將 V2 翡麗詩莊園地點、Google 地圖連結與可展開交通資訊發布至 Cloudflare 正式 Worker。 | `npm.cmd run cf:deploy` 於 2026-07-17 通過；Worker version `bbe52c25-1fbf-4e7d-9cf8-165786d0ce04`。 |
| VENUE-001 | Codex | V2 地點資訊改為翡麗詩莊園、敦化北路地址與可直接開啟的 Google 地圖；交通列以捷運與停車摘要呈現，點擊後展開代客泊車、周邊停車場、捷運與公車站點。 | `npm.cmd run build` 於 2026-07-17 通過；`git diff --check` 無錯誤。 |
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
