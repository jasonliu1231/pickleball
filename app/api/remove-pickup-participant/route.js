export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { creator_user_id, participant_id, meetup_id } = body;

    if (!creator_user_id || !participant_id || !meetup_id) {
      return Response.json({ ok: false, error: "缺少必要參數" }, { status: 400 });
    }

    // 1. 驗證是否為該活動發起人
    const { data: meetup, error: meetupErr } = await supabase
      .from("meetups")
      .select("id, creator_user_id, name")
      .eq("id", meetup_id)
      .eq("creator_user_id", creator_user_id)
      .single();

    if (meetupErr || !meetup) {
      return Response.json({ ok: false, error: "找不到此活動或您無權管理此活動名單。" }, { status: 403 });
    }

    // 2. 查詢該報名者資訊與對應 session
    const { data: participant, error: partErr } = await supabase
      .from("session_participants")
      .select("id, session_id, user_id, status, people_count, note, user:users(id, name, phone), session:sessions(id, meetup_id, session_date, confirmed_count, waitlist_count)")
      .eq("id", participant_id)
      .single();

    if (partErr || !participant) {
      return Response.json({ ok: false, error: "找不到此報名人員紀錄。" }, { status: 404 });
    }

    if (participant.session?.meetup_id !== meetup_id) {
      return Response.json({ ok: false, error: "報名紀錄與活動不符。" }, { status: 400 });
    }

    // 3. 不允許發起人自名單中移除自己（若發起人要取消應使用取消活動）
    if (participant.user_id === creator_user_id) {
      return Response.json({ ok: false, error: "發起人無法自名單中移除。若要結束活動請點選「取消活動」。" }, { status: 400 });
    }

    const prevStatus = participant.status;
    const sessionId = participant.session_id;

    // 4. 將該人員狀態更新為 cancelled
    const { error: updateErr } = await supabase
      .from("session_participants")
      .update({
        status: "cancelled",
        note: (participant.note ? participant.note + "；" : "") + "由活動發起人移除",
        updated_at: new Date().toISOString()
      })
      .eq("id", participant_id);

    if (updateErr) {
      throw updateErr;
    }

    let promotedUser = null;

    // 5. 若被移除的人原先是正取 (confirmed)，依序遞補候補第一位
    if (prevStatus === "confirmed" && sessionId) {
      const { data: waitlist } = await supabase
        .from("session_participants")
        .select("id, user_id, people_count, user:users(id, name, phone)")
        .eq("session_id", sessionId)
        .eq("status", "waitlist")
        .order("created_at", { ascending: true })
        .limit(1);

      if (waitlist && waitlist.length > 0) {
        await supabase
          .from("session_participants")
          .update({
            status: "confirmed",
            updated_at: new Date().toISOString()
          })
          .eq("id", waitlist[0].id);

        promotedUser = waitlist[0].user;

        // 發送遞補通知
        if (promotedUser?.phone) {
          try {
            const domain = process.env.NEXT_PUBLIC_APP_URL || "https://pickleball.jason1231.com";
            await fetch(`${domain}/api/waitlist-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                meetup_id: meetup_id,
                phone: promotedUser.phone,
                nickname: promotedUser.name || "球友",
                reservation_date: participant.session?.session_date
              })
            });
          } catch (notifErr) {
            console.warn("Promoted user notification failed:", notifErr);
          }
        }
      }
    }

    // 6. 重新統計並更新 session 的 confirmed_count 與 waitlist_count
    if (sessionId) {
      const { data: activeParts } = await supabase
        .from("session_participants")
        .select("people_count")
        .eq("session_id", sessionId)
        .eq("status", "confirmed");

      const newConfirmedCount = (activeParts || []).reduce((sum, p) => sum + (Number(p.people_count) || 1), 0);
      
      const { data: waitlistParts } = await supabase
        .from("session_participants")
        .select("people_count")
        .eq("session_id", sessionId)
        .eq("status", "waitlist");

      const newWaitlistCount = (waitlistParts || []).reduce((sum, p) => sum + (Number(p.people_count) || 1), 0);

      await supabase
        .from("sessions")
        .update({
          confirmed_count: newConfirmedCount,
          waitlist_count: newWaitlistCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);
    }

    return Response.json({
      ok: true,
      message: `已成功移除「${participant.user?.name || "球友"}」`,
      promoted: promotedUser ? { name: promotedUser.name } : null
    });
  } catch (error) {
    console.error("remove-pickup-participant error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
