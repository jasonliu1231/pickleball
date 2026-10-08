export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";
import { normalizeTokens, fetchTokensForMeetup, sendExpoPush, sendLinePushFlex } from "@/lib/line";

export async function POST(request) {
  try {
    const body = await request.json();
    let pushTokens = normalizeTokens(body.pushTokens);
    let resolvedMeetupName = body.meetupName;
    let organizerLineUserId = null;

    if (body.meetupId) {
      const fetched = await fetchTokensForMeetup(supabase, body.meetupId);
      if (!pushTokens.length && fetched.tokens) {
        pushTokens = fetched.tokens;
      }
      if (!resolvedMeetupName && fetched.name) {
        resolvedMeetupName = fetched.name;
      }
      if (fetched.organizerLineUserId) {
        organizerLineUserId = fetched.organizerLineUserId;
      }
    }

    const meetupName = resolvedMeetupName || body.meetupName || "開團活動";
    const nickname = body.nickname || "球友";
    const reservationDate = body.reservationDate || "";
    let formattedDate = "";
    if (reservationDate) {
      const parts = reservationDate.split("-");
      if (parts.length === 3) {
        formattedDate = `${Number(parts[1])}/${Number(parts[2])}`;
      }
    }

    let expoSent = false;
    let lineSent = false;

    // 1. 發送 Expo 原生推播至團主行動裝置 (iPhone / iPad)
    if (pushTokens.length > 0) {
      const messages = pushTokens.map((token) => ({
        to: token,
        title: formattedDate ? `有人取消預約 ${formattedDate}` : "有人取消預約了",
        body: formattedDate 
          ? `${nickname} 取消了 ${formattedDate}「${meetupName}」的預約`
          : `${nickname} 取消了「${meetupName}」的預約`,
        sound: "default",
        channelId: "new-signup",
        data: {
          type: "cancel_signup",
          meetup_id: body.meetupId,
          reservation_date: body.reservationDate,
        },
      }));
      const expoResult = await sendExpoPush(messages);
      expoSent = !!expoResult?.ok;
    }

    // 2. 若團主有綁定 LINE 帳號，同步發送 LINE 提醒
    if (organizerLineUserId) {
      const flex = {
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#e11d48",
          paddingAll: "16px",
          contents: [
            {
              type: "text",
              text: "⚠️ 球友取消預約通知",
              color: "#ffffff",
              weight: "bold",
              size: "md"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            {
              type: "text",
              text: `開團：${meetupName}`,
              weight: "bold",
              size: "sm",
              wrap: true
            },
            {
              type: "box",
              layout: "vertical",
              spacing: "xs",
              contents: [
                {
                  type: "box",
                  layout: "baseline",
                  contents: [
                    { type: "text", text: "📅 活動日期", color: "#64748b", size: "xs", flex: 2 },
                    { type: "text", text: formattedDate || reservationDate || "未指定", color: "#1e293b", size: "xs", weight: "bold", flex: 4 }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  contents: [
                    { type: "text", text: "👤 取消球友", color: "#64748b", size: "xs", flex: 2 },
                    { type: "text", text: nickname, color: "#e11d48", size: "xs", weight: "bold", flex: 4 }
                  ]
                }
              ]
            }
          ]
        }
      };
      lineSent = await sendLinePushFlex(
        organizerLineUserId,
        flex,
        `取消通知：${nickname} 取消了 ${formattedDate}「${meetupName}」`
      );
    }

    if (!pushTokens.length && !organizerLineUserId) {
      return Response.json({ ok: true, sent: 0, message: "此開團目前沒有啟用的推播裝置或綁定LINE" });
    }

    return Response.json({
      ok: true,
      expoSent,
      lineSent,
      tokensCount: pushTokens.length,
      hasOrganizerLine: !!organizerLineUserId
    });
  } catch (error) {
    return Response.json(
      { ok: false, message: error?.message || "取消通知發送失敗" },
      { status: 500 }
    );
  }
}
