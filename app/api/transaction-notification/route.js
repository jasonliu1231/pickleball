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
    const { member_id, amount, type, notes } = body;
    
    if (!member_id) {
      return Response.json({ ok: false, message: "Missing member_id" }, { status: 400 });
    }
    
    // 1. Fetch member details and current balance
    const members = await querySupabase("members", {
      id: `eq.${member_id}`,
      select: "system_member_id,balance,nickname"
    });
    
    if (!members || members.length === 0 || !members[0].system_member_id) {
      console.log(`No member profile found for member_id: ${member_id}`);
      return Response.json({ ok: true, message: "No system member linked to this member" });
    }
    
    const member = members[0];
    const balanceAmount = Number(member.balance || 0);
    const amountVal = Number(amount || 0);
    
    // 2. Fetch system_members details to get line_user_id
    const systemMembers = await querySupabase("system_members", {
      id: `eq.${member.system_member_id}`,
      select: "line_user_id"
    });
    
    if (!systemMembers || systemMembers.length === 0 || !systemMembers[0].line_user_id) {
      console.log(`No LINE user ID linked to system_member_id: ${member.system_member_id}`);
      return Response.json({ ok: true, message: "No LINE ID linked to this member" });
    }
    
    const lineUserId = systemMembers[0].line_user_id;
    const playerNickname = member.nickname || "會員";
    
    // 3. Format push message based on transaction type
    let messageText = "";
    const typeLabel = type || "checkin";
    
    if (typeLabel === "checkin") {
      messageText = `💸 匹克球同樂會 - 會員扣點通知\n\n球友您好：您的帳戶已成功扣除點數！\n\n項目：${notes || "簽到出席扣款"}\n扣除金額：-${Math.abs(amountVal)} 元\n目前剩餘餘額：$ ${balanceAmount.toLocaleString()} 元\n\n祝您打球愉快！🏓`;
    } else if (typeLabel === "topup") {
      messageText = `💰 匹克球同樂會 - 會員儲值通知\n\n球友您好：您的帳戶已成功儲值入帳！\n\n項目：${notes || "帳戶儲值"}\n儲值金額：+${Math.abs(amountVal)} 元\n目前剩餘餘額：$ ${balanceAmount.toLocaleString()} 元\n\n感謝您的支持！🏓`;
    } else if (typeLabel === "refund") {
      messageText = `🔄 匹克球同樂會 - 額度退回通知\n\n球友您好：您的帳戶已退回預約額度。\n\n項目：${notes || "取消簽到退款"}\n退款金額：+${Math.abs(amountVal)} 元\n目前剩餘餘額：$ ${balanceAmount.toLocaleString()} 元\n\n若有疑問請聯絡團長，祝您打球愉快！🏓`;
    } else {
      // General fallback
      messageText = `🔔 匹克球同樂會 - 帳戶交易通知\n\n球友您好：您的帳戶有一筆交易異動。\n\n說明：${notes || "帳戶異動"}\n金額：${amountVal > 0 ? "+" + amountVal : amountVal} 元\n目前剩餘餘額：$ ${balanceAmount.toLocaleString()} 元`;
    }
    
    // 4. Send LINE Push Message
    const success = await sendLinePush(lineUserId, messageText);
    
    return Response.json({ ok: true, sent: success });
  } catch (error) {
    console.error("Transaction notification error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
