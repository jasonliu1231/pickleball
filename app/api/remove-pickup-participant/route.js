export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";
import { fetchTokensForUser, sendExpoPush, normalizePhone } from "@/lib/line";
import { logUserNotification } from "@/lib/userNotifications";

async function notifyPromotedUser(meetupId, user, sessionDate) {
  if (!user) return;
  try {
    const domain = process.env.NEXT_PUBLIC_APP_URL || "https://pickleball.jason1231.com";
    await fetch(`${domain}/api/waitlist-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetup_id: meetupId,
        user_id: user.id,
        phone: user.phone || "",
        nickname: user.name || "球友",
        reservation_date: sessionDate
      })
    });
  } catch (notifErr) {
    console.warn("Promoted user notification failed:", notifErr);
  }
}

export async function POST(request) {
  try {
    const client = getSupabaseAdmin() || supabase;
    const body = await request.json();
    const {
      creator_user_id,
      participant_id,
      meetup_id,
      action = "remove", // "remove" | "promote" | "demote" | "update_count"
      people_count
    } = body;

    if (!creator_user_id || !participant_id || !meetup_id) {
      return Response.json({ ok: false, error: "缺少必要參數" }, { status: 400 });
    }

    // 1. 驗證是否為該活動發起人
    const { data: meetup, error: meetupErr } = await client
      .from("meetups")
      .select("id, creator_user_id, name, capacity, start_time, one_off_date, start_date")
      .eq("id", meetup_id)
      .eq("creator_user_id", creator_user_id)
      .single();

    if (meetupErr || !meetup) {
      return Response.json({ ok: false, error: "找不到此活動或您無權管理此活動名單。" }, { status: 403 });
    }

    // 2. 查詢該報名者資訊與對應 session
    const { data: participant, error: partErr } = await client
      .from("session_participants")
      .select("id, session_id, user_id, status, people_count, note, user:users(id, name, phone), session:sessions(id, meetup_id, session_date, capacity_override, confirmed_count, waitlist_count)")
      .eq("id", participant_id)
      .single();

    if (partErr || !participant) {
      return Response.json({ ok: false, error: "找不到此報名人員紀錄。" }, { status: 404 });
    }

    if (participant.session?.meetup_id !== meetup_id) {
      return Response.json({ ok: false, error: "報名紀錄與活動不符。" }, { status: 400 });
    }

    const sessionId = participant.session_id;
    const sessionDate = participant.session?.session_date || meetup.one_off_date || meetup.start_date || "";
    const capacity = Number(participant.session?.capacity_override ?? meetup.capacity ?? 0);
    const isCreatorSelf = String(participant.user_id) === String(creator_user_id);
    const userName = participant.user?.name || "球友";

    // Helper: 重新計算並同步 session 的正取與候補人數
    const syncSessionCounts = async () => {
      if (!sessionId) return { confirmedCount: 0, waitlistCount: 0 };
      const { data: allActive } = await client
        .from("session_participants")
        .select("status, people_count")
        .eq("session_id", sessionId)
        .in("status", ["confirmed", "waitlist"]);

      const confirmedCount = (allActive || [])
        .filter((p) => p.status === "confirmed")
        .reduce((sum, p) => sum + (Number(p.people_count) || 1), 0);

      const waitlistCount = (allActive || [])
        .filter((p) => p.status === "waitlist")
        .reduce((sum, p) => sum + (Number(p.people_count) || 1), 0);

      await client
        .from("sessions")
        .update({
          confirmed_count: confirmedCount,
          waitlist_count: waitlistCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      return { confirmedCount, waitlistCount };
    };

    // Helper: 智慧遞補候補球友（依剩餘空位與攜伴人數連續遞補）
    const autoPromoteWaitlist = async () => {
      if (!sessionId || capacity <= 0) return [];
      const { data: currentParts } = await client
        .from("session_participants")
        .select("id, user_id, status, people_count, created_at, user:users(id, name, phone)")
        .eq("session_id", sessionId)
        .in("status", ["confirmed", "waitlist"])
        .order("created_at", { ascending: true });

      const confirmedList = (currentParts || []).filter((p) => p.status === "confirmed");
      const waitlistList = (currentParts || []).filter((p) => p.status === "waitlist");

      const currentConfirmedPeople = confirmedList.reduce(
        (sum, p) => sum + (Number(p.people_count) || 1),
        0
      );
      let remainingSpots = capacity - currentConfirmedPeople;
      const promotedList = [];

      if (remainingSpots > 0 && waitlistList.length > 0) {
        for (const w of waitlistList) {
          const wCount = Number(w.people_count) || 1;
          if (wCount <= remainingSpots) {
            const { error: pErr } = await client
              .from("session_participants")
              .update({
                status: "confirmed",
                updated_at: new Date().toISOString()
              })
              .eq("id", w.id);

            if (!pErr) {
              remainingSpots -= wCount;
              if (w.user) {
                promotedList.push(w.user);
                await notifyPromotedUser(meetup_id, w.user, sessionDate);
              }
            }
          }
          if (remainingSpots <= 0) break;
        }
      }
      return promotedList;
    };

    // =========================================================================
    // Action 1: 調整人數 (update_count) - 支援發起人調整本人攜伴人數或其他球友攜伴人數
    // =========================================================================
    if (action === "update_count") {
      const newCount = Number(people_count);
      if (!newCount || isNaN(newCount) || newCount < 1) {
        return Response.json({ ok: false, error: "人數至少需為 1 人" }, { status: 400 });
      }

      const oldCount = Number(participant.people_count) || 1;
      if (newCount === oldCount) {
        return Response.json({ ok: true, message: "人數未變更" });
      }

      // 若是正取且調高人數，檢查是否超過活動人數上限
      if (participant.status === "confirmed" && newCount > oldCount && capacity > 0) {
        const { data: confirmedParts } = await client
          .from("session_participants")
          .select("id, people_count")
          .eq("session_id", sessionId)
          .eq("status", "confirmed");

        const otherConfirmed = (confirmedParts || [])
          .filter((p) => String(p.id) !== String(participant_id))
          .reduce((sum, p) => sum + (Number(p.people_count) || 1), 0);

        if (otherConfirmed + newCount > capacity) {
          return Response.json(
            {
              ok: false,
              error: `超過活動人數上限 (${capacity} 人)！若需增加名額，請先至「編輯」調高總人數上限。`
            },
            { status: 400 }
          );
        }
      }

      const { error: uErr } = await client
        .from("session_participants")
        .update({
          people_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", participant_id);

      if (uErr) throw uErr;

      // 若減少了正取人數，釋出的空位自動遞補候補
      let promotedUsers = [];
      if (participant.status === "confirmed" && newCount < oldCount) {
        promotedUsers = await autoPromoteWaitlist();
      }

      await syncSessionCounts();

      return Response.json({
        ok: true,
        message: `已將「${userName}」人數調整為 ${newCount} 人`,
        promoted: promotedUsers.length > 0 ? { name: promotedUsers.map((u) => u.name).join("、") } : null
      });
    }

    // =========================================================================
    // Action 2: 手動轉正取 (promote) - 將候補球友拉上正取
    // =========================================================================
    if (action === "promote") {
      if (participant.status === "confirmed") {
        return Response.json({ ok: true, message: `「${userName}」已經是正取狀態` });
      }

      const pCount = Number(participant.people_count) || 1;
      if (capacity > 0) {
        const { data: confirmedParts } = await client
          .from("session_participants")
          .select("id, people_count")
          .eq("session_id", sessionId)
          .eq("status", "confirmed");

        const currentConfirmed = (confirmedParts || []).reduce(
          (sum, p) => sum + (Number(p.people_count) || 1),
          0
        );

        if (currentConfirmed + pCount > capacity) {
          return Response.json(
            {
              ok: false,
              error: `目前正取已滿 (${currentConfirmed}/${capacity} 人)！若要將「${userName}」(${pCount}人) 轉為正取，請先將其他正取改為備取，或至「編輯」調高活動人數上限。`
            },
            { status: 400 }
          );
        }
      }

      const { error: pErr } = await client
        .from("session_participants")
        .update({
          status: "confirmed",
          updated_at: new Date().toISOString()
        })
        .eq("id", participant_id);

      if (pErr) throw pErr;

      await syncSessionCounts();
      if (participant.user) {
        await notifyPromotedUser(meetup_id, participant.user, sessionDate);
      }

      return Response.json({
        ok: true,
        message: `已將「${userName}」轉為正取，並發送通知！`
      });
    }

    // =========================================================================
    // Action 3: 手動改為備取 (demote) - 將正取球友移至候補
    // =========================================================================
    if (action === "demote") {
      if (isCreatorSelf) {
        return Response.json({ ok: false, error: "發起人本人無法改為備取。" }, { status: 400 });
      }
      if (participant.status === "waitlist") {
        return Response.json({ ok: true, message: `「${userName}」已經在候補名單中` });
      }

      const { error: dErr } = await client
        .from("session_participants")
        .update({
          status: "waitlist",
          updated_at: new Date().toISOString()
        })
        .eq("id", participant_id);

      if (dErr) throw dErr;

      await syncSessionCounts();

      // 通知該球友已被調整為備取
      if (participant.user_id) {
        const title = "⏳ 報名狀態調整通知";
        const bodyText = `您報名的自揪活動「${meetup.name}」(${sessionDate})，主辦人已將您的名額調整為「候補」，請留意最新名單狀態。`;
        await logUserNotification(client, {
          userId: participant.user_id,
          category: "booking",
          title,
          body: bodyText,
          data: { type: "status_changed_waitlist", meetup_id, session_date: sessionDate }
        });
        const tokens = await fetchTokensForUser(client, {
          userId: participant.user_id,
          phone: normalizePhone(participant.user?.phone)
        });
        if (tokens.length > 0) {
          await sendExpoPush(
            tokens.map((tk) => ({
              to: tk,
              title,
              body: bodyText,
              sound: "default",
              channelId: "pickleball-alerts",
              data: { type: "status_changed_waitlist", meetup_id, session_date: sessionDate }
            }))
          );
        }
      }

      return Response.json({
        ok: true,
        message: `已將「${userName}」改為備取（若需遞補其他人，可點擊候補球友旁的「轉正取」）`
      });
    }

    // =========================================================================
    // Action 4: 移除參加者 (remove)
    // =========================================================================
    if (isCreatorSelf) {
      return Response.json(
        { ok: false, error: "發起人無法自名單中移除。若要結束活動請點選「取消活動」。" },
        { status: 400 }
      );
    }

    const prevStatus = participant.status;

    const { error: updateErr } = await client
      .from("session_participants")
      .update({
        status: "cancelled",
        note: (participant.note ? participant.note + "；" : "") + "由活動發起人移除",
        updated_at: new Date().toISOString()
      })
      .eq("id", participant_id);

    if (updateErr) throw updateErr;

    let promotedUsers = [];
    if (prevStatus === "confirmed" && sessionId) {
      promotedUsers = await autoPromoteWaitlist();
    }

    await syncSessionCounts();

    return Response.json({
      ok: true,
      message: `已成功移除「${userName}」`,
      promoted: promotedUsers.length > 0 ? { name: promotedUsers.map((u) => u.name).join("、") } : null
    });
  } catch (error) {
    console.error("remove-pickup-participant error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
