# Jim & Camilla Wedding

婚禮網站與拍貼機，部署於 Cloudflare Workers。

## 架構

- React + Vite：婚禮頁、拍貼機、GIF 與 IG MP4
- Cloudflare Workers：網站、上傳、QR 下載、照片管理
- R2：私有媒體檔
- D1：媒體索引
- Durable Objects：iPhone 遠端相機配對

## 開發

```powershell
npm install
npm run cf:dev
```

部署前：

```powershell
npm run build
npm run cf:deploy
```

詳細操作見 `docs/CLOUDFLARE_RUNBOOK.md`。
