export const runtime = "nodejs";

const skillTextMap = {
  first_time: "第一次參加",
  beginner: "初學",
  normal: "一般",
  advanced: "進階",
};

function normalizeTokens(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return [value].filter(Boolean);
  return [];
}

export async function POST(request) {
  try {
    const body = await request.json();
    const pushTokens = normalizeTokens(body.pushTokens);

    if (!pushTokens.length) {
      return Response.json({ ok: false, message: "沒有可用的推播 token" }, { status: 400 });
    }

    const skillText = skillTextMap[body.skillLevel] || "一般";
    const meetupName = body.meetupName || "開團";
    const nickname = body.nickname || "球友";

    const messages = pushTokens.map((token) => ({
      to: token,
      title: "有人報名了",
      body: `${nickname} 報名「${meetupName}」｜${skillText}`,
      sound: "default",
      channelId: "new-signup",
      data: {
        type: "new_signup",
        meetup_id: body.meetupId,
        reservation_date: body.reservationDate,
      },
    }));

    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });

    const expoResult = await expoResponse.json().catch(() => null);

    if (!expoResponse.ok) {
      return Response.json(
        { ok: false, message: "Expo 推播 API 回傳錯誤", result: expoResult },
        { status: expoResponse.status }
      );
    }

    return Response.json({ ok: true, result: expoResult });
  } catch (error) {
    return Response.json(
      { ok: false, message: error?.message || "通知發送失敗" },
      { status: 500 }
    );
  }
}
