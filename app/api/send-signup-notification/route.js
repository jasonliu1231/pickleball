export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";
import { normalizeTokens, fetchTokensForMeetup, sendExpoPush } from "@/lib/line";

const skillTextMap = {
  first_time: "需教學 (<2.0)",
  "2.0": "需教學 (<2.0)",
  beginner: "初學 (2.0-2.5)",
  "2.5": "初學 (2.0-2.5)",
  normal: "一般 (2.5-3.0)",
  "3.0": "一般 (2.5-3.0)",
  advanced: "進階 (3.0+)",
  "3.5": "進階 (3.0+)",
};

export async function POST(request) {
  try {
    const body = await request.json();
    let pushTokens = normalizeTokens(body.pushTokens);
    let resolvedMeetupName = body.meetupName;

    if (body.meetupId) {
      const fetched = await fetchTokensForMeetup(supabase, body.meetupId);
      if (!pushTokens.length && fetched.tokens) {
        pushTokens = fetched.tokens;
      }
      if (!resolvedMeetupName && fetched.name) {
        resolvedMeetupName = fetched.name;
      }
    }

    const skillText = skillTextMap[body.skillLevel] || "初學 (2.0-2.5)";
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

    // 發送 Expo 原生推播至團主行動裝置 (iPhone / iPad / Android)
    if (pushTokens.length > 0) {
      const messages = pushTokens.map((token) => ({
        to: token,
        title: formattedDate ? `有人報名 ${formattedDate}` : "有人報名了",
        body: formattedDate 
          ? `${nickname} 報名 ${formattedDate}「${meetupName}」｜${skillText}`
          : `${nickname} 報名「${meetupName}」｜${skillText}`,
        sound: "default",
        channelId: "new-signup",
        data: {
          type: "new_signup",
          meetup_id: body.meetupId,
          reservation_date: body.reservationDate,
        },
      }));
      const expoResult = await sendExpoPush(messages);
      expoSent = !!expoResult?.ok;
    }

    if (!pushTokens.length) {
      return Response.json({ ok: true, sent: 0, message: "此開團目前沒有啟用的推播裝置" });
    }

    return Response.json({
      ok: true,
      expoSent,
      tokensCount: pushTokens.length,
    });
  } catch (error) {
    return Response.json(
      { ok: false, message: error?.message || "通知發送失敗" },
      { status: 500 }
    );
  }
}
