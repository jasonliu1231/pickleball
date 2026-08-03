export const runtime = "nodejs";

const SUPABASE_URL = "https://vurcntmcpemioybqqrcx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Z9nUlOsBQ3cIi37lr00vcw_VdBEDo3o";

// Helper to query Supabase REST API
async function querySupabase(endpoint, queryParams = {}) {
  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}${queryString ? "?" + queryString : ""}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    }
  });
  
}

// Helper to call Supabase RPC via REST API
async function callSupabaseRpc(rpcName, rpcParams = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${rpcName}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(rpcParams)
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`RPC ${rpcName} failed: ${response.status} ${errText}`);
  }
  return await response.json();
}

// Helper to send LINE Push Flex Notification
async function sendLinePushFlex(lineUserId, flexContents, altText) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    console.error("Missing LINE_CHANNEL_ACCESS_TOKEN env variable");
    return false;
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${channelAccessToken}`
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [
        {
          type: "flex",
          altText: altText,
          contents: flexContents
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to send LINE push notification:", response.status, errorBody);
    return false;
  }
  return true;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { meetup_id, phone, nickname, reservation_date } = body;
    
    if (!phone) {
      return Response.json({ ok: false, message: "Missing phone" }, { status: 400 });
    }
    
    // Normalize phone number (strip spaces/dashes)
    const normalizedPhone = phone.replace(/[^0-9]/g, "");
    
    // 1. Find system member by phone number
    const systemMembers = await querySupabase("system_members", {
      phone: `eq.${normalizedPhone}`,
      select: "line_user_id,nickname"
    });
    
    if (!systemMembers || systemMembers.length === 0 || !systemMembers[0].line_user_id) {
      console.log(`No LINE user found for phone: ${normalizedPhone}`);
      return Response.json({ ok: true, message: "No LINE ID linked to this phone" });
    }
    
    const lineUserId = systemMembers[0].line_user_id;
    const playerNickname = nickname || systemMembers[0].nickname || "球友";
    
    // 2. Fetch meetup details, organizer_id and organizer name
    let meetupName = "球團活動";
    let orgName = "未知團主";
    let organizerId = null;
    if (meetup_id) {
      const meetups = await querySupabase("meetups", {
        id: `eq.${meetup_id}`,
        select: "name,organizer_id,organizers(name)"
      });
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
    
    // 4. Deduct LINE push quota from organizer balance
    if (organizerId) {
      try {
        const deductResult = await callSupabaseRpc("deduct_organizer_message_quota", {
          p_organizer_id: organizerId,
          p_message_type: "waitlist",
          p_recipient_phone: normalizedPhone,
          p_content: `遞補成功: ${playerNickname} - ${formattedDate || reservation_date} - ${meetupName}`,
          p_cost: 1,
          p_allow_overdraft: false // strict blocking
        });
        
        const deductRes = Array.isArray(deductResult) ? deductResult[0] : deductResult;
        if (deductRes && deductRes.ok === false) {
          console.warn(`[Quota Blocked] Organizer ${orgName} (${organizerId}) has insufficient quota: ${deductRes.message}`);
          return Response.json({ ok: false, error: deductRes.message || "推播額度不足，發送失敗。" }, { status: 403 });
        }
      } catch (deductErr) {
        console.error("Failed to deduct message quota:", deductErr);
        // Fail-safe: if DB RPC call throws error, proceed to send the message anyway so we don't break service
      }
    }
    
    const success = await sendLinePushFlex(lineUserId, flexContents, `匹克球同樂會 - 備取遞補成功！`);
    
    return Response.json({ ok: true, sent: success });
  } catch (error) {
    console.error("Waitlist notification error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
