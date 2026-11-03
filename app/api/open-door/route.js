export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabase, getSupabaseAdmin } from "@/lib/supabase";

const HENGFU_PUBLIC_API_KEY =
  "HENGFU5DA5A1D566F44032A83B1E886ED158B3C22AD820970449C6B1073B74";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

let cachedDoorSession = null;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function loadHengfuSessionFromDb() {
  try {
    const db = getSupabaseAdmin() || supabase;
    const { data: row } = await db
      .from("organizers")
      .select("id, password_hash")
      .eq("account", "__hengfu_door_session__")
      .maybeSingle();

    if (row?.password_hash) {
      const parsed = JSON.parse(row.password_hash);
      cachedDoorSession = { ...parsed, rowId: row.id };
      return cachedDoorSession;
    }
  } catch (e) {
    console.warn("Failed to load Hengfu door session from DB:", e);
  }
  return cachedDoorSession;
}

async function saveHengfuTokenToDb(sessionObj, newToken) {
  try {
    const db = getSupabaseAdmin() || supabase;
    const updatedPayload = {
      dealer_no: sessionObj?.dealer_no || "00001845",
      account: sessionObj?.account || "",
      password: sessionObj?.password || "",
      token: newToken,
      updated_at: new Date().toISOString(),
    };
    cachedDoorSession = { ...updatedPayload, rowId: sessionObj?.rowId };
    if (sessionObj?.rowId) {
      await db
        .from("organizers")
        .update({ password_hash: JSON.stringify(updatedPayload) })
        .eq("id", sessionObj.rowId);
    }
  } catch (e) {
    console.warn("Failed to save refreshed Hengfu token:", e);
  }
}

async function callHengfuOpenDoor(deviceId, token) {
  const ts = Math.floor(Date.now() / 1000);
  const res = await fetch("https://app.hengfu-i.com/app/v2/opendoor.php", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "text/plain;charset=UTF-8",
      Authorization: `Bearer ${token}${ts}`,
      Origin: "https://app.hengfu-i.com",
      Referer: "https://app.hengfu-i.com/?dealerId=00001845&openExternalBrowser=1",
    },
    body: JSON.stringify({ device_id: Number(deviceId) || 612 }),
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}

  return { ok: res.ok, status: res.status, json, rawText: text };
}

async function reloginHengfu(sessionObj) {
  const account = sessionObj?.account || process.env.HENGFU_ACCOUNT;
  const password = sessionObj?.password || process.env.HENGFU_PASSWORD;
  const dealerNo = sessionObj?.dealer_no || process.env.HENGFU_DEALER_NO || "00001845";
  if (!account || !password) return null;

  const ts = Math.floor(Date.now() / 1000);
  const res = await fetch("https://app.hengfu-i.com/app/v2/login.php", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "text/plain;charset=UTF-8",
      Authorization: `Bearer ${HENGFU_PUBLIC_API_KEY}${ts}`,
    },
    body: JSON.stringify({
      dealer_no: dealerNo,
      member_id: account,
      member_pw: password,
    }),
  });
  const data = await res.json().catch(() => null);
  const newToken = data?.result?.[0]?.token || null;
  if (newToken) {
    await saveHengfuTokenToDb(sessionObj, newToken);
  }
  return newToken;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const deviceId = Number(body.device_id || body.deviceId || 612);

    const sessionObj = await loadHengfuSessionFromDb();
    let token = body.token || sessionObj?.token || process.env.HENGFU_DOOR_TOKEN;

    if (!token) {
      token = await reloginHengfu(sessionObj);
    }

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "尚未設定門禁憑證或登入失敗" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let result = await callHengfuOpenDoor(deviceId, token);

    // 若 Token 過期 (code === 201)，自動重新登入換取最新 Token 並重試開門
    if (result.json?.code === 201) {
      const freshToken = await reloginHengfu(sessionObj);
      if (freshToken) {
        result = await callHengfuOpenDoor(deviceId, freshToken);
      }
    }

    const isSuccess =
      result.ok &&
      (!result.json || result.json.code === undefined || result.json.code === 0);

    return NextResponse.json(
      {
        ok: isSuccess,
        device_id: deviceId,
        data: result.json || result.rawText,
        error: isSuccess ? undefined : result.json?.message || "開門失敗",
      },
      { status: isSuccess ? 200 : 400, headers: CORS_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "開門請求失敗" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("device_id") || "612";
  // 導向可視化開門頁面，避免 LINE 預覽爬蟲誤觸開門
  return NextResponse.redirect(new URL(`/door/${encodeURIComponent(deviceId)}`, request.url), 307);
}
