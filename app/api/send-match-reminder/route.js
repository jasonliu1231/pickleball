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
    const errText = await response.text();
    throw new Error(`Query ${endpoint} failed: ${response.status} ${errText}`);
  }
  return await response.json();
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

// Helper to clean/normalize phone number
function normalizePhone(phone) {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("886")) {
    clean = "0" + clean.slice(3);
  }
  return clean;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { meetup_id, date } = body;
    
    if (!meetup_id || !date) {
      return Response.json({ ok: false, error: "Missing meetup_id or date" }, { status: 400 });
    }
    
    // 1. Fetch meetup details, organizer_id and location
    const meetups = await querySupabase("meetups", {
      id: `eq.${meetup_id}`,
      select: "name,organizer_id,city,address,organizers(name)"
    });
    
    if (!meetups || meetups.length === 0) {
      return Response.json({ ok: false, error: "Meetup not found" }, { status: 404 });
    }
    
    const meetup = meetups[0];
    const meetupName = meetup.name;
    const organizerId = meetup.organizer_id;
    const orgName = meetup.organizers?.name || "未知團主";
    const meetupLocation = [meetup.city, meetup.address].filter(Boolean).join(" ") || "未設定地點";
    
    // 2. Fetch all general confirmed signups
    const signups = await querySupabase("signups", {
      meetup_id: `eq.${meetup_id}`,
      reservation_date: `eq.${date}`,
      status: `eq.confirmed`
    });

    // 3. Fetch all subscribed members for this meetup
    const subscriptions = await querySupabase("member_meetup_subscriptions", {
      meetup_id: `eq.${meetup_id}`,
      select: "member_id,members(id,name,phone,status)"
    });

    // Filter active members
    const subscribedMembers = (subscriptions || [])
      .map(s => s.members)
      .filter(m => m && m.status === 'active');

    // Fetch absences for this meetup and date
    const absences = await querySupabase("member_absences", {
      meetup_id: `eq.${meetup_id}`,
      reservation_date: `eq.${date}`,
      select: "member_id"
    });
    const absentMemberIds = new Set((absences || []).map(a => a.member_id));

    // Filter out absent members
    const attendingMembers = subscribedMembers.filter(m => !absentMemberIds.has(m.id));
    
    // 4. Combine all attending players
    const combinedPlayersMap = new Map();
    
    // Process general signups
    (signups || []).forEach(s => {
      const cleanPh = normalizePhone(s.phone);
      if (cleanPh) {
        combinedPlayersMap.set(cleanPh, {
          phone: cleanPh,
          nickname: s.nickname || "球友"
        });
      }
    });
    
    // Process fixed members
    attendingMembers.forEach(m => {
      const cleanPh = normalizePhone(m.phone);
      if (cleanPh) {
        combinedPlayersMap.set(cleanPh, {
          phone: cleanPh,
          nickname: m.name || "會員"
        });
      }
    });
    
    const playersToRemind = Array.from(combinedPlayersMap.values());
    if (playersToRemind.length === 0) {
      return Response.json({ ok: true, sent_count: 0, skipped_count: 0, message: "當天沒有報名的球友或固定出席會員。" });
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
    
    // 5. Broadcast to each player who has a linked LINE ID
    for (const player of playersToRemind) {
      // Find system member by phone number
      const systemMembers = await querySupabase("system_members", {
        phone: `eq.${player.phone}`,
        select: "line_user_id,nickname"
      });
      
      if (!systemMembers || systemMembers.length === 0 || !systemMembers[0].line_user_id) {
        skippedCount++;
        continue; // Skip players without LINE linked
      }
      
      const lineUserId = systemMembers[0].line_user_id;
      const playerNickname = player.nickname || systemMembers[0].nickname || "球友";
      
      // Deduct 1 point from organizer quota
      if (organizerId) {
        try {
          const deductResult = await callSupabaseRpc("deduct_organizer_message_quota", {
            p_organizer_id: organizerId,
            p_message_type: "reminder",
            p_recipient_phone: player.phone,
            p_content: `行前提醒: ${playerNickname} - ${formattedDate || date} - ${meetupName}`,
            p_cost: 1,
            p_allow_overdraft: false // strict blocking
          });
          
          const deductRes = Array.isArray(deductResult) ? deductResult[0] : deductResult;
          if (deductRes && deductRes.ok === false) {
            console.warn(`[Quota Blocked] Organizer (${organizerId}) has insufficient quota: ${deductRes.message}`);
            return Response.json({ 
              ok: true, 
              sent_count: sentCount, 
              skipped_count: skippedCount, 
              status: "quota_exceeded", 
              error: "推播額度不足，部分發送失敗。" 
            });
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
            backgroundColor: "#064e3b" // Deep Forest Green
          },
          body: {
            backgroundColor: "#022c22" // Emerald dark
          },
          footer: {
            backgroundColor: "#064e3b"
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
              color: "#34d399", // Emerald light accent
              size: "lg"
            },
            {
              type: "text",
              text: "別忘了您的匹克球球局約定喔！",
              color: "#a7f3d0",
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
                  color: "#a7f3d0",
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
                  color: "#a7f3d0",
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
              color: "#047857",
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
                  color: "#a7f3d0",
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
                  color: "#a7f3d0",
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
                  color: "#a7f3d0",
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
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: {
                type: "uri",
                label: "查看預約狀態 ➔",
                uri: "https://pickleball.jason1231.com/member"
              },
              style: "primary",
              color: "#059669"
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
    
    return Response.json({ ok: true, sent_count: sentCount, skipped_count: skippedCount });
  } catch (error) {
    console.error("Broadcast reminder error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
