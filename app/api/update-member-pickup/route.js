export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
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
      join_password
    } = body;

    if (!creator_user_id || !meetup_id) {
      return Response.json({ ok: false, error: "缺少必要參數" }, { status: 400 });
    }

    // 驗證是否為該活動發起人
    const { data: meetup, error: fetchErr } = await supabase
      .from("meetups")
      .select("id, creator_user_id, name")
      .eq("id", meetup_id)
      .eq("creator_user_id", creator_user_id)
      .single();

    if (fetchErr || !meetup) {
      return Response.json({ ok: false, error: "找不到此活動或您無權修改。" }, { status: 403 });
    }

    // 檢查人數上限不能小於目前已確認的人數
    const { data: session } = await supabase
      .from("sessions")
      .select("id, confirmed_count")
      .eq("meetup_id", meetup_id)
      .maybeSingle();

    if (session && session.confirmed_count > Number(capacity)) {
      return Response.json({
        ok: false,
        error: `人數上限不能低於目前正取人數 (${session.confirmed_count} 人)`
      }, { status: 400 });
    }

    // 更新 meetup
    const { error: updateErr } = await supabase
      .from("meetups")
      .update({
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        street_address: (street_address || "").trim() || null,
        start_time: start_time,
        end_time: end_time,
        capacity: Number(capacity) || 4,
        guest_fee: (fee || "場租平分").trim(),
        member_fee: (fee || "場租平分").trim(),
        notes: (notes || "").trim() || null,
        join_password: (join_password || "").trim() || null
      })
      .eq("id", meetup_id);

    if (updateErr) {
      return Response.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return Response.json({ ok: true, message: "活動資料已更新" });
  } catch (error) {
    console.error("update-member-pickup error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
