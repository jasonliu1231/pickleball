export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";

/**
 * 當球友先由團主建檔或散客報名產生了一筆「無 LINE 綁定、僅有電話」的 users 紀錄 (oldUser)，
 * 事後球友首次使用 LINE 登入產生了新的 Auth user 紀錄 (newUserId)，並在個人中心填寫同一支電話時，
 * 自動將舊紀錄 (oldUser) 的俱樂部會員、報名紀錄、通知紀錄轉移至 newUserId，並完成電話綁定，
 * 徹底解決 duplicate key value violates unique constraint "users_phone_key" 問題。
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id, phone, name, display_name, skill_level, rating, dupr_id } = body;

    const cleanPhone = String(phone || "").replace(/\D/g, "");
    if (!user_id || !cleanPhone) {
      return Response.json({ ok: false, error: "缺少 user_id 或 phone" }, { status: 400 });
    }

    const client = getSupabaseAdmin() || supabase;

    // 查詢是否已有另一筆不同 id 的 users 佔用此電話
    const { data: existingUsers } = await client
      .from("users")
      .select("*")
      .eq("phone", cleanPhone)
      .neq("id", user_id);

    if (existingUsers && existingUsers.length > 0) {
      for (const oldUser of existingUsers) {
        // 1. 轉移俱樂部會員儲值紀錄 (organizer_members)
        await client
          .from("organizer_members")
          .update({ user_id, updated_at: new Date().toISOString() })
          .eq("user_id", oldUser.id);

        // 2. 轉移場次報名紀錄 (session_participants)
        // 為避免同場次重複 user_id 衝突，逐筆轉移
        const { data: oldParts } = await client
          .from("session_participants")
          .select("id, session_id")
          .eq("user_id", oldUser.id);

        for (const part of oldParts || []) {
          const { data: dupPart } = await client
            .from("session_participants")
            .select("id")
            .eq("session_id", part.session_id)
            .eq("user_id", user_id)
            .maybeSingle();

          if (!dupPart) {
            await client
              .from("session_participants")
              .update({ user_id, updated_at: new Date().toISOString() })
              .eq("id", part.id);
          } else {
            await client.from("session_participants").delete().eq("id", part.id);
          }
        }

        // 3. 轉移通知中心紀錄 (user_notifications)
        await client
          .from("user_notifications")
          .update({ user_id })
          .eq("user_id", oldUser.id);

        // 4. 轉移自揪團發起人紀錄 (meetups.creator_user_id)
        await client
          .from("meetups")
          .update({ creator_user_id: user_id })
          .eq("creator_user_id", oldUser.id);

        // 5. 移除舊紀錄的電話並刪除舊空殼紀錄
        await client.from("users").update({ phone: null }).eq("id", oldUser.id);
        await client.from("users").delete().eq("id", oldUser.id);
      }
    }

    // 更新當前登入會員的個人資料與電話
    const updatePayload = {
      phone: cleanPhone,
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updatePayload.name = name;
    if (display_name !== undefined) updatePayload.display_name = display_name;
    if (skill_level !== undefined) {
      updatePayload.skill_level = skill_level;
      updatePayload.is_beginner = skill_level === "first_time" || skill_level === "beginner";
    }
    if (rating !== undefined) updatePayload.rating = rating;
    if (dupr_id !== undefined) updatePayload.dupr_id = dupr_id;

    let { data: updatedUser, error: upErr } = await client
      .from("users")
      .update(updatePayload)
      .eq("id", user_id)
      .select()
      .single();

    if (upErr && (upErr.message?.includes("display_name") || upErr.message?.includes("dupr_id"))) {
      if (upErr.message?.includes("display_name")) delete updatePayload.display_name;
      if (upErr.message?.includes("dupr_id")) delete updatePayload.dupr_id;
      const retry = await client.from("users").update(updatePayload).eq("id", user_id).select().single();
      updatedUser = retry.data;
      upErr = retry.error;
    }

    if (upErr) {
      return Response.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    return Response.json({
      ok: true,
      merged: (existingUsers || []).length,
      user: updatedUser,
    });
  } catch (err) {
    console.error("[API:merge-phone] Error:", err);
    return Response.json({ ok: false, error: err?.message || "合併綁定失敗" }, { status: 500 });
  }
}
