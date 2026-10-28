export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";

let cachedDuprToken = null;
let cachedDuprTokenExpiry = 0;

async function getDuprBearerToken() {
  const now = Date.now();
  if (cachedDuprToken && now < cachedDuprTokenExpiry) {
    return cachedDuprToken;
  }

  if (process.env.DUPR_ACCESS_TOKEN) {
    return process.env.DUPR_ACCESS_TOKEN;
  }

  const clientKey = process.env.DUPR_CLIENT_KEY;
  const clientSecret = process.env.DUPR_CLIENT_SECRET;
  const baseUrl = process.env.DUPR_API_BASE_URL || "https://api.dupr.gg";

  // 1. Partner Key + Secret Auth
  if (clientKey && clientSecret) {
    const encoded = Buffer.from(`${clientKey}:${clientSecret}`).toString("base64");
    const res = await fetch(`${baseUrl}/auth/v1.0/token`, {
      method: "POST",
      headers: {
        "x-authorization": encoded,
        "Content-Type": "application/json"
      }
    });
    const data = await res.json();
    const token = data?.result?.token || data?.result || data?.token;
    if (res.ok && token && typeof token === "string") {
      cachedDuprToken = token;
      cachedDuprTokenExpiry = now + 50 * 60 * 1000;
      return token;
    }
  }

  // 2. User Account Email + Password Auth
  const email = process.env.DUPR_AUTH_EMAIL;
  const password = process.env.DUPR_AUTH_PASSWORD;
  if (email && password) {
    const res = await fetch(`${baseUrl}/auth/v1.0/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    const token = data?.result?.accessToken || data?.result?.token || data?.accessToken;
    if (res.ok && token && typeof token === "string") {
      cachedDuprToken = token;
      cachedDuprTokenExpiry = now + 50 * 60 * 1000;
      return token;
    }
  }

  return null;
}

async function fetchDuprProfileById(duprId) {
  const token = await getDuprBearerToken();
  if (!token) {
    return { ok: false, reason: "no_token" };
  }

  const baseUrl = process.env.DUPR_API_BASE_URL || "https://api.dupr.gg";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  // Try /player/search/byDuprId first
  try {
    const res = await fetch(`${baseUrl}/player/search/byDuprId`, {
      method: "POST",
      headers,
      body: JSON.stringify({ duprId })
    });
    if (res.ok) {
      const json = await res.json();
      const player = Array.isArray(json?.result)
        ? json.result[0]
        : json?.result || json?.data;
      if (player && (player.duprId || player.ratings)) {
        return { ok: true, player };
      }
    }
  } catch (e) {
    console.warn("DUPR byDuprId lookup failed:", e);
  }

  // Fallback: /player/v1.0/search
  try {
    const res = await fetch(`${baseUrl}/player/v1.0/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        limit: 5,
        offset: 0,
        query: duprId,
        filter: {}
      })
    });
    if (res.ok) {
      const json = await res.json();
      const hits = json?.result?.hits || json?.result || [];
      const exact = (Array.isArray(hits) ? hits : []).find(
        (h) => String(h.duprId || "").toUpperCase() === duprId.toUpperCase()
      );
      if (exact) {
        return { ok: true, player: exact };
      }
    }
  } catch (e) {
    console.warn("DUPR v1.0/search fallback failed:", e);
  }

  return { ok: false, reason: "not_found" };
}

