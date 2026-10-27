export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";
import { fetchTokensForUser, sendExpoPush, normalizePhone } from "@/lib/line";
import { logBatchUserNotifications } from "@/lib/userNotifications";

export async function POST(request) {
  try {
    const client = getSupabaseAdmin() || supabase;
    const body = await request.json();
    const { creator_user_id, meetup_id, reason } = body;

    if (!creator_user_id || !meetup_id) {
      return Response.json({ ok: false, error: "缺少必要參數" }, { status: 400 });
    }

    // 1. 驗證是否為該活動發起人
    const { data: meetup, error: fetchErr } = await client
      .from("meetups")
      .select("id, creator_user_id, name, start_time, one_off_date, start_date, creator:users!creator_user_id(name)")
      .eq("id", meetup_id)
      .eq("creator_user_id", creator_user_id)
      .single();

    if (fetchErr || !meetup) {
      return Response.json({ ok: false, error: "找不到此活動或您無權取消。" }, { status: 403 });
    }

    // 2. 找出該活動對應的 session 與已報名的球友（排除發起人自己）
    const { data: sessions } = await client
      .from("sessions")
      .select("id, session_date")
      .eq("meetup_id", meetup_id);

    const sessionIds = (sessions || []).map((s) => s.id);
    const sessionDate =
      sessions?.[0]?.session_date || meetup.one_off_date || meetup.start_date || "";
    const startTimeStr = (meetup.start_time || "").slice(0, 5);
    const creatorName = meetup.creator?.name || "發起人";
    const reasonText = (reason || "").trim();

    let notifiedCount = 0;

    if (sessionIds.length > 0) {
      const { data: participants } = await client
        .from("session_participants")
        .select("id, user_id, status, user:users(id, name, phone)")
        .in("session_id", sessionIds)
        .in("status", ["confirmed", "waitlist", "attended"]);

      const otherParticipants = (participants || []).filter(
        (p) => p.user?.id && String(p.user_id) !== String(creator_user_id)
      );

      if (otherParticipants.length > 0) {
        const notifTitle = "🛑 自揪活動取消通知";
        const notifBody = `由「${creatorName}」發起的自揪活動「${meetup.name}」(${sessionDate}${startTimeStr ? ` ${startTimeStr}` : ""}) 已由發起人取消${reasonText ? `（原因：${reasonText}）` : ""}。造成不便敬請見諒！`;

        const notifRows = [];
        const pushMessages = [];
        const seenTokens = new Set();

        for (const p of otherParticipants) {
          const u = p.user;
          notifRows.push({
            userId: u.id,
            category: "announcement",
            title: notifTitle,
            body: notifBody,
            data: {
              type: "pickup_cancelled",
              meetup_id,
              session_date: sessionDate
            }
          });

          const tokens = await fetchTokensForUser(client, {
            userId: u.id,
            phone: normalizePhone(u.phone)
          });

          for (const tk of tokens) {
            if (!seenTokens.has(tk)) {
              seenTokens.add(tk);
              pushMessages.push({
                to: tk,
                title: notifTitle,
                body: notifBody,
                sound: "default",
                channelId: "pickleball-alerts",
                data: {
                  type: "pickup_cancelled",
                  meetup_id,
                  session_date: sessionDate
                }
              });
            }
          }
        }

        await logBatchUserNotifications(client, notifRows);
        if (pushMessages.length > 0) {
          await sendExpoPush(pushMessages);
        }
        notifiedCount = otherParticipants.length;
      }
    }

    // 3. 停用 meetup 並標記 session 為 cancelled
    await client
      .from("meetups")
      .update({ is_active: false })
      .eq("id", meetup_id);

    await client
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("meetup_id", meetup_id);

    return Response.json({
      ok: true,
      notified_count: notifiedCount,
      message:
        notifiedCount > 0
          ? `活動已成功取消，並已自動通知 ${notifiedCount} 位報名球友！`
          : "活動已成功取消"
    });
  } catch (error) {
    console.error("cancel-member-pickup error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
