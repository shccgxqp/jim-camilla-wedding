# Claude / Codex handoff

本專案的唯一正式架構是 Cloudflare Workers + R2 + D1 + Durable Objects；Vercel 與 Node `server.cjs` 已移除。

開始工作前閱讀 `AGENTS.md`、`docs/PROJECT_CONTEXT.md`、`docs/AI_BOARD.md` 與 `docs/CLOUDFLARE_RUNBOOK.md`。

常用指令：

```powershell
npm run build
npm run cf:dev
npm run cf:deploy
```

- Worker：`cloudflare/worker.js`
- 設定與綁定：`wrangler.jsonc`
- 媒體：R2 私有 bucket；媒體資料：D1；遠端相機：Durable Object。
- `ADMIN_PIN` 僅存在 Cloudflare Worker secret，不可寫入 Git。
