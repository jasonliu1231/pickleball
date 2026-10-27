export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request) {
  try {
    const client = getSupabaseAdmin() || supabase;
    const body = await request.json();
    const {
      creator_user_id,
      meetup_id,
      name,
      city,
      address,
      street_address,
      start_time,
      end_time,
      capacity,
      fee,
      notes,
      join_password,
      line_id,
      group_url,
      door_url
    } = body;

    if (!creator_user_id || !meetup_id) {
      return Response.json({ ok: false, error: "缺少必要參數" }, { status: 400 });
    }

    // 驗證是否為該活動發起人
    const { data: meetup, error: fetchErr } = await client
      .from("meetups")
      .select("id, creator_user_id, name, capacity, one_off_date, start_date")
      .eq("id", meetup_id)
      .eq("creator_user_id", creator_user_id)
      .single();

    if (fetchErr || !meetup) {
      return Response.json({ ok: false, error: "找不到此活動或您無權修改。" }, { status: 403 });
    }

    const newCapacity = Number(capacity) || 4;

    // 檢查人數上限不能小於目前已確認的人數（直接查詢 session_participants 最準確）
    const { data: session } = await client
      .from("sessions")
      .select("id, session_date, confirmed_count")
      .eq("meetup_id", meetup_id)
      .maybeSingle();

    let currentParts = [];
    if (session?.id) {
      const { data: parts } = await client
        .from("session_participants")
        .select("id, user_id, status, people_count, created_at, user:users(id, name, phone)")
        .eq("session_id", session.id)
        .in("status", ["confirmed", "waitlist"])
        .order("created_at", { ascending: true });
      currentParts = parts || [];
    }

    const confirmedList = currentParts.filter((p) => p.status === "confirmed");
    const waitlistList = currentParts.filter((p) => p.status === "waitlist");
    const realConfirmedCount = confirmedList.reduce(
      (sum, p) => sum + (Number(p.people_count) || 1),
      0
    );

    if (realConfirmedCount > newCapacity) {
      return Response.json(
        {
          ok: false,
          error: `人數上限不能低於目前正取人數 (${realConfirmedCount} 人)`
        },
        { status: 400 }
      );
    }

    // 處理費用：
    // - 輸入「免費」、「0」-> 0
    // - 輸入「場租平分」或包含平分/均分字眼/留空 -> null（代表場租平分）
    // - 輸入具體金額數字 -> 該數字金額
    let parsedFee = null;
    if (fee !== null && fee !== undefined) {
      const feeStr = String(fee).trim();
      if (feeStr === "免費" || feeStr === "免收" || feeStr === "0" || feeStr === "$0") {
        parsedFee = 0;
      } else if (feeStr.includes("平分") || feeStr.includes("均分") || feeStr.includes("分攤")) {
        parsedFee = null;
      } else {
        const match = feeStr.match(/\d+(\.\d+)?/);
        if (match) {
          const num = Number(match[0]);
          if (!isNaN(num)) {
            parsedFee = num === 0 ? 0 : num;
          }
        }
      }
    }

    // 更新 meetup
    const updatePayload = {
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      street_address: (street_address || "").trim() || null,
      start_time: start_time,
      end_time: end_time,
      capacity: newCapacity,
      guest_fee: parsedFee,
      member_fee: parsedFee,
      notes: (notes || "").trim() || null,
      join_password: (join_password || "").trim() || null,
      line_id: (line_id || "").trim() || null,
      group_url: (group_url || "").trim() || null,
      door_url: (door_url || "").trim() || null
    };

    let { error: updateErr } = await client
      .from("meetups")
      .update(updatePayload)
      .eq("id", meetup_id);

    // 若資料庫尚未遷移新欄位，自動排除後重試
    if (
      updateErr &&
      (updateErr.message?.includes("line_id") ||
        updateErr.message?.includes("group_url") ||
        updateErr.message?.includes("door_url"))
    ) {
      if (updateErr.message?.includes("line_id")) delete updatePayload.line_id;
      if (updateErr.message?.includes("group_url")) delete updatePayload.group_url;
      if (updateErr.message?.includes("door_url")) delete updatePayload.door_url;
      const retry = await client.from("meetups").update(updatePayload).eq("id", meetup_id);
      updateErr = retry.error;
    }

    if (updateErr) {
      return Response.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    // 若調高人數上限後有空位，且有候補球友，自動依序遞補為正取並發送通知
    const promotedUsers = [];
    if (session?.id) {
      let remainingSpots = newCapacity - realConfirmedCount;
      const sessionDate = session.session_date || meetup.one_off_date || meetup.start_date || "";

      if (remainingSpots > 0 && waitlistList.length > 0) {
        const domain = process.env.NEXT_PUBLIC_APP_URL || "https://pickleball.jason1231.com";
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
                promotedUsers.push(w.user);
                try {
                  await fetch(`${domain}/api/waitlist-notification`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      meetup_id: meetup_id,
                      user_id: w.user.id,
                      phone: w.user.phone || "",
                      nickname: w.user.name || "球友",
                      reservation_date: sessionDate
                    })
                  });
                } catch (e) {
                  console.warn("Promote waitlist notification error:", e);
                }
              }
            }
          }
          if (remainingSpots <= 0) break;
        }
      }

      // 同步更新 session 的 confirmed_count 與 waitlist_count
      const { data: latestParts } = await client
        .from("session_participants")
        .select("status, people_count")
        .eq("session_id", session.id)
        .in("status", ["confirmed", "waitlist"]);

      const finalConfirmed = (latestParts || [])
        .filter((p) => p.status === "confirmed")
        .reduce((sum, p) => sum + (Number(p.people_count) || 1), 0);
      const finalWaitlist = (latestParts || [])
        .filter((p) => p.status === "waitlist")
        .reduce((sum, p) => sum + (Number(p.people_count) || 1), 0);

      await client
        .from("sessions")
        .update({
          confirmed_count: finalConfirmed,
          waitlist_count: finalWaitlist,
          updated_at: new Date().toISOString()
        })
        .eq("id", session.id);
    }

    return Response.json({
      ok: true,
      message:
        promotedUsers.length > 0
          ? `活動資料已更新！已自動將候補球友「${promotedUsers.map((u) => u.name).join("、")}」遞補為正取。`
          : "活動資料已更新",
      promoted: promotedUsers.map((u) => ({ id: u.id, name: u.name }))
    });
  } catch (error) {
    console.error("update-member-pickup error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
