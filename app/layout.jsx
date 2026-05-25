import Script from "next/script";
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
        {children}
      </body>
    </html>
  );
}
