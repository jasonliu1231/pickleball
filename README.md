# 匹克球預約網頁版

這是一個獨立的純網頁專案，對應球友端預約 App 的功能，不需要 Expo、不需要 npm install。

## 檔案說明

- `index.html`：預約網站主頁，包含首頁說明、公告、小知識、月曆預約、取消預約。
- `DATABASE_SETUP.sql`：Supabase 資料表與函式設定。
- `vercel.json`：Vercel 部署設定。
- `.gitignore`：Git 忽略檔案。

## 功能

- 首頁簡單介紹
- 公告與提醒
- 匹克球小知識
- 月曆選擇日期
- 顯示當天可報名團體
- 填寫暱稱、手機、新手狀態、備註後報名
- 使用報名手機取消預約
- 查看已報名名單，手機遮罩顯示

## 修改公告與小知識

目前公告與小知識寫在 `index.html` 裡，搜尋以下區塊即可修改：

- `公告與提醒`
- `匹克球小知識`
- `常見問題`

## 部署方式

可以直接部署到：

- Vercel
- Netlify
- Cloudflare Pages
- 一般靜態網站空間
- NAS 靜態網站

如果使用 Vercel，直接上傳整個專案或連接 GitHub 即可。

## Supabase 設定

若資料庫尚未建立，請先到 Supabase SQL Editor 執行：

```text
DATABASE_SETUP.sql
```

若 App 端已經正常使用同一組 Supabase，通常不用重新執行 SQL。


## 本版更新

- 將首頁主要內容整理成分頁：線上預約、公告、小知識、常見問題。
- 公告內容已對應 App 內 `data/announcements.js` 的資料。
- 小知識內容已對應 App 內 `data/knowledgeItems.js` 的資料，包含圖片與標籤。
- 預約功能仍維持原本 Supabase 資料與流程。

## 會員與備取機制更新

前台已支援：

- 正取人數達上限後，報名按鈕改為「加入備取」。
- 報名成功後會依後端結果顯示「正取」或「備取」。
- 人數顯示封頂，不會顯示超過開團上限的數字。
- 名單會分成正取名單與備取名單，並標示固定會員。

部署前請先在 Supabase SQL Editor 執行後台專案內的 `MEMBER_WAITLIST_MIGRATION.sql`。


## 會員請假電話判斷

前台「取消預約」已整合會員請假：一般報名者輸入電話會取消 signups；固定會員輸入電話會新增 member_absences，當天不列入名單並釋出名額。

## Next.js 前台說明

這版前台已改為 Next.js App Router 結構，正式入口為：

- `app/layout.jsx`
- `app/page.jsx`
- `app/globals.css`
- `public/booking-app.js`

已移除舊版根目錄 `index.html`，部署時請使用 Next.js 指令：

```bash
npm install
npm run dev
# 或正式環境
npm run build
npm run start
```

Vercel 會依 `vercel.json` 的 `framework: nextjs` 使用 Next.js 建置，不再走靜態 index。

