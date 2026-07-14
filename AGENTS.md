# AI 協作規則

開始工作前請閱讀：

1. `AGENTS.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/AI_BOARD.md`

## 工作方式

- 開始程式或部署修改前，在 `docs/AI_BOARD.md` 建立或認領任務；完成後移至 DONE 並記錄驗證結果。
- 目前唯一正式分支為 `master`；Cloudflare Workers、R2、D1、Durable Objects 是唯一部署架構。
- 不提交 secrets、Cloudflare API tokens、`ADMIN_PIN`、`.env` 或測試媒體檔。
- 修改前端、Worker 或建置設定後，至少執行 `npm run build`；Cloudflare 行為異動再執行 `npm run cf:deploy`。
- 共用高風險檔案（`src/App.jsx`、`src/main.jsx`、`src/app.css`、`src/data/constants.js`、`package.json`、`vite.config.js`、`wrangler.jsonc`）一次由一位 agent 修改。
