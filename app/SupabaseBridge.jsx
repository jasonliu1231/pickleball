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
}

export default function SupabaseBridge() {
  return null;
}
