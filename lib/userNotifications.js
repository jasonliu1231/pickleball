import { supabase, getSupabaseAdmin } from "./supabase";

/**
 * 寫入單筆會員通知紀錄
 * @param {Object} params
 * @param {string} params.userId 會員 user_id (UUID)
 * @param {string} [params.category='match_reminder'] 分類: 'match_reminder' | 'waitlist_update' | 'billing_balance' | 'announcement'
 * @param {string} params.title 通知標題
 * @param {string} params.body 通知內容
 * @param {Object} [params.data={}] 關聯參數（如 meetup_id, session_id, reservation_date）
 */
export async function logUserNotification({ userId, category = "match_reminder", title, body, data = {} }) {
  if (!userId || !title || !body) return null;
  const client = getSupabaseAdmin() || supabase;
  try {
    const { data: inserted, error } = await client
      .from("user_notifications")
      .insert({
        user_id: userId,
        category,
        title,
        body,
        data,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("logUserNotification warning:", error.message);
      return null;
    }
    return inserted;
  } catch (err) {
    console.warn("logUserNotification exception:", err?.message || err);
    return null;
  }
}

/**
 * 批次寫入多筆會員通知紀錄
 * @param {Array<Object>} notifications
 */
export async function logBatchUserNotifications(notifications = []) {
  if (!notifications || notifications.length === 0) return [];
  const client = getSupabaseAdmin() || supabase;
  try {
    const rows = notifications
      .filter((n) => n.userId && n.title && n.body)
      .map((n) => ({
        user_id: n.userId,
        category: n.category || "match_reminder",
        title: n.title,
        body: n.body,
        data: n.data || {},
        is_read: false,
        created_at: new Date().toISOString(),
      }));

    if (rows.length === 0) return [];

    const { data: inserted, error } = await client
      .from("user_notifications")
      .insert(rows)
      .select();

    if (error) {
      console.warn("logBatchUserNotifications warning:", error.message);
      return [];
    }
    return inserted || [];
  } catch (err) {
    console.warn("logBatchUserNotifications exception:", err?.message || err);
    return [];
  }
}
