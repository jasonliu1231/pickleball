import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://vurcntmcpemioybqqrcx.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_Z9nUlOsBQ3cIi37lr00vcw_VdBEDo3o";

// 全域共用 Supabase Client 實例
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
