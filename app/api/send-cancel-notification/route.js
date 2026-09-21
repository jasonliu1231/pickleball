export const runtime = "nodejs";

const SUPABASE_URL = "https://vurcntmcpemioybqqrcx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Z9nUlOsBQ3cIi37lr00vcw_VdBEDo3o";

function normalizeTokens(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return [value].filter(Boolean);
  return [];
}

async function fetchTokensForMeetup(meetupId) {
  if (!meetupId) return { tokens: [], name: "" };
  try {
    const meetupRes = await fetch(`${SUPABASE_URL}/rest/v1/meetups?id=eq.${meetupId}&select=id,name,organizer_id,creator_member_id`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!meetupRes.ok) return { tokens: [], name: "" };
    const meetups = await meetupRes.json();
    const meetup = meetups?.[0];
    if (!meetup) return { tokens: [], name: "" };

    const tokens = [];
    if (meetup.organizer_id) {
      const orgRes = await fetch(`${SUPABASE_URL}/rest/v1/organizer_push_tokens?organizer_id=eq.${meetup.organizer_id}&is_active=eq.true&select=expo_push_token`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      if (orgRes.ok) {
        const orgTokens = await orgRes.json();
        tokens.push(...(orgTokens || []).map(t => t.expo_push_token));
      }
    }
    if (meetup.creator_member_id) {
      const memRes = await fetch(`${SUPABASE_URL}/rest/v1/system_member_push_tokens?member_id=eq.${meetup.creator_member_id}&select=expo_push_token`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      if (memRes.ok) {
        const memTokens = await memRes.json();
        tokens.push(...(memTokens || []).map(t => t.expo_push_token));
      }
    }
    return {
      tokens: Array.from(new Set(tokens.filter(Boolean))),
      name: meetup.name || ""
    };
  } catch (e) {
    console.error("fetchTokensForMeetup error:", e);
    return { tokens: [], name: "" };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    let pushTokens = normalizeTokens(body.pushTokens);
    let resolvedMeetupName = body.meetupName;

    if (!pushTokens.length && body.meetupId) {
      const fetched = await fetchTokensForMeetup(body.meetupId);
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
      { ok: false, message: error?.message || "取消通知發送失敗" },
      { status: 500 }
    );
  }
}
