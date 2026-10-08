export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";
import { normalizeTokens, fetchTokensForMeetup, sendExpoPush } from "@/lib/line";

const skillTextMap = {
  first_time: "第一次參加",
  beginner: "初學",
  normal: "一般",
  advanced: "進階",
};

export async function POST(request) {
  try {
    const body = await request.json();
    let pushTokens = normalizeTokens(body.pushTokens);
    let resolvedMeetupName = body.meetupName;

    if (!pushTokens.length && body.meetupId) {
      const fetched = await fetchTokensForMeetup(supabase, body.meetupId);
      pushTokens = fetched.tokens;
      if (!resolvedMeetupName && fetched.name) {
        resolvedMeetupName = fetched.name;
      }
    }

    if (!pushTokens.length) {
      return Response.json({ ok: true, sent: 0, message: "此開團目前沒有啟用的推播裝置" });
    }

    const skillText = skillTextMap[body.skillLevel] || "一般";
    const meetupName = resolvedMeetupName || body.meetupName || "開團";
    const nickname = body.nickname || "球友";
    const reservationDate = body.reservationDate || "";
    let formattedDate = "";
    if (reservationDate) {
      const parts = reservationDate.split("-");
      if (parts.length === 3) {
        formattedDate = `${Number(parts[1])}/${Number(parts[2])}`;
      }
    }

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

    if (!expoResult.ok) {
      return Response.json(
        { ok: false, message: "Expo 推播 API 回傳錯誤", result: expoResult.data || expoResult.error },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, result: expoResult.data });
  } catch (error) {
    return Response.json(
      { ok: false, message: error?.message || "通知發送失敗" },
      { status: 500 }
    );
  }
}
