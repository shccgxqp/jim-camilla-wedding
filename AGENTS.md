# AI 協作規則

本專案可同時由 Claude 與 Codex 協作。所有 agent 在開始工作前，均須閱讀：

1. `AGENTS.md`（本檔）
2. `docs/PROJECT_CONTEXT.md`
3. `docs/AI_BOARD.md`

## 任務認領與狀態

- 開始修改程式前，先在 `docs/AI_BOARD.md` 的 **IN PROGRESS** 認領任務。
- 每個任務必須標明 Owner、分支或 worktree、允許修改的檔案及驗收條件。
- 完成後，將任務移至 **DONE**，填寫修改摘要與驗證結果。
- 不能完成或需要別人處理時，標為 **BLOCKED**，寫明原因；不要自行擴大範圍。
- 若任務、檔案或 Owner 不明確，先新增 **READY** 任務卡，等待使用者或整合者指定。

## 檔案鎖定

- `AI_BOARD.md` 的「鎖定檔案」代表該任務正在修改的範圍。
- 不得修改其他進行中任務鎖定的檔案；先協調、分拆或等候任務結束。
- 不在任務範圍的既有變更均視為使用者或其他 agent 的工作，不得覆寫或還原。

## 共用高風險檔案

下列檔案一次只允許一位 Owner 修改，預設由 Codex 負責整合：

- `src/App.jsx`
- `src/main.jsx`
- `src/app.css`
- `src/data/constants.js`
- `server.cjs`
- `package.json`
- `vite.config.js`

Claude 若需要修改上述檔案，應先在任務板建立「整合請求」；Codex 實作或明確轉讓 Owner 後才可修改。

## 分支與交付

- 一項可獨立交付的工作使用一個分支或 `git worktree`。
- 分支格式：`feat/<area>-<summary>`、`fix/<area>-<summary>`、`docs/<summary>`。
- 影響前端或建置設定的變更，交付前執行 `npm run build`。
- 交付內容必須包括：修改摘要、實際變更檔案、驗證結果、已知限制或後續工作。

## 建議責任分工

| 領域 | 主要 Owner | 另一方角色 |
| --- | --- | --- |
| 婚禮網站內容、版面、使用流程 | Claude | Codex 做技術與回歸 review |
| 拍貼機、相機、Canvas、WebRTC、上傳與伺服器 | Codex | Claude 做體驗 review |
| 共用入口、設定與整合 | Codex | Claude 提出規格與驗收 |
| 文案、視覺方向、RWD 體驗驗收 | Claude | Codex 提供可行性意見 |
