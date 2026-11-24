export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";
import { sendExpoPush, normalizePhone, fetchTokensForUser } from "@/lib/line";
import { logBatchUserNotifications } from "@/lib/userNotifications";

/**
 * 取得台北時間 (UTC+8) 的日期字串 YYYY-MM-DD
 */
function getTaipeiDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // Format: "YYYY-MM-DD"
}

/**
 * 取得台北時間 (UTC+8) 的明天日期字串 YYYY-MM-DD
 */
function getTaipeiTomorrowKey() {
  const tomorrow = new Date(Date.now() + 86400000);
  return getTaipeiDateKey(tomorrow);
}

export async function GET(request) {
  return handleDaily8pmReminder(request);
}

export async function POST(request) {
  return handleDaily8pmReminder(request);
}

async function handleDaily8pmReminder(request) {
  const client = getSupabaseAdmin() || supabase;
  const now = new Date();
  const todayKey = getTaipeiDateKey(now);
  const tomorrowKey = getTaipeiTomorrowKey();

  console.log(`[Cron:Daily8pmReminder] Executing at ${now.toISOString()} (Taipei: ${todayKey}, Checking tomorrow: ${tomorrowKey})`);

  const searchParams = new URL(request.url).searchParams;
  const isTest = searchParams.get("test") === "1" || searchParams.get("test_admin") === "1";

  try {
    // 1. 計算明天的星期幾 (0=週日, 1=週一, ..., 6=週六)
    const [tY, tM, tD] = tomorrowKey.split("-").map(Number);
    const tomorrowWeekday = new Date(tY, tM - 1, tD).getDay();

    // 2. 查詢所有啟用中且明天有排程的活動 (Meetups)
    const { data: meetups, error: meetupsErr } = await client
      .from("meetups")
      .select(`
        id,
        name,
        weekdays,
        start_time,
        city,
        address,
        street_address,
        is_one_off,
        one_off_date,
        start_date,
        end_date,
        is_active,
        organizer_id
      `)
      .eq("is_active", true);

    if (meetupsErr) {
      console.error("[Cron:Daily8pmReminder] Meetups query error:", meetupsErr);
      return Response.json({ ok: false, error: meetupsErr.message }, { status: 500 });
    }

    const tomorrowMeetups = (meetups || []).filter((m) => {
      if (m.is_one_off) {
        return (m.one_off_date || m.start_date) === tomorrowKey;
      }
      const wds = Array.isArray(m.weekdays) ? m.weekdays : [];
      return (
        wds.includes(tomorrowWeekday) &&
        (!m.start_date || tomorrowKey >= m.start_date) &&
        (!m.end_date || tomorrowKey <= m.end_date)
      );
    });

    if (tomorrowMeetups.length === 0) {
      return Response.json({
        ok: true,
        message: `明天（${tomorrowKey}）無安排任何進行中的活動。`,
        tomorrow_date: tomorrowKey,
        meetups_count: 0,
        notified_users_count: 0,
      });
    }

    // 3. 針對明天有開的活動，查詢對應的場次狀態 (Sessions)
    const meetupIds = tomorrowMeetups.map((m) => m.id);
    const { data: existingSessions, error: sessErr } = await client
      .from("sessions")
      .select("id, meetup_id, session_date, status, session_notes")
      .in("meetup_id", meetupIds)
      .eq("session_date", tomorrowKey);

    if (sessErr) {
      console.error("[Cron:Daily8pmReminder] Sessions query error:", sessErr);
      return Response.json({ ok: false, error: sessErr.message }, { status: 500 });
    }

    const sessionByMeetupId = new Map();
    (existingSessions || []).forEach((s) => {
      sessionByMeetupId.set(s.meetup_id, s);
    });

    const pushMessages = [];
    const userNotificationLogs = [];
    const notifiedRecipients = [];
    const seenTokens = new Set();
    const processedUserMeetupKeys = new Set();

    // 4. 逐一巡檢每個場次的出席人員（正取報名者 + 固定訂閱會員）
    for (const meetup of tomorrowMeetups) {
      const session = sessionByMeetupId.get(meetup.id);
      
      // 若該場次已被標記為取消或自動停開，略過通知
      if (session?.status === "cancelled" || String(session?.session_notes || "").includes("自動取消")) {
        continue;
      }

      const meetupName = meetup.name || "匹克球活動";
      const location = [meetup.city, meetup.address || meetup.street_address].filter(Boolean).join(" ") || "活動地點";
      const startTimeShort = meetup.start_time ? String(meetup.start_time).slice(0, 5) : "";

      const playerMap = new Map();
      const absentUserIds = new Set();

      // A. 抓取正取/出席報名者
      if (session?.id) {
        const { data: parts } = await client
          .from("session_participants")
          .select("id, status, user_id, user:users(id, name, display_name, phone, expo_push_token)")
          .eq("session_id", session.id);

        for (const p of parts || []) {
          if (p.status === "absent" || p.status === "cancelled") {
            if (p.user_id) absentUserIds.add(String(p.user_id));
            continue;
          }
          if (p.user?.id && ["confirmed", "attended"].includes(p.status)) {
            const uid = String(p.user.id);
            playerMap.set(uid, {
              userId: p.user.id,
              phone: normalizePhone(p.user.phone),
              nickname: p.user.display_name || p.user.name || "球友",
              directToken: p.user.expo_push_token,
            });
          }
        }
      }

      // B. 抓取固定訂閱會員 (且未自主請假)
      const { data: subs } = await client
        .from("member_meetup_subscriptions")
        .select(`
          organizer_member_id,
          organizer_member:organizer_members(
            id,
            status,
            user_id,
            user:users(id, name, display_name, phone, expo_push_token)
          )
        `)
        .eq("meetup_id", meetup.id);

      for (const s of subs || []) {
        const om = s.organizer_member;
        if (om && om.status === "active" && om.user?.id) {
          const uid = String(om.user.id);
          if (!absentUserIds.has(uid) && !playerMap.has(uid)) {
            playerMap.set(uid, {
              userId: om.user.id,
              phone: normalizePhone(om.user.phone),
              nickname: om.user.display_name || om.user.name || "球友",
              directToken: om.user.expo_push_token,
            });
          }
        }
      }

      // C. 為每位球友打包 App 推播訊息
      for (const [uid, player] of playerMap.entries()) {
        const dedupeKey = `${uid}-${meetup.id}-${tomorrowKey}`;
        if (processedUserMeetupKeys.has(dedupeKey)) continue;
        processedUserMeetupKeys.add(dedupeKey);

        const title = "🎾 明天有球打！球聚提醒";
        const body = `哈囉 ${player.nickname}！提醒您明天（${tomorrowKey}）有預約「${meetupName}」${startTimeShort ? `（${startTimeShort}）` : ""}，地點：${location}，別忘囉！`;

        // 寫入站內通知歷史 (不論是否有 token)
        userNotificationLogs.push({
          userId: player.userId,
          category: "match_reminder",
          title,
          body,
          data: {
            type: "tomorrow_match_reminder",
            meetup_id: meetup.id,
            date: tomorrowKey,
          },
        });

        // 抓取該用戶所有的 App 推播 Token
        const tokens = await fetchTokensForUser(client, {
          userId: player.userId,
          phone: player.phone,
        });

        // 加入 directToken (若有)
        if (player.directToken && !tokens.includes(player.directToken)) {
          tokens.push(player.directToken);
        }

        let userHasToken = false;
        for (const tk of tokens) {
          if (!seenTokens.has(tk)) {
            seenTokens.add(tk);
            userHasToken = true;
            pushMessages.push({
              to: tk,
              title,
              body,
              sound: "default",
              channelId: "pickleball-alerts",
              data: {
                type: "tomorrow_match_reminder",
                meetup_id: meetup.id,
                date: tomorrowKey,
              },
            });
          }
        }

        notifiedRecipients.push({
          name: player.nickname,
          phone: player.phone,
          meetup: meetupName,
          has_app_token: userHasToken,
          tokens_count: tokens.length,
        });
      }
    }

    // 5. 執行推播發送與通知寫入 (純 App 推播，不發 LINE，不扣除點數)
    let pushResult = null;
    if (pushMessages.length > 0) {
      try {
        pushResult = await sendExpoPush(pushMessages);
      } catch (err) {
        console.error("[Cron:Daily8pmReminder] sendExpoPush exception:", err);
      }
    }

    if (userNotificationLogs.length > 0) {
      try {
        await logBatchUserNotifications(userNotificationLogs);
      } catch (logErr) {
        console.error("[Cron:Daily8pmReminder] logBatchUserNotifications exception:", logErr);
      }
    }

    return Response.json({
      ok: true,
      message: `成功完成明天（${tomorrowKey}）報名推播提醒檢查！`,
      tomorrow_date: tomorrowKey,
      tomorrow_meetups_count: tomorrowMeetups.length,
      total_recipients: notifiedRecipients.length,
      app_push_messages_count: pushMessages.length,
      recipients: isTest ? notifiedRecipients : undefined,
      push_result: pushResult,
    });
  } catch (error) {
    console.error("[Cron:Daily8pmReminder] Fatal error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
