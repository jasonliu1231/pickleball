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

// 記憶體中防重 (10 分鐘內相同開團、日期與球友不重複送推播)
const recentSignupRequests = new Map();
const DEBOUNCE_WINDOW_MS = 10 * 60 * 1000;

function cleanupOldRequests() {
  const now = Date.now();
  for (const [key, timestamp] of recentSignupRequests.entries()) {
    if (now - timestamp > DEBOUNCE_WINDOW_MS) {
      recentSignupRequests.delete(key);
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const meetupId = body.meetupId || "";
    const reservationDate = body.reservationDate || "";
    const nickname = String(body.nickname || "球友").trim();

    // 伺服器端二次攔截：防止球友未關掉舊版網頁分頁 / 舊版 App 快取而重複點擊報名，導致洗版推播或把自己的正取覆蓋成備取
    if (meetupId && reservationDate && nickname && nickname !== "球友") {
      try {
        const { data: sessionRow } = await supabase
          .from("sessions")
          .select("id, capacity_override, session_notes, meetup:meetups(capacity)")
          .eq("meetup_id", meetupId)
          .eq("session_date", reservationDate)
          .maybeSingle();

        if (sessionRow?.id) {
          const [{ data: parts }, { data: subs }] = await Promise.all([
            supabase
              .from("session_participants")
              .select("id, user_id, status, people_count, created_at, user:users(id, name, display_name)")
              .eq("session_id", sessionRow.id),
            supabase
              .from("member_meetup_subscriptions")
              .select("organizer_member_id, organizer_member:organizer_members(user_id, status)")
              .eq("meetup_id", meetupId),
          ]);

          const allParts = parts || [];
          const matchedPart = allParts.find((p) => {
            const uName = String(p.user?.name || "").trim();
            const uDisp = String(p.user?.display_name || "").trim();
            return uName === nickname || uDisp === nickname;
          });

          if (matchedPart) {
            // 若舊版快取只更新了 name 沒更新 display_name，自動同步 display_name
            if (
              matchedPart.user?.id &&
              String(matchedPart.user.name || "").trim() === nickname &&
              String(matchedPart.user.display_name || "").trim() !== nickname
            ) {
              await supabase
                .from("users")
                .update({ display_name: nickname })
                .eq("id", matchedPart.user.id);
            }

            const createdMs = matchedPart.created_at ? new Date(matchedPart.created_at).getTime() : 0;
            const ageMs = createdMs ? Date.now() - createdMs : 0;

            // 若該筆報名紀錄建立時間已超過 60 秒（代表是舊版網頁/App 重複送出已存在之報名）
            if (ageMs > 60 * 1000) {
              // 若舊版網頁因為看到滿團而把原本早報名的正取誤覆蓋成 waitlist，自動依排隊順序校正回 confirmed
              if (matchedPart.status === "waitlist") {
                const rawCapacity = Number(sessionRow.capacity_override ?? sessionRow.meetup?.capacity ?? 0);
                const reservedMatch = String(sessionRow.session_notes || "").match(/\[RESERVED:(\d+)\]/);
                const reservedCount = reservedMatch ? Math.max(0, parseInt(reservedMatch[1], 10) || 0) : 0;
                const capacity = rawCapacity > 0 ? Math.max(0, rawCapacity - reservedCount) : 0;
                const absentIds = new Set(allParts.filter((p) => p.status === "absent").map((p) => String(p.user_id)));
                const activeSubIds = new Set(
                  (subs || [])
                    .filter((s) => s.organizer_member?.status === "active" && !absentIds.has(String(s.organizer_member?.user_id)))
                    .map((s) => String(s.organizer_member?.user_id))
                    .filter(Boolean)
                );
                const activeParticipants = allParts
                  .filter((p) => ["confirmed", "attended", "waitlist"].includes(p.status) && !activeSubIds.has(String(p.user_id)))
                  .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));

                let slotsUsed = activeSubIds.size;
                for (const row of activeParticipants) {
                  const cnt = Number(row.people_count || 1);
                  if (String(row.id) === String(matchedPart.id)) {
                    if (capacity > 0 && slotsUsed + cnt <= capacity) {
                      await supabase
                        .from("session_participants")
                        .update({ status: "confirmed", updated_at: new Date().toISOString() })
                        .eq("id", matchedPart.id);
                    }
                    break;
                  }
                  if (row.status === "confirmed" || row.status === "attended") {
                    slotsUsed += cnt;
                  }
                }
              }

              return Response.json({
                ok: true,
                debounced: true,
                message: "該球友早先已報名過此場次（舊版頁面重複送出），已攔截重複推播",
              });
            }
          }
        }
      } catch (checkErr) {
        console.warn("send-signup-notification duplicate check warning:", checkErr);
      }
    }

    // 檢查防重快取
    const dedupKey = `${meetupId}_${reservationDate}_${nickname}`;
    const now = Date.now();
    if (dedupKey !== "__球友" && recentSignupRequests.has(dedupKey)) {
      const prevTime = recentSignupRequests.get(dedupKey);
      if (now - prevTime < DEBOUNCE_WINDOW_MS) {
        return Response.json({
          ok: true,
          debounced: true,
          message: "報名通知短時間內已發送過，略過重複推播",
        });
      }
    }
    if (dedupKey !== "__球友") {
      recentSignupRequests.set(dedupKey, now);
      cleanupOldRequests();
    }

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
