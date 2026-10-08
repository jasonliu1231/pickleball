"use client";

import { createClient } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";

// 將本機打包之 Supabase Client 與建構函式掛載至 window 物件
// 確保既有 booking-app.js 即使在沒有外部 CDN 的情況下也能 100% 正常運行
if (typeof window !== "undefined") {
  window.supabase = { createClient };
  window.supabaseClient = supabase;
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

  // 🚀 自動跳轉防護：若在首頁帶有 OAuth Hash (#access_token=...)，自動轉發至 App
  // 讓 App 端 WebBrowser 能立刻攔截成功關閉彈窗
  if (window.location.hash && window.location.hash.includes("access_token=")) {
    if (window.location.pathname === "/" || window.location.pathname === "/auth/callback") {
      const appUrl = "pickleballceilidh://auth/callback" + window.location.hash;
      window.location.replace(appUrl);
    }
  }
}

export default function SupabaseBridge() {
  return null;
}

