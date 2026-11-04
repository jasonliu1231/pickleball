export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabase, getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const meetupId = searchParams.get("meetup_id");
    const dateStr = searchParams.get("date");

    if (!meetupId || !dateStr) {
      return NextResponse.json({ ok: false, error: "缺少 meetup_id 或 date 參數" }, { status: 400 });
    }

    const db = getSupabaseAdmin() || supabase;

    const [meetupRes, sessionRes] = await Promise.all([
      db.from("meetups").select("id, name, start_time, end_time").eq("id", meetupId).maybeSingle(),
      db
        .from("sessions")
        .select("id, meetup_id, session_date, match_schedule")
        .eq("meetup_id", meetupId)
        .eq("session_date", dateStr)
        .maybeSingle(),
    ]);

    if (meetupRes.error) throw meetupRes.error;
    if (sessionRes.error) throw sessionRes.error;

    return NextResponse.json({
      ok: true,
      meetup: meetupRes.data || null,
      session: sessionRes.data || null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "讀取賽程失敗" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { meetup_id, date, courtNumber, roundNumber, completed } = body || {};

    if (!meetup_id || !date || !courtNumber || !roundNumber) {
      return NextResponse.json({ ok: false, error: "缺少必要參數" }, { status: 400 });
    }

    const db = getSupabaseAdmin() || supabase;

    const { data: session, error: sErr } = await db
      .from("sessions")
      .select("id, match_schedule")
      .eq("meetup_id", meetup_id)
      .eq("session_date", date)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!session || !session.match_schedule?.courts) {
      return NextResponse.json({ ok: false, error: "找不到賽程資料" }, { status: 404 });
    }

    const updatedSchedule = {
      ...session.match_schedule,
      courts: session.match_schedule.courts.map((c) => {
        if (Number(c.courtNumber) !== Number(courtNumber)) return c;
        return {
          ...c,
          rounds: (c.rounds || []).map((r) => {
            if (Number(r.roundNumber) !== Number(roundNumber)) return r;
            return {
              ...r,
              completed: Boolean(completed),
            };
          }),
        };
      }),
    };

    const { error: uErr } = await db
      .from("sessions")
      .update({
        match_schedule: updatedSchedule,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (uErr) throw uErr;

    return NextResponse.json({ ok: true, match_schedule: updatedSchedule });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "更新賽程狀態失敗" },
      { status: 500 }
    );
  }
}
