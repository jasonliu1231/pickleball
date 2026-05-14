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
