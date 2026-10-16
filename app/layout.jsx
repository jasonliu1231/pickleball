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
const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.8.5";

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
              
              {/* 電腦版右上角功能區：App 下載 + 小鈴鐺 + 問候膠囊 */}
              <div className="topbar-right-desktop">
                {/* 📱 下載手機 App 按鈕 */}
                <button
                  id="headerAppDownloadBtn"
                  type="button"
                  aria-label="下載手機 App"
                  title="下載「匹克同樂會」App (iOS / Android)"
                  className="header-app-btn"
                >
                  <span style={{ fontSize: "15px", lineHeight: "1" }}>📱</span>
                  <span className="header-app-text">App 下載</span>
                  <span className="header-app-tag">iOS 正式版</span>
                </button>

                {/* 🔔 通知中心小鈴鐺 */}
                <button
                  id="headerNotificationBtn"
                  type="button"
                  aria-label="通知中心"
                  title="通知中心"
                  className="header-notif-btn"
                >
                  <span style={{ fontSize: "17px", lineHeight: "1" }}>🔔</span>
                  <span
                    id="headerNotificationBadge"
                    className="notif-badge"
                    style={{ display: "none" }}
                  >0</span>
                </button>

                <a id="headerWelcome" href="/member" style={{ display: "none" }}></a>
              </div>

              {/* 手機版：漢堡選單按鈕 (含未讀紅點) */}
              <button
                id="hamburgerBtn"
                type="button"
                className="hamburger-btn"
                aria-label="開啟功能選單"
              >
                <span className="hamburger-icon">☰</span>
                <span id="hamburgerNotifDot" className="hamburger-dot" style={{ display: "none" }}></span>
              </button>
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

          {/* Global App Download Modal */}
          <div className="modal" id="appDownloadModal">
            <div className="modal-card app-download-modal-card">
              <div className="modal-head" style={{ paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <h2 className="section-title" style={{ fontSize: "21px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📱</span> 下載「匹克同樂會」App
                  </h2>
                  <p className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>
                    專為球友打造的行動體驗，享受更即時的活動與比賽推播通知！
                  </p>
                </div>
                <button className="close-btn" id="closeAppDownloadModal" type="button">×</button>
              </div>

              <div className="app-download-modal-body">
                {/* App 特色亮點 */}
                <div className="app-benefits-grid">
                  <div className="app-benefit-item">
                    <span className="app-benefit-icon">⏰</span>
                    <div>
                      <strong>開賽前 2 小時提醒</strong>
                      <p>手機主動推播開賽時間與球館，不怕忘記打球！</p>
                    </div>
                  </div>
                  <div className="app-benefit-item">
                    <span className="app-benefit-icon">🎉</span>
                    <div>
                      <strong>候補即時轉正通知</strong>
                      <p>候補成功第一時間推播提醒，立刻鎖定上場名額。</p>
                    </div>
                  </div>
                  <div className="app-benefit-item">
                    <span className="app-benefit-icon">⚡</span>
                    <div>
                      <strong>1 鍵極速報名</strong>
                      <p>綁定帳號後一鍵秒報名，查看跨場儲值金與對戰戰績！</p>
                    </div>
                  </div>
                </div>

                {/* 雙平台下載區塊 */}
                <div className="app-platforms-container">
                  {/* iOS 區塊 (已審核通過上架) */}
                  <div className="app-platform-card ios-card">
                    <div className="app-platform-title-row">
                      <span className="platform-icon">🍎</span>
                      <div>
                        <h3 className="platform-title">iOS 版本 (iPhone / iPad)</h3>
                        <span className="platform-status-badge badge-success">官方 App Store 正式上架</span>
                      </div>
                    </div>
                    <p className="platform-desc">支援 iOS 15.0 以上版本，可直接前往 App Store 免費下載安裝。</p>
                    
                    <div style={{ marginBottom: "12px" }}>
                      <a 
                        href="https://apps.apple.com/tw/app/%E5%8C%B9%E5%85%8B%E5%90%8C%E6%A8%82%E6%9C%83/id6759153714" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-appstore"
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.61 1.34-.55.63-1.03 1.68-.9 2.7 1 .08 2.03-.51 2.59-1.19z"/>
                        </svg>
                        <span>前往 App Store 下載</span>
                      </a>
                    </div>

                    <div className="app-qr-row">
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https%3A%2F%2Fapps.apple.com%2Ftw%2Fapp%2F%25E5%258C%25B9%25E5%2585%258B%25E5%2590%258C%25E6%25A8%2582%25E6%259C%2583%2Fid6759153714" 
                        alt="iOS App Store 下載 QR Code"
                        className="app-qr-img"
                        width="88"
                        height="88"
                      />
                      <div className="app-qr-hint">
                        <span className="qr-badge">iPhone 掃碼下載</span>
                        <p>拿起 iPhone 相機對準此 QR Code，即可直接秒開 App Store 下載頁面。</p>
                      </div>
                    </div>
                  </div>

                  {/* Android 測試 ＆ 團主開團專區 (精簡整併) */}
                  <div className="app-platform-card other-services-card">
                    <div className="other-services-grid">
                      <div className="other-service-item">
                        <div className="other-service-title">
                          <span className="platform-icon" style={{ fontSize: "18px" }}>🤖</span>
                          <strong>Android 安卓版</strong>
                          <span className="platform-status-badge badge-testing">測試中</span>
                        </div>
                        <p className="other-service-desc">搶先體驗安裝測試</p>
                      </div>

                      <div className="other-service-divider" />

                      <div className="other-service-item">
                        <div className="other-service-title">
                          <span className="platform-icon" style={{ fontSize: "18px" }}>👑</span>
                          <strong>團主開團 App</strong>
                          <span className="platform-status-badge badge-organizer">主理人</span>
                        </div>
                        <p className="other-service-desc">固定開團管理系統</p>
                      </div>
                    </div>

                    <p className="other-service-lead">
                      如果需要請私訊工程師洽詢。
                    </p>

                    <a 
                      href="https://line.me/ti/p/~nagic1596" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-contact-line btn-full"
                    >
                      <span>💬 私訊工程師 (LINE)</span>
                    </a>

                    <p className="other-service-disclaimer">
                      ※ 免責聲明：本系統純屬球友社群交流推廣，完全免費、不收取任何費用。
                    </p>
                  </div>
                </div>

                {/* 網頁版免安裝提示 */}
                <div className="web-fallback-note">
                  💡 <strong>不想下載 App 也沒問題！</strong>本預約系統網頁版手機瀏覽器皆完美相容，隨開即用！
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          <div id="mobileDrawerOverlay" className="mobile-drawer-overlay">
            <div className="mobile-drawer-backdrop" id="drawerBackdrop"></div>
            <div className="mobile-drawer-panel">
              <div className="drawer-header">
                <div id="drawerUserWelcome" className="drawer-user-info">
                  <span className="drawer-greeting-title">👋 歡迎光臨！</span>
                </div>
                <button id="closeDrawerBtn" className="drawer-close-btn" type="button" aria-label="關閉選單">×</button>
              </div>

              <div className="drawer-content">
                {/* 📱 漢堡選單內的 App 下載專區 */}
                <button id="drawerAppDownloadBtn" type="button" className="drawer-item-app">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>📱</span>
                    <span style={{ fontWeight: "800", fontSize: "15px", color: "#047857" }}>App 下載專區</span>
                  </div>
                  <span className="drawer-app-badge">iOS 已上架</span>
                </button>

                {/* 🔔 漢堡選單內的通知中心按鈕 */}
                <button id="drawerNotificationBtn" type="button" className="drawer-item-notif">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>🔔</span>
                    <span style={{ fontWeight: "800", fontSize: "15px", color: "#1e3a8a" }}>通知中心</span>
                  </div>
                  <span id="drawerNotifBadge" className="drawer-notif-badge" style={{ display: "none" }}>0 則未讀</span>
                </button>

                <div className="drawer-divider"></div>

                <nav className="drawer-nav-list">
                  <a href="/" className="drawer-nav-link">
                    <span className="drawer-nav-icon">📅</span>
                    <span className="drawer-nav-text">立即預約</span>
                  </a>
                  <a href="/schedule" className="drawer-nav-link">
                    <span className="drawer-nav-icon">⏱️</span>
                    <span className="drawer-nav-text">賽程排班</span>
                  </a>
                  <a href="/notice" className="drawer-nav-link">
                    <span className="drawer-nav-icon">📢</span>
                    <span className="drawer-nav-text">最新公告</span>
                  </a>
                  <a href="/knowledge" className="drawer-nav-link">
                    <span className="drawer-nav-icon">💡</span>
                    <span className="drawer-nav-text">匹克球小知識</span>
                  </a>
                  <a href="/faq" className="drawer-nav-link">
                    <span className="drawer-nav-icon">❓</span>
                    <span className="drawer-nav-text">常見問題</span>
                  </a>
                  <a href="/member" className="drawer-nav-link drawer-nav-member">
                    <span className="drawer-nav-icon">👤</span>
                    <span className="drawer-nav-text">會員個人中心</span>
                  </a>
                </nav>
              </div>

              <div className="drawer-footer">
                <button id="drawerLogoutBtn" type="button" className="drawer-logout-btn" style={{ display: "none" }}>
                  🚪 登出帳號
                </button>
              </div>
            </div>
          </div>

          <footer className="footer">
            <span>匹克球同樂會｜線上預約系統</span>
            <span style={{ margin: "0 8px", opacity: 0.4 }}>•</span>
            <button id="footerAppDownloadBtn" type="button" style={{ background: "none", border: "none", color: "var(--primary, #2563eb)", fontWeight: "700", cursor: "pointer", textDecoration: "underline", fontSize: "13px" }}>
              📱 下載手機 App (iOS / Android)
            </button>
          </footer>
        </main>

        <Script
          src={`/booking-app.js?v=${BUILD_VERSION}`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
