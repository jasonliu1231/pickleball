export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { creator_user_id, meetup_id } = body;

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
      return Response.json({ ok: false, error: "找不到此活動或您無權取消。" }, { status: 403 });
    }

    // 停用 meetup
    await supabase
      .from("meetups")
      .update({ is_active: false })
      .eq("id", meetup_id);

    // 標記 session 為 cancelled
    await supabase
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("meetup_id", meetup_id);

    return Response.json({ ok: true, message: "活動已成功取消" });
  } catch (error) {
    console.error("cancel-member-pickup error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
