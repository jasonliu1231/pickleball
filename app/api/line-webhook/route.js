import crypto from "crypto";

export const runtime = "nodejs";

const SUPABASE_URL = "https://vurcntmcpemioybqqrcx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Z9nUlOsBQ3cIi37lr00vcw_VdBEDo3o";

// The main organizer ID (東東) for this bot
const TARGET_ORGANIZER_ID = "6405ca2f-cd47-496c-a31b-a622651b198b";

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

// Verify LINE signature
function verifySignature(bodyStr, channelSecret, signature) {
  if (!channelSecret || !signature) return true; // Skip verification if not configured
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(bodyStr)
    .digest("base64");
  return hash === signature;
}

// Send reply message to LINE
async function sendLineReply(replyToken, messages) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    console.error("Missing LINE_CHANNEL_ACCESS_TOKEN env variable");
    return;
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${channelAccessToken}`
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: messages
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to send LINE reply:", response.status, errorBody);
  }
}

export async function POST(request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET ? process.env.LINE_CHANNEL_SECRET.trim() : null;
  
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature");
    
    const body = JSON.parse(rawBody);
    const events = body.events || [];
    
    // If it is LINE's verify request (empty events), return 200 directly
    if (events.length === 0) {
      return Response.json({ ok: true, message: "Verification success" });
    }
    
    // Verify signature for real events if secret is configured
    if (channelSecret && !verifySignature(rawBody, channelSecret, signature)) {
      console.warn("⚠️ LINE Webhook Signature verification failed. Check if LINE_CHANNEL_SECRET is correct. Proceeding for debugging...");
    }
    
    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const text = event.message.text.trim();
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        
        if (text === "查詢餘額") {
          await handleQueryBalance(replyToken, userId);
        } else if (text === "使用紀錄") {
          await handleQueryHistory(replyToken, userId);
        } else if (text === "查詢ID") {
          await handleQueryId(replyToken, userId);
        }
      }
    }
    
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// Handler for 查詢餘額
async function handleQueryBalance(replyToken, lineUserId) {
  try {
    // 1. Find system member by LINE user ID
    const systemMembers = await querySupabase("system_members", {
      line_user_id: `eq.${lineUserId}`,
      select: "id,nickname,phone"
    });
    
    if (!systemMembers || systemMembers.length === 0) {
      await sendLineReply(replyToken, [
        {
          type: "text",
          text: "您好！我們在系統中找不到您的 LINE 綁定資料。\n\n請先前往我們的預約網站：\nhttps://pickleball.jason1231.com\n\n完成一次「LINE 登入」，系統就會自動完成與您會員身分的綁定喔！"
        }
      ]);
      return;
    }
    
    const sysMember = systemMembers[0];
    
    // 2. Find all member profiles linked to this system member (across all organizers)
    const members = await querySupabase("members", {
      system_member_id: `eq.${sysMember.id}`,
      select: "id,balance,name,organizers(name)"
    });
    
    if (!members || members.length === 0) {
      await sendLineReply(replyToken, [
        {
          type: "text",
          text: `您好 ${sysMember.nickname || "球友"}！您已完成網站登入綁定，但您目前尚未在任何球團或俱樂部開通儲值金會員帳戶。\n\n若您有儲值需求，請提供您的姓名或手機，聯絡各球團團長在後台為您建立會員錢包！`
        }
      ]);
      return;
    }
    
    // 3. Build dynamic card rows for each wallet
    const walletRows = [];
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const orgName = m.organizers?.name || "未知團主";
      const balanceAmount = Number(m.balance || 0);
      
      walletRows.push({
        type: "box",
        layout: "vertical",
        spacing: "xs",
        contents: [
          {
            type: "text",
            text: `團主：${orgName}`,
            weight: "bold",
            color: "#38bdf8",
            size: "sm"
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: `球友姓名：${m.name}`, color: "#e5e7eb", size: "sm" },
              { type: "text", text: `${balanceAmount.toLocaleString()} 點`, color: "#4ade80", size: "md", align: "end", weight: "bold" }
            ]
          }
        ]
      });
      
      if (i < members.length - 1) {
        walletRows.push({
          type: "separator",
          color: "#374151",
          margin: "md"
        });
      }
    }
    
    // 4. Build a beautiful Flex Message
    const flexMessage = {
      type: "flex",
      altText: "🏓 匹克球同樂會 - 儲值餘額查詢",
      contents: {
        type: "bubble",
        styles: {
          header: { backgroundColor: "#111827" },
          body: { backgroundColor: "#1f2937" },
          footer: { backgroundColor: "#111827" }
        },
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "我的儲值餘額",
              weight: "bold",
              color: "#38bdf8",
              size: "lg"
            },
            {
              type: "text",
              text: "各團主帳戶儲值金明細",
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
              contents: [
                { type: "text", text: "綁定手機", color: "#9ca3af", size: "xs" },
                { type: "text", text: sysMember.phone || "無", color: "#ffffff", size: "xs", align: "end" }
              ]
            },
            {
              type: "separator",
              color: "#4b5563",
              margin: "sm"
            },
            ...walletRows
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
      }
    };
    
    await sendLineReply(replyToken, [flexMessage]);
  } catch (error) {
    console.error("Error in handleQueryBalance:", error);
    await sendLineReply(replyToken, [
      {
        type: "text",
        text: "抱歉，查詢餘額時發生伺服器錯誤，請稍後再試，或聯絡團長處理。"
      }
    ]);
  }
}

// Handler for 使用紀錄
async function handleQueryHistory(replyToken, lineUserId) {
  try {
    // 1. Find system member
    const systemMembers = await querySupabase("system_members", {
      line_user_id: `eq.${lineUserId}`,
      select: "id,nickname"
    });
    
    if (!systemMembers || systemMembers.length === 0) {
      await sendLineReply(replyToken, [
        {
          type: "text",
          text: "您好！我們在系統中找不到您的 LINE 綁定資料。請先前往預約網站完成 LINE 登入以綁定會員！"
        }
      ]);
      return;
    }
    
    const sysMember = systemMembers[0];
    
    // 2. Find member profiles across all organizers
    const members = await querySupabase("members", {
      system_member_id: `eq.${sysMember.id}`,
      select: "id,payer_member_id,organizers(name)"
    });
    
    if (!members || members.length === 0) {
      await sendLineReply(replyToken, [
        {
          type: "text",
          text: "您尚未開通任何團主的儲值金會員帳戶，目前沒有交易紀錄。"
        }
      ]);
      return;
    }
    
    // Map target member IDs (incorporating shared wallets) to organizer names
    const memberIdToOrgName = {};
    const memberIds = [];
    members.forEach(m => {
      const targetId = m.payer_member_id || m.id;
      memberIds.push(targetId);
      memberIdToOrgName[targetId] = m.organizers?.name || "未知團主";
    });
    
    // 3. Query transactions (limit 10, desc order)
    const transactions = await querySupabase("wallet_transactions", {
      member_id: `in.(${[...new Set(memberIds)].join(",")})`,
      order: "created_at.desc",
      limit: "10",
      select: "id,type,amount,notes,created_at,reservation_date,member_id"
    });
    
    if (!transactions || transactions.length === 0) {
      await sendLineReply(replyToken, [
        {
          type: "text",
          text: "您目前尚無任何儲值或消費使用紀錄。"
        }
      ]);
      return;
    }
    
    // 4. Build a beautiful Flex Message Timeline
    const typeLabelMap = {
      topup: { label: "儲值", color: "#4ade80", sign: "+" },
      checkin: { label: "扣點", color: "#f87171", sign: "-" },
      refund: { label: "退款", color: "#38bdf8", sign: "+" }
    };
    
    const bubbleContents = transactions.map((t, idx) => {
      const typeInfo = typeLabelMap[t.type] || { label: "交易", color: "#ffffff", sign: "" };
      const orgName = memberIdToOrgName[t.member_id] || "未知團主";
      const notesText = `[${orgName}] ${t.notes || (t.type === "checkin" ? "簽到出席扣款" : t.type === "topup" ? "帳戶儲值" : "取消退款")}`;
      
      const utcDate = new Date(t.created_at);
      const taipeiDate = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
      const dateStr = `${taipeiDate.getUTCFullYear()}/${String(taipeiDate.getUTCMonth() + 1).padStart(2, "0")}/${String(taipeiDate.getUTCDate()).padStart(2, "0")} ${String(taipeiDate.getUTCHours()).padStart(2, "0")}:${String(taipeiDate.getUTCMinutes()).padStart(2, "0")}`;
      
      const itemBox = {
        type: "box",
        layout: "vertical",
        margin: idx > 0 ? "lg" : "none",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: typeInfo.label,
                weight: "bold",
                color: typeInfo.color,
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: `${typeInfo.sign}${Math.abs(Number(t.amount))} 點`,
                weight: "bold",
                color: typeInfo.color,
                size: "sm",
                align: "end",
                flex: 3
              }
            ]
          },
          {
            type: "text",
            text: notesText,
            color: "#ffffff",
            size: "xs",
            margin: "xs",
            wrap: true
          },
          {
            type: "text",
            text: dateStr,
            color: "#9ca3af",
            size: "xxs",
            margin: "xs"
          }
        ]
      };
      
      return itemBox;
    });
    
    // Add separators in between
    const bodyBoxContents = [];
    for (let i = 0; i < bubbleContents.length; i++) {
      bodyBoxContents.push(bubbleContents[i]);
      if (i < bubbleContents.length - 1) {
        bodyBoxContents.push({
          type: "separator",
          color: "#374151",
          margin: "md"
        });
      }
    }
    
    const flexMessage = {
      type: "flex",
      altText: "🏓 匹克球同樂會 - 最近使用紀錄",
      contents: {
        type: "bubble",
        styles: {
          header: { backgroundColor: "#111827" },
          body: { backgroundColor: "#1f2937" },
          footer: { backgroundColor: "#111827" }
        },
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "交易使用紀錄",
              weight: "bold",
              color: "#38bdf8",
              size: "lg"
            },
            {
              type: "text",
              text: `最近 ${transactions.length} 筆儲值與消費明細`,
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
          contents: bodyBoxContents
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
      }
    };
    
    await sendLineReply(replyToken, [flexMessage]);
  } catch (error) {
    console.error("Error in handleQueryHistory:", error);
    await sendLineReply(replyToken, [
      {
        type: "text",
        text: "抱歉，查詢使用紀錄時發生伺服器錯誤，請稍後再試。"
      }
    ]);
  }
}

// Handler for 查詢ID
async function handleQueryId(replyToken, lineUserId) {
  try {
    const systemMembers = await querySupabase("system_members", {
      line_user_id: `eq.${lineUserId}`,
      select: "id,nickname"
    });
    
    if (!systemMembers || systemMembers.length === 0) {
      await sendLineReply(replyToken, [
        {
          type: "text",
          text: "您好！我們在系統中找不到您的 LINE 帳號資料，代表您尚未登入過網站。\n\n請先前往我們的預約網站完成 LINE 登入：\nhttps://pickleball.jason1231.com"
        }
      ]);
      return;
    }
    
    const sysMember = systemMembers[0];
    
    await sendLineReply(replyToken, [
      {
        type: "text",
        text: `【 系統會員 ID 查詢 】\n\n球友您好：${sysMember.nickname || ""}\n\n您的系統會員 ID 為：\n${sysMember.id}\n\n（您可以長按複製此 ID 提供給團長，以便在管理後台將您的儲值金帳戶與此 ID 進行手動綁定！）`
      }
    ]);
  } catch (error) {
    console.error("Error in handleQueryId:", error);
    await sendLineReply(replyToken, [
      {
        type: "text",
        text: "抱歉，查詢會員 ID 時發生伺服器錯誤，請稍後再試。"
      }
    ]);
  }
}
