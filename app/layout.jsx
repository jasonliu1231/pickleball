import Script from "next/script";
import Navbar from "./Navbar";
import SupabaseBridge from "./SupabaseBridge";
import "./globals.css";

export const metadata = {
  title: "匹克球同樂會｜線上預約",
  description: "匹克球同樂會線上預約，查看公告、小知識與可報名場次。",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 自動建置版本號（每次改版升級自動使瀏覽器載入最新腳本，杜絕快取錯誤）
const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.7.2";

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://jynbpziqitriicruwqlz.supabase.co" crossOrigin="" />
        <link rel="dns-prefetch" href="https://jynbpziqitriicruwqlz.supabase.co" />
      </head>
      <body>
        {/* 本機打包之 Supabase Client，安全可靠且不依賴外部 CDN */}
        <SupabaseBridge />
        
        <main className="page">
          <header className="topbar">
            <div className="topbar-brand-row">
              <a className="brand" href="/" aria-label="回到首頁">
                <img src="/logo.png" alt="匹克球同樂會 Logo" className="brand-logo" width="38" height="38" />
                <span className="brand-title">匹克球同樂會</span>
              </a>
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* 🔔 通知中心小鈴鐺 */}
                <button
                  id="headerNotificationBtn"
                  type="button"
                  aria-label="通知中心"
                  title="通知中心"
                  style={{
                    display: "none",
                    position: "relative",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    padding: 0,
                  }}
                >
                  <span style={{ fontSize: "17px", lineHeight: "1" }}>🔔</span>
                  <span
                    id="headerNotificationBadge"
                    style={{
                      display: "none",
                      position: "absolute",
                      top: "-4px",
                      right: "-4px",
                      background: "#ef4444",
                      color: "#ffffff",
                      fontSize: "10.5px",
                      fontWeight: "900",
                      padding: "1px 5px",
                      borderRadius: "999px",
                      border: "2px solid #ffffff",
                      lineHeight: "13px",
                    }}
                  >0</span>
                </button>

                <a id="headerWelcome" href="/member" style={{ display: "none", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "800", color: "#1d4ed8", textDecoration: "none", padding: "6px 14px", background: "#eff6ff", borderRadius: "100px", border: "1px solid #bfdbfe", transition: "all 0.2s ease" }}></a>
              </div>
            </div>

            <Navbar />
          </header>

          {children}

          {/* Global Phone Binding Modal (Shown when logged in but phone is missing) */}
          <div className="modal" id="bindPhoneModal">
            <div className="modal-card">
              <div className="modal-head">
                <div>
                  <h2 className="section-title" style={{ fontSize: "22px" }}>📱 歡迎加入！請完成手機綁定</h2>
                  <p className="muted" style={{ fontSize: "13.5px", marginTop: "4px" }}>
                    填寫手機號碼後，系統將自動為您連結各球館儲值金、活動預約紀錄，並開啟「1 鍵快速報名」！
                  </p>
                </div>
                <button className="close-btn" id="closeBindPhoneModal" type="button">×</button>
              </div>
              <form className="form" id="bindPhoneForm">
                <label>姓名 / 暱稱
                  <input id="bindNickname" placeholder="例如：小明" required />
                </label>
                <label>手機號碼
                  <input id="bindPhone" placeholder="0912345678" inputMode="numeric" autoComplete="tel" required />
                  <span className="muted" style={{ fontSize: "12.5px" }}>電話僅作為球館儲值金對接、取消預約識別與遞補通知使用。</span>
                </label>
                <label>球技程度
                  <select id="bindSkillLevel" defaultValue="beginner">
                    <option value="first_time">需教學 (2.0 以下)</option>
                    <option value="beginner">初學 (2.0 - 2.5)</option>
                    <option value="normal">一般 (2.5 - 3.0)</option>
                    <option value="advanced">進階 (3.0 以上)</option>
                  </select>
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                  <button className="btn-primary" id="bindPhoneSubmitBtn" type="submit" style={{ width: "100%", height: "46px" }}>
                    立即綁定並連結資料
                  </button>
                  <button className="btn-secondary" id="skipBindPhoneBtn" type="button" style={{ width: "100%", height: "42px", color: "var(--muted)", background: "#f8fafc", border: "1px solid var(--line)" }}>
                    稍後再說
                  </button>
                </div>
              </form>
              <div className="message" id="bindPhoneMessage"></div>
            </div>
          </div>

          {/* Global Notification Center Modal */}
          <div className="modal" id="notificationModal">
            <div className="modal-card" style={{ maxWidth: "560px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
              <div className="modal-head" style={{ paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 className="section-title" style={{ fontSize: "20px", margin: 0 }}>🔔 通知中心</h2>
                  <span id="notifModalUnreadCount" style={{ display: "none", background: "#ef4444", color: "#fff", fontSize: "11px", fontWeight: "900", padding: "1px 8px", borderRadius: "999px" }}>0 則未讀</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button id="markAllReadBtn" type="button" style={{ display: "none", fontSize: "12px", fontWeight: "800", color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "4px 10px", borderRadius: "8px", cursor: "pointer" }}>一鍵全部已讀</button>
                  <button className="close-btn" id="closeNotificationModal" type="button">×</button>
                </div>
              </div>

              {/* Category Filter Chips */}
              <div id="notifCategoryBar" style={{ display: "flex", gap: "6px", overflowX: "auto", padding: "10px 0 8px 0", borderBottom: "1px solid #f8fafc" }}>
                <button type="button" className="notif-tab notif-tab-active" data-cat="all">全部</button>
                <button type="button" className="notif-tab" data-cat="match_reminder">⏰ 球聚提醒</button>
                <button type="button" className="notif-tab" data-cat="waitlist_update">🎉 遞補通知</button>
                <button type="button" className="notif-tab" data-cat="billing_balance">💳 帳戶扣款</button>
                <button type="button" className="notif-tab" data-cat="announcement">📢 公告異動</button>
              </div>

              {/* Notification List Container */}
              <div id="notifListContainer" style={{ flex: 1, overflowY: "auto", padding: "10px 0", minHeight: "240px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div id="notifEmptyState" style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>📭</div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#475569" }}>目前沒有通知紀錄</div>
                  <div style={{ fontSize: "12.5px", marginTop: "4px" }}>開賽前 2 小時提醒、遞補與扣款通知都會顯示在這裡。</div>
                </div>
                <div id="notifItemsWrap" style={{ display: "flex", flexDirection: "column", gap: "8px" }}></div>
              </div>
            </div>
          </div>

          <footer className="footer">匹克球同樂會｜線上預約系統</footer>
        </main>

        <Script
          src={`/booking-app.js?v=${BUILD_VERSION}`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
