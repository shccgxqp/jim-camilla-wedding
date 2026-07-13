# Jim & Camilla — 2026.11.07

這個網站,是為了紀念我們的愛情而做的。

裡面有我們的故事、婚禮資訊,還有一台給大家玩的拍貼機 —— 掃個 QR code,拍張照,把這天的笑容帶回家。

謝謝你來看這個網站,也謝謝你來參加我們的婚禮。
願你也被好好愛著,也好好愛人。

—— Jim & Camilla

## 這裡有什麼

- **我們的故事** —— 從相遇到求婚,一路走來的七個章節
- **婚禮資訊** —— 時間地點、交通方式、倒數計時
- **RSVP** —— 線上回覆是否出席
- **拍貼機** —— 現場選版型、拍照或錄影,自動合成相框,掃 QR code 就能把照片/影片存到手機
- **iPhone 遠端鏡頭** —— iPad 當螢幕、iPhone 當鏡頭,拍出更好看的照片
- **賓客下載頁** —— 手機、LINE、iOS/Android 都能順利存檔留念

---

## Run

```bash
npm install
npm start
```

開 `http://localhost:3000`。正式上線需要 HTTPS(iPad/手機鏡頭權限要求)。

## Configure

編輯 `config/wedding.json`:新人姓名、婚期、主題色、倒數秒數、對外網址(`publicBaseUrl`,QR code 會用它)。
