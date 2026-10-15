export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ ok: false, error: "Missing userId" }, { status: 400 });
  }

  const client = getSupabaseAdmin() || supabase;

  try {
    const { data: notifications, error } = await client
      .from("user_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // 若資料表尚未在 SQL Editor 執行建立，友善回傳空列表，不噴 500
      console.warn("fetch notifications error (table may not exist yet):", error.message);
      return Response.json({ ok: true, notifications: [], unread_count: 0 });
    }

    const list = notifications || [];
    const unreadCount = list.filter((n) => !n.is_read).length;

    return Response.json({
      ok: true,
      notifications: list,
      unread_count: unreadCount,
    });
  } catch (err) {
    console.error("GET user_notifications error:", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { userId, notificationId, markAll } = body;

    const client = getSupabaseAdmin() || supabase;

    if (markAll && userId) {
      const { error } = await client
        .from("user_notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
      return Response.json({ ok: true, marked_all: true });
    }

    if (notificationId) {
      const { error } = await client
        .from("user_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
      return Response.json({ ok: true, marked_id: notificationId });
    }

    return Response.json({ ok: false, error: "Missing parameters" }, { status: 400 });
  } catch (err) {
    console.error("PATCH user_notifications error:", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
