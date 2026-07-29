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
  
  if (!response.ok) {
    throw new Error(`Supabase query failed: ${response.statusText}`);
  }
  return await response.json();
}

// Helper to send LINE Push Notification
async function sendLinePush(lineUserId, text) {
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
          type: "text",
          text: text
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
    
    // 2. Fetch meetup details
    let meetupName = "球團活動";
    if (meetup_id) {
      const meetups = await querySupabase("meetups", {
        id: `eq.${meetup_id}`,
        select: "name"
      });
      if (meetups && meetups.length > 0) {
        meetupName = meetups[0].name;
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
    
    // 3. Send LINE Push Message
    const messageText = `🎉 匹克球同樂會 - 備取遞補成功！\n\n球友您好：您的預約活動 「${meetupName}」於 ${formattedDate || reservation_date} 已成功遞補為【 正取席位 】！\n\n期待您的出席，祝您打球愉快！🏓`;
    
    const success = await sendLinePush(lineUserId, messageText);
    
    return Response.json({ ok: true, sent: success });
  } catch (error) {
    console.error("Waitlist notification error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
