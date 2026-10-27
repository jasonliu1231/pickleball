export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";
import { sendLinePushFlex, normalizePhone, fetchTokensForUser, sendExpoPush } from "@/lib/line";
import { logBatchUserNotifications } from "@/lib/userNotifications";

export async function POST(request) {
  try {
    const client = getSupabaseAdmin() || supabase;
    const body = await request.json();
    const { meetup_id, exclude_date, reason } = body;

    if (!meetup_id || !exclude_date) {
      return Response.json({ ok: false, error: "Missing meetup_id or exclude_date" }, { status: 400 });
    }

    // 1. Fetch meetup details and organizer info
    const { data: meetups } = await client
      .from("meetups")
      .select("id, name, city, address, street_address, start_time, end_time, organizer_id, creator_user_id, organizers(name, is_line_push_enabled), creator:users!creator_user_id(name)")
      .eq("id", meetup_id);

    if (!meetups || meetups.length === 0) {
      return Response.json({ ok: false, error: "Meetup not found" }, { status: 404 });
    }

    const meetup = meetups[0];
    const meetupName = meetup.name || "匹克球活動";
    const organizerId = meetup.organizer_id;
    const isLinePushEnabled = meetup.organizers?.is_line_push_enabled !== false;
    const orgName = meetup.organizers?.name || meetup.creator?.name || (!meetup.organizer_id || meetup.creator_user_id ? "球友自發" : "球友同樂會");
    const startTimeStr = (meetup.start_time || "").slice(0, 5);
    const reasonText = (reason || "").trim() || "臨時停開";

    let formattedDate = exclude_date;
    if (exclude_date && exclude_date.includes("-")) {
      const parts = exclude_date.split("-");
      if (parts.length === 3) {
        formattedDate = `${Number(parts[1])}/${Number(parts[2])}`;
      }
    }

    // 2. Collect affected users (fixed members + session participants on that date)
    const userMap = new Map();
    const absentUserIds = new Set();

    // 2A. Check session participants on exclude_date
    const { data: session } = await client
      .from("sessions")
      .select("id")
      .eq("meetup_id", meetup_id)
      .eq("session_date", exclude_date)
      .maybeSingle();

    if (session?.id) {
      const { data: participants } = await client
        .from("session_participants")
        .select("id, status, user_id, user:users(id, name, phone, line_user_id, expo_push_token)")
        .eq("session_id", session.id);

      for (const p of participants || []) {
        if (p.status === "absent" || p.status === "cancelled") {
          if (p.user_id) absentUserIds.add(String(p.user_id));
          continue;
        }
        if (p.user?.id && ["confirmed", "waitlist", "attended"].includes(p.status)) {
          userMap.set(String(p.user.id), p.user);
        }
      }
    }

    // 2B. Check fixed subscribed members for this meetup
    const { data: subs } = await client
      .from("member_meetup_subscriptions")
      .select("organizer_member_id, organizer_member:organizer_members(id, status, user_id, user:users(id, name, phone, line_user_id, expo_push_token))")
      .eq("meetup_id", meetup_id);

    for (const s of subs || []) {
      const om = s.organizer_member;
      if (om && om.status === "active" && om.user?.id) {
        const uid = String(om.user.id);
        if (!absentUserIds.has(uid) && !userMap.has(uid)) {
          userMap.set(uid, om.user);
        }
      }
    }

    const recipients = Array.from(userMap.values());
    if (recipients.length === 0) {
      return Response.json({
        ok: true,
        notified_users: 0,
        sent_app: 0,
        sent_line: 0,
        message: "該場次尚無固定會員或報名球友需通知。"
      });
    }

    const notifTitle = "🛑 單日場次停開通知";
    const notifBody = `【${orgName}】原定 ${exclude_date}${startTimeStr ? ` (${startTimeStr})` : ""} 的「${meetupName}」本場次停開一次。停開備註：${reasonText}。造成不便敬請見諒！`;

    const userNotificationRows = [];
    const appPushMessages = [];
    const seenTokens = new Set();
    let sentLineCount = 0;

    for (const u of recipients) {
      const playerNickname = u.name || "球友";
      const cleanPh = normalizePhone(u.phone);

      // (1) 記錄文字：一律寫入會員通知中心 (user_notifications)
      userNotificationRows.push({
        userId: u.id,
        category: "announcement",
        title: notifTitle,
        body: notifBody,
        data: {
          type: "session_cancelled",
          meetup_id,
          exclude_date,
          reason: reasonText
        }
      });

      // (2) 手機推播：若有 pushToken 就發手機推播
      const tokens = await fetchTokensForUser(client, {
        userId: u.id,
        phone: cleanPh
      });
      for (const tk of tokens) {
        if (!seenTokens.has(tk)) {
          seenTokens.add(tk);
          appPushMessages.push({
            to: tk,
            title: notifTitle,
            body: notifBody,
            sound: "default",
            channelId: "pickleball-alerts",
            data: {
              type: "session_cancelled",
              meetup_id,
              exclude_date,
              reason: reasonText
            }
          });
        }
      }

      // (3) LINE 官方推播：若團主有開啟 LINE 官方推送且有額度，發送官方 Flex 卡片
      if (organizerId && isLinePushEnabled && u.line_user_id) {
        try {
          const { data: deductResult, error: rpcError } = await client.rpc("deduct_organizer_message_quota", {
            p_organizer_id: organizerId,
            p_message_type: "exclusion",
            p_recipient_phone: cleanPh || "",
            p_content: `場次停開通知: ${playerNickname} - ${exclude_date} - ${meetupName} (${reasonText})`,
            p_cost: 1,
            p_allow_overdraft: false
          });

          const deductRes = Array.isArray(deductResult) ? deductResult[0] : deductResult;
          if (!rpcError && deductRes?.ok) {
            const flexContents = {
              type: "bubble",
              size: "giga",
              styles: {
                header: { backgroundColor: "#450a0a" },
                body: { backgroundColor: "#7f1d1d" },
                footer: { backgroundColor: "#450a0a" }
              },
              header: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "單日場次停開通知 🛑",
                    weight: "bold",
                    color: "#fca5a5",
                    size: "lg"
                  },
                  {
                    type: "text",
                    text: "匹克球同樂會 - 場次異動提醒",
                    color: "#fecaca",
                    size: "xs",
                    margin: "xs"
                  }
                ]
              },
              body: {
                type: "box",
                layout: "vertical",
                spacing: "md",
                contents: [
                  {
                    type: "box",
                    layout: "horizontal",
                    margin: "md",
                    contents: [
                      { type: "text", text: "團主", color: "#fecaca", size: "sm", flex: 2 },
                      { type: "text", text: orgName, color: "#ffffff", size: "sm", weight: "bold", align: "end", flex: 4 }
                    ]
                  },
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      { type: "text", text: "球友姓名", color: "#fecaca", size: "sm", flex: 2 },
                      { type: "text", text: playerNickname, color: "#ffffff", size: "sm", align: "end", flex: 4 }
                    ]
                  },
                  { type: "separator", color: "#991b1b", margin: "md" },
                  {
                    type: "box",
                    layout: "horizontal",
                    margin: "md",
                    contents: [
                      { type: "text", text: "活動項目", color: "#fecaca", size: "sm", flex: 2 },
                      { type: "text", text: meetupName, color: "#ffffff", size: "sm", wrap: true, align: "end", flex: 4 }
                    ]
                  },
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      { type: "text", text: "停開日期", color: "#fecaca", size: "sm", flex: 2 },
                      { type: "text", text: `${formattedDate} (${exclude_date})${startTimeStr ? ` ${startTimeStr}` : ""}`, color: "#fca5a5", size: "sm", weight: "bold", align: "end", flex: 4 }
                    ]
                  },
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      { type: "text", text: "停開備註", color: "#fecaca", size: "sm", flex: 2 },
                      { type: "text", text: reasonText, color: "#fde047", size: "sm", weight: "bold", wrap: true, align: "end", flex: 4 }
                    ]
                  }
                ]
              },
              footer: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "button",
                    action: {
                      type: "uri",
                      label: "前往預約網站查看 ➔",
                      uri: "https://pickleball.jason1231.com"
                    },
                    style: "primary",
                    color: "#dc2626"
                  }
                ]
              }
            };

            const sent = await sendLinePushFlex(u.line_user_id, flexContents, `🛑 場次停開通知：${formattedDate} ${meetupName} 停開一次（${reasonText}）`);
            if (sent) sentLineCount++;
          }
        } catch (lineErr) {
          console.warn("[SessionCancel] LINE push error:", lineErr);
        }
      }
    }

    // Write all text notifications to user_notifications
    if (userNotificationRows.length > 0) {
      await logBatchUserNotifications(userNotificationRows);
    }

    // Send all App Push notifications
    let sentAppCount = 0;
    if (appPushMessages.length > 0) {
      try {
        const expoRes = await sendExpoPush(appPushMessages);
        if (expoRes.ok) sentAppCount = appPushMessages.length;
      } catch (pushErr) {
        console.warn("[SessionCancel] Expo push error:", pushErr);
      }
    }

    return Response.json({
      ok: true,
      notified_users: userNotificationRows.length,
      sent_app: sentAppCount,
      sent_line: sentLineCount
    });
  } catch (error) {
    console.error("Session cancel notification error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
