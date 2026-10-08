export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";
import { sendLinePushFlex, normalizePhone, fetchTokensForUser, sendExpoPush } from "@/lib/line";

export async function POST(request) {
  try {
    const body = await request.json();
    const { meetup_id, date } = body;
    
    if (!meetup_id || !date) {
      return Response.json({ ok: false, error: "Missing meetup_id or date" }, { status: 400 });
    }
    
    // 1. Fetch meetup details, organizer_id and location
    const { data: meetups } = await supabase
      .from("meetups")
      .select("name,organizer_id,city,address,organizers(name)")
      .eq("id", meetup_id);
    
    if (!meetups || meetups.length === 0) {
      return Response.json({ ok: false, error: "Meetup not found" }, { status: 404 });
    }
    
    const meetup = meetups[0];
    const meetupName = meetup.name;
    const organizerId = meetup.organizer_id;
    const orgName = meetup.organizers?.name || "未知團主";
    const meetupLocation = [meetup.city, meetup.address].filter(Boolean).join(" ") || "未設定地點";
    
    // 2. Fetch session for this meetup and date
    const { data: session } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("meetup_id", meetup_id)
      .eq("session_date", date)
      .maybeSingle();

    if (!session || session.status === "cancelled") {
      return Response.json({ ok: true, sent_count: 0, skipped_count: 0, message: "當天場次未開放或已停開。" });
    }

    // 3. Fetch confirmed participants with user info
    const { data: participants } = await supabase
      .from("session_participants")
      .select("id, status, user:users(id, name, phone, line_user_id, expo_push_token)")
      .eq("session_id", session.id)
      .in("status", ["confirmed", "attended"]);

    const playersToRemind = (participants || [])
      .map(p => {
        const cleanPh = normalizePhone(p.user?.phone);
        return {
          id: p.id,
          userId: p.user?.id,
          phone: cleanPh,
          nickname: p.user?.name || "球友",
          line_user_id: p.user?.line_user_id,
          expo_push_token: p.user?.expo_push_token
        };
      })
      .filter(p => !!p.line_user_id || !!p.expo_push_token);

    if (playersToRemind.length === 0) {
      return Response.json({ ok: true, sent_count: 0, skipped_count: 0, message: "當天沒有已綁定 LINE 或 App 推播的確認名單。" });
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

    // 4. Broadcast to each player who has a linked LINE ID or App Push Token
    for (const player of playersToRemind) {
      const lineUserId = player.line_user_id;
      const playerNickname = player.nickname || "球友";
      const cancelUrl = `https://pickleball.jason1231.com/api/cancel-match-booking?type=signup&id=${player.id}`;

      // A. Collect App Push Notification
      if (player.expo_push_token) {
        appPushMessages.push({
          to: player.expo_push_token,
          title: "⏰ 明日球聚行前提醒",
          body: `哈囉 ${playerNickname}！提醒您明天 ${formattedDate || date} 有預約「${meetupName}」，地點：${meetupLocation}，期待在球場相見！`,
          sound: "default",
          channelId: "pickleball-alerts",
          data: {
            type: "match_reminder",
            meetup_id,
            date
          }
        });
      }

      // B. If no LINE user ID, skip LINE part
      if (!lineUserId) {
        continue;
      }
      
      // Deduct 1 point from organizer quota
      if (organizerId) {
        try {
          const { data: deductResult } = await supabase.rpc("deduct_organizer_message_quota", {
            p_organizer_id: organizerId,
            p_message_type: "reminder",
            p_recipient_phone: player.phone,
            p_content: `行前提醒: ${playerNickname} - ${formattedDate || date} - ${meetupName}`,
            p_cost: 1,
            p_allow_overdraft: true // 加點累計制：不阻擋發送
          });
          
          const deductRes = Array.isArray(deductResult) ? deductResult[0] : deductResult;
          if (deductRes && deductRes.ok) {
            console.log(`[Usage Recorded] Organizer (${organizerId}) cumulative push count: ${deductRes.new_quota}`);
          }
        } catch (deductErr) {
          console.error("Failed to deduct message quota:", deductErr);
          // Fail-safe: if DB RPC call throws error, proceed to send the message anyway so we don't break service
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
