export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";
import { normalizeTokens, fetchTokensForMeetup, sendExpoPush } from "@/lib/line";

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

    if (!expoResult.ok) {
      return Response.json(
        { ok: false, message: "Expo 推播 API 回傳錯誤", result: expoResult.data || expoResult.error },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, result: expoResult.data });
  } catch (error) {
    return Response.json(
      { ok: false, message: error?.message || "取消通知發送失敗" },
      { status: 500 }
    );
  }
}
