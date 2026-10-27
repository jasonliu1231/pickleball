export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";
import { sendLinePushFlex, normalizePhone, fetchTokensForUser, sendExpoPush } from "@/lib/line";
import { logBatchUserNotifications } from "@/lib/userNotifications";

export async function POST(request) {
  try {
    const client = getSupabaseAdmin() || supabase;
    const body = await request.json();
    const { meetup_id, date } = body;
    
    if (!meetup_id || !date) {
      return Response.json({ ok: false, error: "Missing meetup_id or date" }, { status: 400 });
    }
    
    // 1. Fetch meetup details, organizer_id and location
    const { data: meetups } = await client
      .from("meetups")
      .select("name,organizer_id,creator_user_id,city,address,organizers(name,is_line_push_enabled),creator:users!creator_user_id(name)")
      .eq("id", meetup_id);
    
    if (!meetups || meetups.length === 0) {
      return Response.json({ ok: false, error: "Meetup not found" }, { status: 404 });
    }
    
    const meetup = meetups[0];
    const meetupName = meetup.name;
    const organizerId = meetup.organizer_id;
    const isLinePushEnabled = meetup.organizers?.is_line_push_enabled !== false;
    const orgName = meetup.organizers?.name || meetup.creator?.name || (!meetup.organizer_id || meetup.creator_user_id ? "球友自發" : "球友同樂會");
    const meetupLocation = [meetup.city, meetup.address].filter(Boolean).join(" ") || "未設定地點";
    
    // 2. Fetch session for this meetup and date
    const { data: session } = await client
      .from("sessions")
      .select("id, status")
      .eq("meetup_id", meetup_id)
      .eq("session_date", date)
      .maybeSingle();

    if (session && session.status === "cancelled") {
      return Response.json({ ok: true, sent_count: 0, skipped_count: 0, message: "當天場次已停開。" });
    }

    // 3. Collect confirmed participants + fixed subscribed members
    const playerMap = new Map();
    const absentUserIds = new Set();

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
        if (p.user?.id && ["confirmed", "attended"].includes(p.status)) {
          const cleanPh = normalizePhone(p.user.phone);
          playerMap.set(String(p.user.id), {
            id: p.id,
            isMember: false,
            memberId: null,
            userId: p.user.id,
            phone: cleanPh,
            nickname: p.user.name || "球友",
            line_user_id: p.user.line_user_id,
            expo_push_token: p.user.expo_push_token
          });
        }
      }
    }

    const { data: subs } = await client
      .from("member_meetup_subscriptions")
      .select("organizer_member_id, organizer_member:organizer_members(id, status, user_id, user:users(id, name, phone, line_user_id, expo_push_token))")
      .eq("meetup_id", meetup_id);

    for (const s of subs || []) {
      const om = s.organizer_member;
      if (om && om.status === "active" && om.user?.id) {
        const uid = String(om.user.id);
        if (!absentUserIds.has(uid) && !playerMap.has(uid)) {
          const cleanPh = normalizePhone(om.user.phone);
          playerMap.set(uid, {
            id: null,
            isMember: true,
            memberId: om.id,
            userId: om.user.id,
            phone: cleanPh,
            nickname: om.user.name || "固定會員",
            line_user_id: om.user.line_user_id,
            expo_push_token: om.user.expo_push_token
          });
        }
      }
    }

    const playersToRemind = Array.from(playerMap.values());

    if (playersToRemind.length === 0) {
      return Response.json({ ok: true, sent_count: 0, skipped_count: 0, message: "當天沒有確認出席名單。" });
    }

    // Format date from YYYY-MM-DD to MM/DD
    let formattedDate = date || "";
    if (date && date.includes("-")) {
      const parts = date.split("-");
      if (parts.length === 3) {
        formattedDate = `${Number(parts[1])}/${Number(parts[2])}`;
      }
    }

    let sentCount = 0;
    let skippedCount = 0;
    const appPushMessages = [];
    const seenTokens = new Set();
    const userNotificationRows = [];

    // 4. Broadcast to each player (記錄文字 + App Push + LINE Official Push)
    for (const player of playersToRemind) {
      const lineUserId = player.line_user_id;
      const playerNickname = player.nickname || "球友";
      const cancelUrl = player.isMember
        ? `https://pickleball.jason1231.com/api/cancel-match-booking?type=member&member_id=${player.memberId}&meetup_id=${meetup_id}&date=${date}`
        : `https://pickleball.jason1231.com/api/cancel-match-booking?type=signup&id=${player.id}`;

      // A. Always collect Notification History (記錄文字)
      if (player.userId) {
        userNotificationRows.push({
          userId: player.userId,
          category: "match_reminder",
          title: "⏰ 球聚行前提醒",
          body: `哈囉 ${playerNickname}！提醒您 ${formattedDate || date} 有預約「${meetupName}」，地點：${meetupLocation}，期待在球場相見！`,
          data: {
            type: "match_reminder",
            meetup_id,
            date,
          },
        });
      }

      // B. Collect App Push Notifications via fetchTokensForUser
      const tokens = await fetchTokensForUser(client, {
        userId: player.userId,
        phone: player.phone
      });
      for (const tk of tokens) {
        if (!seenTokens.has(tk)) {
          seenTokens.add(tk);
          appPushMessages.push({
            to: tk,
            title: "⏰ 球聚行前提醒",
            body: `哈囉 ${playerNickname}！提醒您 ${formattedDate || date} 有預約「${meetupName}」，地點：${meetupLocation}，期待在球場相見！`,
            sound: "default",
            channelId: "pickleball-alerts",
            data: {
              type: "match_reminder",
              meetup_id,
              date
            }
          });
        }
      }

      // C. If no LINE user ID or organizer disabled LINE push, skip LINE part
      if (!lineUserId || !isLinePushEnabled) {
        continue;
      }
      
      // Deduct 1 point from organizer quota (扣點制：數量沒了就不再發送)
      if (organizerId) {
        try {
          const { data: deductResult, error: rpcError } = await client.rpc("deduct_organizer_message_quota", {
            p_organizer_id: organizerId,
            p_message_type: "reminder",
            p_recipient_phone: player.phone,
            p_content: `行前提醒: ${playerNickname} - ${formattedDate || date} - ${meetupName}`,
            p_cost: 1,
            p_allow_overdraft: false // 扣點制：數量沒了就不再發送
          });
          
          const deductRes = Array.isArray(deductResult) ? deductResult[0] : deductResult;
          if (rpcError || !deductRes?.ok) {
            console.log(`[Match Reminder] Skipped LINE push for ${player.phone} because organizer quota is exhausted or LINE disabled: ${deductRes?.message || rpcError?.message}`);
            continue; // Skip sending LINE message to this player
          }
          console.log(`[Usage Deducted] Organizer (${organizerId}) remaining quota: ${deductRes.remaining_quota}`);
        } catch (deductErr) {
          console.error("Failed to deduct message quota:", deductErr);
          continue; // Skip sending LINE message on deduction failure
        }
      }
      
      // Construct Flex Message
      const flexContents = {
        type: "bubble",
        size: "giga",
        styles: {
          header: {
            backgroundColor: "#0f172a" // Deep Midnight Navy
          },
          body: {
            backgroundColor: "#1e3a8a" // Deep Sapphire Blue
          },
          footer: {
            backgroundColor: "#0f172a"
          }
        },
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "打球行前提醒 🔔",
              weight: "bold",
              color: "#93c5fd", // Sapphire light accent
              size: "lg"
            },
            {
              type: "text",
              text: "別忘了您的匹克球球局約定喔！",
              color: "#dbeafe",
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
                {
                  type: "text",
                  text: "團主",
                  color: "#93c5fd",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: orgName,
                  color: "#ffffff",
                  size: "sm",
                  weight: "bold",
                  align: "end",
                  flex: 4
                }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "球友姓名",
                  color: "#93c5fd",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: playerNickname,
                  color: "#ffffff",
                  size: "sm",
                  align: "end",
                  flex: 4
                }
              ]
            },
            {
              type: "separator",
              color: "#2563eb",
              margin: "md"
            },
            {
              type: "box",
              layout: "horizontal",
              margin: "md",
              contents: [
                {
                  type: "text",
                  text: "活動項目",
                  color: "#93c5fd",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: meetupName,
                  color: "#ffffff",
                  size: "sm",
                  wrap: true,
                  align: "end",
                  flex: 4
                }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "活動日期",
                  color: "#93c5fd",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: formattedDate || date,
                  color: "#ffffff",
                  size: "sm",
                  align: "end",
                  flex: 4
                }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "球場地點",
                  color: "#93c5fd",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: meetupLocation,
                  color: "#ffffff",
                  size: "sm",
                  wrap: true,
                  align: "end",
                  flex: 4
                }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          contents: [
            {
              type: "button",
              action: {
                type: "uri",
                label: "查看預約 ➔",
                uri: "https://pickleball.jason1231.com/member"
              },
              style: "primary",
              color: "#2563eb",
              flex: 1
            },
            {
              type: "button",
              action: {
                type: "uri",
                label: "取消預約 ➔",
                uri: cancelUrl
              },
              style: "primary",
              color: "#ef4444",
              flex: 1
            }
          ]
        }
      };
      
      const success = await sendLinePushFlex(lineUserId, flexContents, `打球行前提醒 - 匹克球同樂會`);
      if (success) {
        sentCount++;
      } else {
        skippedCount++;
      }
    }

    // 5. Send App Push Notifications in batch
    let sentAppCount = 0;
    if (appPushMessages.length > 0) {
      try {
        const expoRes = await sendExpoPush(appPushMessages);
        if (expoRes.ok) {
          sentAppCount = appPushMessages.length;
        }
      } catch (expoErr) {
        console.warn("Failed to send Expo push reminders:", expoErr);
      }
    }

    // 6. Log all notifications in user_notifications table for notification center
    if (userNotificationRows.length > 0) {
      await logBatchUserNotifications(userNotificationRows);
    }
    
    return Response.json({
      ok: true,
      sent_count: sentCount,
      sent_app_count: sentAppCount,
      skipped_count: skippedCount
    });
  } catch (error) {
    console.error("Broadcast reminder error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
