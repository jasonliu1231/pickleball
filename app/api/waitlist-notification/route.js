export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";
import { sendLinePushFlex, normalizePhone, fetchTokensForUser, sendExpoPush } from "@/lib/line";

export async function POST(request) {
  try {
    const body = await request.json();
    const { meetup_id, phone, nickname, reservation_date } = body;
    
    if (!phone) {
      return Response.json({ ok: false, message: "Missing phone" }, { status: 400 });
    }
    
    // Normalize phone number (strip spaces/dashes)
    const normalizedPhone = normalizePhone(phone);
    
    // 1. Find user by phone number
    const { data: users } = await supabase
      .from("users")
      .select("id, line_user_id, name, expo_push_token")
      .eq("phone", normalizedPhone);
    
    const userObj = users && users.length > 0 ? users[0] : null;
    const lineUserId = userObj?.line_user_id;
    const playerNickname = nickname || userObj?.name || "球友";
    
    // Check if user has App Push Tokens
    const appPushTokens = await fetchTokensForUser(supabase, {
      phone: normalizedPhone,
      userId: userObj?.id
    });
    
    if (!lineUserId && appPushTokens.length === 0) {
      console.log(`No LINE user or App push token found for phone: ${normalizedPhone}`);
      return Response.json({ ok: true, message: "No LINE ID or App Push Token linked to this phone" });
    }
    
    // 2. Fetch meetup details, organizer_id and organizer name
    let meetupName = "球團活動";
    let orgName = "未知團主";
    let organizerId = null;
    if (meetup_id) {
      const { data: meetups } = await supabase
        .from("meetups")
        .select("name,organizer_id,organizers(name)")
        .eq("id", meetup_id);
      if (meetups && meetups.length > 0) {
        meetupName = meetups[0].name;
        organizerId = meetups[0].organizer_id;
        orgName = meetups[0].organizers?.name || "未知團主";
      }
    }

    
    // Format date from YYYY-MM-DD to MM/DD
    let formattedDate = reservation_date || "";
    if (reservation_date && reservation_date.includes("-")) {
      const parts = reservation_date.split("-");
      if (parts.length === 3) {
        formattedDate = `${Number(parts[1])}/${Number(parts[2])}`;
      }
    }
    
    // 3. Construct Purple Celebration Flex Message Bubble
    const flexContents = {
      type: "bubble",
      size: "giga",
      styles: {
        header: {
          backgroundColor: "#2e1065" // Deep Royal Purple
        },
        body: {
          backgroundColor: "#3b0764" // Violet dark
        },
        footer: {
          backgroundColor: "#2e1065"
        }
      },
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "備取遞補成功！🎉",
            weight: "bold",
            color: "#c084fc", // Violet accent
            size: "lg"
          },
          {
            type: "text",
            text: "匹克球同樂會 - 預約通知",
            color: "#d8b4fe",
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
                color: "#d8b4fe",
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
                color: "#d8b4fe",
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
            color: "#5b21b6", // purple separator
            margin: "md"
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "預約活動",
                color: "#d8b4fe",
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
                color: "#d8b4fe",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: formattedDate || reservation_date,
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
                text: "席位狀態",
                color: "#d8b4fe",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: "已遞補為【 正取 】",
                color: "#4ade80", // bright green for positive status
                size: "md",
                weight: "bold",
                align: "end",
                flex: 4
              }
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
              label: "前往預約網站 ➔",
              uri: "https://pickleball.jason1231.com"
            },
            style: "primary",
            color: "#8b5cf6" // Violet button
          }
        ]
      }
    };
    
    // 4. Send App Push (Expo Push Notifications)
    let appPushSuccess = false;
    if (appPushTokens.length > 0) {
      try {
        const appMessages = appPushTokens.map((token) => ({
          to: token,
          title: "🎉 備取遞補成功！",
          body: `恭喜您！${formattedDate ? formattedDate + " " : ""}「${meetupName}」已為您成功遞補為正取，期待球場見！`,
          sound: "default",
          channelId: "pickleball-alerts",
          data: {
            type: "waitlist_promoted",
            meetup_id,
            reservation_date,
          },
        }));
        const expoRes = await sendExpoPush(appMessages);
        appPushSuccess = !!expoRes.ok;
      } catch (expoErr) {
        console.warn("Failed to send Expo App push:", expoErr);
      }
    }

    // 5. If this is a member pickup game (no organizerId), skip LINE Push to prevent incurring cost!
    if (!organizerId) {
      console.log(`[Member Pickup] Skipped LINE push notification for meetup ${meetup_id} (no organizer)`);
      return Response.json({
        ok: true,
        sent_line: false,
        sent_app: appPushSuccess,
        skipped_line: "會員自揪團不發送 LINE 官方推播以節省費用。"
      });
    }

    // Deduct LINE push quota from organizer balance
    if (lineUserId) {
      try {
        const { data: deductResult } = await supabase.rpc("deduct_organizer_message_quota", {
          p_organizer_id: organizerId,
          p_message_type: "waitlist",
          p_recipient_phone: normalizedPhone,
          p_content: `遞補成功: ${playerNickname} - ${formattedDate || reservation_date} - ${meetupName}`,
          p_cost: 1,
          p_allow_overdraft: true // 加點累計制：不阻擋發送
        });
        
        const deductRes = Array.isArray(deductResult) ? deductResult[0] : deductResult;
        if (deductRes && deductRes.ok) {
          console.log(`[Usage Recorded] Organizer ${orgName} (${organizerId}) cumulative push count: ${deductRes.new_quota}`);
        }
      } catch (deductErr) {
        console.error("Failed to deduct message quota:", deductErr);
      }
    }
    
    let lineSuccess = false;
    if (lineUserId) {
      lineSuccess = await sendLinePushFlex(lineUserId, flexContents, `匹克球同樂會 - 備取遞補成功！`);
    }
    
    return Response.json({
      ok: true,
      sent_line: lineSuccess,
      sent_app: appPushSuccess
    });
  } catch (error) {
    console.error("Waitlist notification error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
