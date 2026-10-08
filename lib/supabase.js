import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jynbpziqitriicruwqlz.supabase.co";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_l92pwfLLpWoFtNVv_QF39g_xzZOwqpZ";

// 全域共用 Supabase Client 實例
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 伺服器端專用 Admin Client (具備 service_role 最高權限)
export const getSupabaseAdmin = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createClient(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export default supabase;
