import crypto from "crypto";

/**
 * 送出 LINE Flex 訊息推播 (Push Message)
 */
export async function sendLinePushFlex(lineUserId, flexContents, altText = "匹克球活動通知") {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    console.error("Missing LINE_CHANNEL_ACCESS_TOKEN env variable");
    return false;
  }

  try {
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
  } catch (err) {
    console.error("Error sending LINE push flex:", err);
    return false;
  }
}

/**
 * 回覆 LINE Webhook 訊息 (Reply Message)
 */
export async function sendLineReply(replyToken, messages) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    console.error("Missing LINE_CHANNEL_ACCESS_TOKEN env variable");
    return false;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: Array.isArray(messages) ? messages : [messages]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Failed to send LINE reply:", response.status, errorBody);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error sending LINE reply:", err);
    return false;
  }
}

/**
 * 驗證 LINE Webhook HMAC-SHA256 簽章
 */
export function verifyLineSignature(bodyStr, channelSecret, signature) {
  if (!channelSecret || !signature) return true; // 若未配置密鑰則略過驗證
  try {
    const hash = crypto
      .createHmac("sha256", channelSecret)
      .update(bodyStr)
      .digest("base64");
    return hash === signature;
  } catch (e) {
    console.error("verifyLineSignature error:", e);
    return false;
  }
}

/**
 * 電話號碼標準化 (過濾非數字、將 886 開頭轉為 0)
 */
export function normalizePhone(phone) {
  if (!phone) return "";
  let clean = String(phone).replace(/[^0-9]/g, "");
  if (clean.startsWith("886")) {
    clean = "0" + clean.slice(3);
  }
  return clean;
}

/**
 * 正規化推播 Tokens 陣列
 */
export function normalizeTokens(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return [value].filter(Boolean);
  return [];
}

/**
 * 查詢特定開團對應的團長與發起人 Expo Push Tokens
 */
