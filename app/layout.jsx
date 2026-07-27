import Script from "next/script";
import Navbar from "./Navbar";
import "./globals.css";

export const metadata = {
  title: "匹克球同樂會｜線上預約",
  description: "匹克球同樂會線上預約，查看公告、小知識與可報名場次。",
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
            <Navbar />
          </header>

          {children}

          <footer className="footer">匹克球同樂會｜線上預約系統</footer>
        </main>

        <Script
          src="/booking-app.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
