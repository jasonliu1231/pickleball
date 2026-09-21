import Script from "next/script";
import Navbar from "./Navbar";
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

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        <Script
          src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
          strategy="beforeInteractive"
        />
        
        <main className="page">
          <header className="topbar">
            <a className="brand" href="/" aria-label="回到首頁">
              <span className="logo">🏓</span>
              <span>匹克球同樂會</span>
            </a>
            
            <a id="headerWelcome" href="/member" style={{ display: "none", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "800", color: "#0d9488", textDecoration: "none", padding: "6px 14px", background: "#f0fdf4", borderRadius: "100px", border: "1px solid #bbf7d0", transition: "all 0.2s ease" }}></a>

            <Navbar />
          </header>

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
                  <select id="bindSkillLevel" defaultValue="normal">
                    <option value="first_time">第一次 (需要教學)</option>
                    <option value="beginner">初學 (已會基本規則)</option>
                    <option value="normal">一般 (能流暢來回對打)</option>
                    <option value="advanced">進階 (有戰術強攻能力)</option>
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

          <footer className="footer">匹克球同樂會｜線上預約系統</footer>
        </main>

        <Script
          src="/booking-app.js?v=1.4.2"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