export async function fetchTokensForMeetup(supabaseClient, meetupId) {
  if (!meetupId) return { tokens: [], name: "", organizerLineUserId: null, organizerName: "" };
  try {
    const { data: meetup, error: meetupErr } = await supabaseClient
      .from("meetups")
      .select("id, name, organizer_id, creator_user_id, organizer:organizers(id, name, phone, line_id)")
      .eq("id", meetupId)
      .maybeSingle();

    if (meetupErr || !meetup) {
      console.warn("fetchTokensForMeetup error:", meetupErr);
      return { tokens: [], name: "", organizerLineUserId: null, organizerName: "" };
    }

    const tokens = [];
    let organizerLineUserId = null;
    const organizerName = meetup.organizer?.name || "";

    if (meetup.organizer_id) {
      const { data: orgTokens } = await supabaseClient
        .from("organizer_push_tokens")
        .select("id, expo_push_token, platform, device_name, updated_at")
        .eq("organizer_id", meetup.organizer_id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (orgTokens && orgTokens.length > 0) {
        // 同一團主依據 (platform + device_name) 去重，只保留最新更新的那組 token，杜絕重灌或換版本後的舊 token 重複推播
        const seenDevices = new Set();
        const staleTokenIds = [];

        for (const t of orgTokens) {
          const deviceKey = `${t.platform || 'unknown'}-${t.device_name || 'default'}`;
          if (!seenDevices.has(deviceKey)) {
            seenDevices.add(deviceKey);
            tokens.push(t.expo_push_token);
          } else {
            staleTokenIds.push(t.id);
          }
        }

        // 背景自動停用過期的舊裝置 token
        if (staleTokenIds.length > 0) {
          supabaseClient
            .from("organizer_push_tokens")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .in("id", staleTokenIds)
            .then(() => {})
            .catch((e) => console.warn("Auto-deactivate stale tokens error:", e));
        }
      }

      // 檢查團主是否有綁定 LINE ID
      if (meetup.organizer?.line_id && String(meetup.organizer.line_id).startsWith("U")) {
        organizerLineUserId = meetup.organizer.line_id;
      } else if (meetup.organizer?.phone) {
        const cleanPh = normalizePhone(meetup.organizer.phone);
        if (cleanPh) {
          const { data: matchedUser } = await supabaseClient
            .from("users")
            .select("line_user_id")
            .eq("phone", cleanPh)
            .maybeSingle();
          if (matchedUser?.line_user_id) {
            organizerLineUserId = matchedUser.line_user_id;
          }
        }
      }
    }

    // 若非官方常態團（如個人自揪團，無 organizer_id），則通知開團發起人
    if (meetup.creator_user_id && !meetup.organizer_id) {
      const { data: creatorUser } = await supabaseClient
        .from("users")
        .select("expo_push_token, line_user_id")
        .eq("id", meetup.creator_user_id)
        .maybeSingle();

      if (creatorUser?.expo_push_token) {
        tokens.push(creatorUser.expo_push_token);
      }
      if (!organizerLineUserId && creatorUser?.line_user_id) {
        organizerLineUserId = creatorUser.line_user_id;
      }
    }

    return {
      tokens: Array.from(new Set(tokens.filter(Boolean))),
      name: meetup.name || "",
      organizerLineUserId,
      organizerName
    };
  } catch (e) {
    console.error("fetchTokensForMeetup error:", e);
    return { tokens: [], name: "", organizerLineUserId: null, organizerName: "" };
  }
}

/**
 * 發送 Expo 原生推播至伺服器
 */
export async function sendExpoPush(messages) {
  if (!messages || (Array.isArray(messages) && messages.length === 0)) {
    return { ok: true, sent: 0 };
  }
  try {
    const payload = Array.isArray(messages) ? messages : [messages];
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload.length === 1 ? payload[0] : payload)
    });
    const result = await expoResponse.json();

    // 自動清理已移除 App 或失效的 DeviceNotRegistered Token
    if (result && Array.isArray(result.data)) {
      const invalidTokens = [];
      result.data.forEach((ticket, idx) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          const targetToken = payload[idx]?.to;
          if (targetToken) invalidTokens.push(targetToken);
        }
      });

      if (invalidTokens.length > 0) {
        import("@/lib/supabase").then(({ supabase }) => {
          supabase
            .from("organizer_push_tokens")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .in("expo_push_token", invalidTokens)
            .then(() => {})
            .catch((e) => console.warn("Auto-deactivate DeviceNotRegistered error:", e));
        }).catch(() => {});
      }
    }

    return { ok: expoResponse.ok, data: result };
  } catch (e) {
    console.error("sendExpoPush error:", e);
    return { ok: false, error: e };
  }
}

/**
 * 查詢特定球友（依 phone 或 userId）的 Expo Push Tokens
 */
export async function fetchTokensForUser(supabaseClient, { phone, userId } = {}) {
  const tokens = [];
  try {
    if (phone) {
      const clean = normalizePhone(phone);
      // 1. From users table
      const { data: users } = await supabaseClient
        .from("users")
        .select("id, expo_push_token")
        .eq("phone", clean);
      if (users && users.length) {
        users.forEach((u) => {
          if (u.expo_push_token) tokens.push(u.expo_push_token);
        });
        const userIds = users.map((u) => u.id).filter(Boolean);
        if (userIds.length) {
          const { data: pushTokens } = await supabaseClient
            .from("system_member_push_tokens")
            .select("expo_push_token")
            .in("member_id", userIds)
            .eq("is_active", true);
          if (pushTokens) {
            pushTokens.forEach((p) => tokens.push(p.expo_push_token));
          }
        }
      }
    } else if (userId) {
      const { data: u } = await supabaseClient
        .from("users")
        .select("expo_push_token")
        .eq("id", userId)
        .maybeSingle();
      if (u?.expo_push_token) tokens.push(u.expo_push_token);

      const { data: pushTokens } = await supabaseClient
        .from("system_member_push_tokens")
        .select("expo_push_token")
        .eq("member_id", userId)
        .eq("is_active", true);
      if (pushTokens) {
        pushTokens.forEach((p) => tokens.push(p.expo_push_token));
      }
    }
  } catch (e) {
    console.warn("fetchTokensForUser error:", e);
  }
  return Array.from(new Set(tokens.filter(Boolean)));
}