export async function POST(request) {
  try {
    const client = getSupabaseAdmin() || supabase;
    const body = await request.json();
    const { user_id, dupr_id, manual_rating, action } = body;

    if (!user_id) {
      return Response.json({ ok: false, error: "請先登入會員帳號" }, { status: 401 });
    }

    // 1. 解除綁定 / 清除 DUPR 分數
    if (action === "unbind") {
      const clearPayload = { rating: null, dupr_id: null, updated_at: new Date().toISOString() };
      let { error } = await client.from("users").update(clearPayload).eq("id", user_id);
      if (error && error.message?.includes("dupr_id")) {
        delete clearPayload.dupr_id;
        const retry = await client.from("users").update(clearPayload).eq("id", user_id);
        error = retry.error;
      }
      if (error) throw error;
      return Response.json({ ok: true, rating: null, dupr_id: null, message: "已解除 DUPR 分數綁定" });
    }

    const cleanDuprId = String(dupr_id || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    if (!cleanDuprId) {
      return Response.json(
        { ok: false, error: "請輸入您的 6 碼 DUPR ID（例如 WMLGQQ）" },
        { status: 400 }
      );
    }

    let finalRating = null;
    let playerName = null;
    let isNr = false;

    // 2. 透過 DUPR ID 自動向官方查詢雙打分數
    const lookup = await fetchDuprProfileById(cleanDuprId);
    if (lookup.ok && lookup.player) {
      playerName =
        lookup.player.fullName ||
        [lookup.player.firstName, lookup.player.lastName].filter(Boolean).join(" ") ||
        null;
      const rawDoubles =
        lookup.player.ratings?.doubles ??
        lookup.player.doubles ??
        lookup.player.ratings?.default;
      const numDoubles = parseFloat(rawDoubles);
      if (!isNaN(numDoubles) && numDoubles >= 1.0 && numDoubles <= 8.5) {
        finalRating = Number(numDoubles.toFixed(2));
      } else {
        // 雙打分數為 NR (尚無計分紀錄)：記錄 DUPR ID，並將 rating 設為 null（名單顯示自評程度）
        finalRating = null;
        isNr = true;
      }
    } else if (lookup.reason === "not_found") {
      return Response.json(
        {
          ok: false,
          error: `查無 DUPR ID「${cleanDuprId}」，請確認您的 6 碼 ID 是否正確。`
        },
        { status: 404 }
      );
    } else {
      // 若後端尚未設定 DUPR 查詢憑證 (no_token)，仍先記錄玩家的 DUPR ID，rating 維持 null (顯示自評程度)
      finalRating = null;
      isNr = true;
    }

    // 3. 寫入 users 資料表（不連動修改 skill_level 程度自評）
    const updatePayload = {
      rating: finalRating,
      dupr_id: cleanDuprId,
      updated_at: new Date().toISOString()
    };

    let { error: updateErr } = await client
      .from("users")
      .update(updatePayload)
      .eq("id", user_id);

    if (updateErr && updateErr.message?.includes("dupr_id")) {
      delete updatePayload.dupr_id;
      const retry = await client.from("users").update(updatePayload).eq("id", user_id);
      updateErr = retry.error;
    }

    if (updateErr) {
      if (updateErr.message?.includes("integer")) {
        return Response.json(
          {
            ok: false,
            error: "資料庫 users.rating 欄位目前仍為整數型別，請先在 Supabase SQL Editor 執行 ALTER TABLE 將 rating 改為 NUMERIC(4,2)。"
          },
          { status: 500 }
        );
      }
      throw updateErr;
    }

    let message = "";
    if (finalRating !== null) {
      message = playerName
        ? `已綁定 DUPR (${playerName}・${cleanDuprId})，雙打分數：${finalRating.toFixed(2)}！`
        : `已綁定 DUPR ID (${cleanDuprId})，雙打分數：${finalRating.toFixed(2)}！`;
    } else {
      message = playerName
        ? `已綁定 DUPR (${playerName}・${cleanDuprId})！目前尚無積分 (NR)，名單將顯示您的自評程度。`
        : `已綁定 DUPR ID (${cleanDuprId})！目前尚無積分 (NR)，名單將顯示您的自評程度。`;
    }

    return Response.json({
      ok: true,
      dupr_id: cleanDuprId,
      rating: finalRating,
      is_nr: isNr,
      player_name: playerName,
      message
    });
  } catch (error) {
    console.error("dupr-sync error:", error);
    return Response.json({ ok: false, error: error.message || "綁定失敗" }, { status: 500 });
  }
}
