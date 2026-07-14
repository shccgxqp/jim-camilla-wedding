# AI Task Board

此檔是 Claude 與 Codex 的共享即時白板。每次開始、阻塞或完成一個任務時都必須更新。

最後更新：2026-07-14

## IN PROGRESS

目前沒有已認領任務。

| ID | Task | Owner | Branch / worktree | Files / scope | Started | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CF-001 | Cloudflare parallel deployment: Worker static site, R2/D1 photo storage migration, and feature verification | Codex | feat/cloudflare-parallel | `cloudflare/**`, `wrangler.jsonc`, upload/API integration, docs | 2026-07-14 | IN PROGRESS — OAuth and D1 ready; waiting for workers.dev + R2 activation; Vercel remains production |

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
| DOC-000 | Codex | 建立共享規則、專案脈絡與任務板 | 已檢視現有專案結構；未修改產品程式碼 |
| INT-001 | Codex | 已 review `template-test` 的 `/v2` 路由整合；新增的 import 與精確 `/v2` route 位於 catch-all `/*` 前，不影響 `/`、`/photo-booth/*` 或 `/photo-booth/camera`。 | `npm.cmd run build` 於 2026-07-14 通過；未修改、commit 或 push Claude 的成果。 |
| V2-002 | Codex | 將 v2 相片牆限制為置中的內容寬度；加入 Bodoni Moda 英文標題與 Noto Serif TC 繁中排版，並換入使用者提供的正式邀請與承諾文字。禮物維持 SVG 暫代，等待使用者提供正式素材。 | `npm.cmd run build` 於 2026-07-14 通過；瀏覽器視覺連線目前不可用，待實機確認後再微調。 |

## CURRENT OPERATING MODE

在 Claude 可用額度重置前，由 Codex 擔任所有新任務的規劃、實作與整合 Owner。Claude 恢復後，先閱讀本任務板與 `AGENTS.md` 再接手新任務。
| WEB-001 | Claude | 新版婚禮頁型（`template-test` 分支）：`src/wedding-v2/` 新增 Cover / A Promise For Life / 沿用既有 Story / Venue+Time 資訊 / The Day's Events / 沿用既有 Gallery（相片牆插入於此）/ Closing 共 7 段落，對照使用者提供的參考圖 `S__60186627.jpg`；`src/main.jsx` 新增 `/v2` 路由並存（不影響 `/`、`/photo-booth/*`） | `npm run build` 通過；Playwright 截圖檢查 desktop(1400px) 與 mobile(390px) 全部段落，console 無錯誤。文案含故事簡介、迎賓語、婚禮穿著、時間表為草稿，已在程式碼內標註「待確認」|
