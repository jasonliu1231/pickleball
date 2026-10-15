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
  return handleCronMatchReminder(request);
}

export async function POST(request) {
  return handleCronMatchReminder(request);
}

async function handleCronMatchReminder(request) {
  const client = getSupabaseAdmin() || supabase;
  const now = new Date();
  const todayKey = getTaipeiDateKey(now);
  const tomorrowKey = getTaipeiTomorrowKey();

  console.log(`[Cron:MatchReminder] Executing 2-hour match reminder check at ${now.toISOString()} (Taipei: ${todayKey})`);

  try {
    // 1. 查詢今天與明天尚未發送 2 小時提醒且狀態為 open 的場次
    const { data: sessions, error: sessErr } = await client
      .from("sessions")
      .select(`
        id,
        session_date,
        status,
        reminder_2h_sent_at,
        meetup:meetups!inner(
          id,
          name,
          city,
          address,
          street_address,
          start_time,
          organizer_id,
          organizers(name)
        )
      `)
      .in("session_date", [todayKey, tomorrowKey])
      .eq("status", "open")
      .is("reminder_2h_sent_at", null);

    if (sessErr) {
      console.error("[Cron:MatchReminder] Error querying sessions:", sessErr);
      return Response.json({ ok: false, error: sessErr.message }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return Response.json({
        ok: true,
        message: "目前無未發送 2 小時提醒的開放場次。",
        checked_sessions: 0,
        sent_sessions: 0,
        sent_reminders: 0,
      });
    }

    const sessionsToRemind = [];

    // 2. 篩選開賽時間落在未來 105 ~ 125 分鐘（約 2 小時前）的場次
    for (const s of sessions) {
      if (!s.meetup || !s.meetup.start_time) continue;
      
      const startTimeStr = s.meetup.start_time.slice(0, 5); // "14:00"
      // 組合台北時間 ISO 字串
      const sessionStartIso = `${s.session_date}T${startTimeStr}:00+08:00`;
      const sessionStartDate = new Date(sessionStartIso);
      const diffMs = sessionStartDate.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      // 若場次開賽時間在未來 105 分鐘至 125 分鐘之間（約 2 小時，允許 20 分鐘巡檢窗口）
      if (diffMinutes >= 105 && diffMinutes <= 125) {
        sessionsToRemind.push({ session: s, diffMinutes });
      }
    }

    if (sessionsToRemind.length === 0) {
      return Response.json({
        ok: true,
        message: `巡檢了 ${sessions.length} 場次，無開賽前 2 小時（105~125分）符合條件的場次。`,
        checked_sessions: sessions.length,
        sent_sessions: 0,
        sent_reminders: 0,
      });
    }

    let totalSentNotifications = 0;
    const processedSessionIds = [];

    // 3. 遍歷符合條件的場次，發送推播並記錄歷史通知
    for (const item of sessionsToRemind) {
      const s = item.session;
      const meetup = s.meetup;
      const meetupName = meetup.name || "匹克球活動";
      const startTimeStr = (meetup.start_time || "").slice(0, 5);
      const location = [meetup.city, meetup.address, meetup.street_address].filter(Boolean).join(" ") || "未設定地點";

      // 抓取該場次正取名單
      const { data: participants, error: partErr } = await client
        .from("session_participants")
        .select("id, status, user:users(id, name, phone, expo_push_token)")
        .eq("session_id", s.id)
        .in("status", ["confirmed", "attended"]);

      if (partErr) {
        console.warn(`[Cron:MatchReminder] Failed to fetch participants for session ${s.id}:`, partErr);
        continue;
      }

      const confirmedParticipants = participants || [];
      const appPushMessages = [];
      const userNotificationRows = [];

      for (const p of confirmedParticipants) {
        const userId = p.user?.id;
        const playerNickname = p.user?.name || "球友";
        const title = "⏰ 球聚即將開打提醒";
        const body = `哈囉 ${playerNickname}！您預約的「${meetupName}」即將在 2 小時後（${startTimeStr}）於 ${location} 開打，請準備整裝出發囉！🎾`;

        // (1) 無論是否有裝 App，一律寫入會員歷史通知記錄
        if (userId) {
          userNotificationRows.push({
            userId,
            category: "match_reminder",
            title,
            body,
            data: {
              type: "match_reminder_2h",
              meetup_id: meetup.id,
              session_id: s.id,
              session_date: s.session_date,
              start_time: startTimeStr,
            },
          });
        }

        // (2) 若有手機 App 推播 Token，收集發送
        if (p.user?.expo_push_token) {
          appPushMessages.push({
            to: p.user.expo_push_token,
            title,
            body,
            sound: "default",
            channelId: "pickleball-alerts",
            data: {
              type: "match_reminder_2h",
              meetup_id: meetup.id,
              session_id: s.id,
              session_date: s.session_date,
            },
          });
        }
      }

      // (3) 寫入資料庫歷史紀錄庫
      if (userNotificationRows.length > 0) {
        await logBatchUserNotifications(userNotificationRows);
      }

      // (4) 發送手機即時推播
      if (appPushMessages.length > 0) {
        try {
          await sendExpoPush(appPushMessages);
        } catch (pushErr) {
          console.warn("[Cron:MatchReminder] Expo push error:", pushErr);
        }
      }

      // (5) 標記該場次已發送 2 小時提醒，避免重複發送
      await client
        .from("sessions")
        .update({ reminder_2h_sent_at: now.toISOString() })
        .eq("id", s.id)
        .catch(() => {});

      totalSentNotifications += userNotificationRows.length;
      processedSessionIds.push(s.id);
    }

    return Response.json({
      ok: true,
      message: `成功發送 ${processedSessionIds.length} 場開賽前 2 小時提醒，共通知 ${totalSentNotifications} 人次。`,
      processed_session_ids: processedSessionIds,
      sent_reminders: totalSentNotifications,
    });
  } catch (error) {
    console.error("[Cron:MatchReminder] Fatal error:", error);
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
