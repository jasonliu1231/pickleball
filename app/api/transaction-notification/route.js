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
    const { member_id, amount, type, notes } = body;
    
    if (!member_id) {
      return Response.json({ ok: false, message: "Missing member_id" }, { status: 400 });
    }
    
    // 1. Fetch member details, balance, and organizer name
    const members = await querySupabase("members", {
      id: `eq.${member_id}`,
      select: "system_member_id,balance,name,organizers(name)"
    });
    
    if (!members || members.length === 0 || !members[0].system_member_id) {
      console.log(`No member profile found for member_id: ${member_id}`);
      return Response.json({ ok: true, message: "No system member linked to this member" });
    }
    
    const member = members[0];
    const balanceAmount = Number(member.balance || 0);
    const amountVal = Number(amount || 0);
    const orgName = member.organizers?.name || "未知團主";
    
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
    const playerNickname = member.name || "會員";
    const typeLabel = type || "checkin";

    // 3. Format header and labels based on transaction type
    let headerTitle = "帳戶交易通知";
    let amountTextLabel = "交易點數";
    let amountSign = amountVal > 0 ? "+" : "";
    let amountColor = amountVal >= 0 ? "#4ade80" : "#f87171";
    let headerColor = "#fb923c"; // Default orange/amber

    if (typeLabel === "checkin") {
      headerTitle = "帳戶扣點通知";
      amountTextLabel = "扣除點數";
      headerColor = "#fb923c"; // Warm orange/coral for deductions
    } else if (typeLabel === "topup") {
      headerTitle = "帳戶儲值通知";
      amountTextLabel = "儲值點數";
      headerColor = "#4ade80"; // Bright green for top-ups
    } else if (typeLabel === "refund") {
      headerTitle = "帳戶退款通知";
      amountTextLabel = "退回點數";
      headerColor = "#38bdf8"; // Light sky blue for refunds
    }

    const flexContents = {
      type: "bubble",
      size: "giga",
      styles: {
        header: {
          backgroundColor: "#18181b" // Deep charcoal
        },
        body: {
          backgroundColor: "#27272a" // Medium charcoal
        },
        footer: {
          backgroundColor: "#18181b"
        }
      },
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: headerTitle,
            weight: "bold",
            color: headerColor,
            size: "lg"
          },
          {
            type: "text",
            text: "匹克球同樂會 - 儲值會員",
            color: "#9ca3af",
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
                color: "#9ca3af",
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
                color: "#9ca3af",
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
            color: "#374151",
            margin: "md"
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "交易項目",
                color: "#9ca3af",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: notes || (typeLabel === "checkin" ? "簽到出席扣款" : typeLabel === "topup" ? "帳戶儲值" : "取消退款"),
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
                text: amountTextLabel,
                color: "#9ca3af",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: `${amountSign}${amountVal} 點`,
                color: amountColor,
                size: "md",
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
                text: "最新餘額",
                color: "#9ca3af",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: `${balanceAmount.toLocaleString()} 點`,
                color: "#4ade80",
                size: "lg",
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
            color: "#0d9488"
          }
        ]
      }
    };
    
    // 4. Send LINE Push Message
    const success = await sendLinePushFlex(lineUserId, flexContents, `匹克球同樂會 - ${headerTitle}`);
    
    return Response.json({ ok: true, sent: success });
  } catch (error) {
    console.error("Transaction notification error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
