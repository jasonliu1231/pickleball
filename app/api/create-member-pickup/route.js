export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      creator_user_id,
      name,
      city,
      address,
      street_address,
      date,
      start_time,
      end_time,
      capacity,
      fee,
      notes,
      join_password
    } = body;

    if (!creator_user_id) {
      return Response.json({ ok: false, error: "未登入會員身分，請先登入後再發起自揪。" }, { status: 401 });
    }
    if (!name || !date || !city || !start_time || !end_time || !address || !capacity) {
      return Response.json({ ok: false, error: "請填寫所有必填欄位。" }, { status: 400 });
    }

    // 1. 驗證會員存在
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, name, phone")
      .eq("id", creator_user_id)
      .single();

    if (userErr || !user) {
      return Response.json({ ok: false, error: "找不到會員身分，請重新登入。" }, { status: 404 });
    }

    const weekday = new Date(date + "T00:00:00").getDay();

    // 2. 建立自揪活動 (meetups)
    const { data: newMeetup, error: meetupErr } = await supabase
      .from("meetups")
      .insert({
        creator_user_id: user.id,
        organizer_id: null,
        name: name.trim(),
        city: (city || "台中市").trim(),
        address: address.trim(),
        street_address: (street_address || "").trim() || null,
        start_time: start_time,
        end_time: end_time,
        capacity: Number(capacity) || 4,
        guest_fee: (fee || "場租平分").trim(),
        member_fee: (fee || "場租平分").trim(),
        notes: (notes || "").trim() || null,
        is_active: true,
        is_one_off: true,
        one_off_date: date,
        join_password: (join_password || "").trim() || null,
        weekdays: [weekday],
        sort_order: 50
      })
      .select()
      .single();

    if (meetupErr) {
      console.error("Failed to insert meetup:", meetupErr);
      return Response.json({ ok: false, error: meetupErr.message || "建立活動失敗" }, { status: 500 });
    }

    // 3. 建立對應場次 (sessions)
    const { data: newSession, error: sessionErr } = await supabase
      .from("sessions")
      .insert({
        meetup_id: newMeetup.id,
        session_date: date,
        status: "open",
        confirmed_count: 1, // 發起人自動為正取第 1 位
        waitlist_count: 0
      })
      .select()
      .single();

    if (sessionErr) {
      console.error("Failed to insert session:", sessionErr);
      await supabase.from("meetups").delete().eq("id", newMeetup.id);
      return Response.json({ ok: false, error: sessionErr.message || "建立場次失敗" }, { status: 500 });
    }

    // 4. 自動將發起人加入正取第 1 名 (session_participants)
    const { error: partErr } = await supabase
      .from("session_participants")
      .insert({
        session_id: newSession.id,
        user_id: user.id,
        people_count: 1,
        status: "confirmed",
        payment_method: "cash",
        note: "活動發起人"
      });

    if (partErr) {
      console.warn("Failed to insert session participant for creator:", partErr);
    }

    return Response.json({
      ok: true,
      meetup_id: newMeetup.id,
      session_id: newSession.id,
      date: date
    });
  } catch (error) {
    console.error("create-member-pickup error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
