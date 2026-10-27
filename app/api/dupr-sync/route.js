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

    let finalRating = null;
    let playerName = null;

    // 2. 若有帶入 DUPR ID 且要求自動查詢 (或未填手動分數)
    if (cleanDuprId && (action === "lookup" || manual_rating === undefined || manual_rating === "")) {
      const lookup = await fetchDuprProfileById(cleanDuprId);
      if (lookup.ok && lookup.player) {
        playerName = lookup.player.fullName || [lookup.player.firstName, lookup.player.lastName].filter(Boolean).join(" ");
        const rawDoubles =
          lookup.player.ratings?.doubles ??
          lookup.player.doubles ??
          lookup.player.ratings?.default;
        const numDoubles = parseFloat(rawDoubles);
        if (!isNaN(numDoubles) && numDoubles >= 1.0 && numDoubles <= 8.5) {
          finalRating = Number(numDoubles.toFixed(2));
        } else {
          return Response.json(
            {
              ok: false,
              error: `查詢到 DUPR 球員「${playerName || cleanDuprId}」，但目前雙打分數為 NR (尚無計分紀錄)，請直接手動輸入您的雙打分數。`
            },
            { status: 400 }
          );
        }
      } else if (action === "lookup") {
        if (lookup.reason === "no_token") {
          return Response.json(
            {
              ok: false,
              error: "可直接於下方輸入您的 DUPR 雙打分數（如 3.25）並點選儲存綁定！"
            },
            { status: 400 }
          );
        }
        return Response.json(
          {
            ok: false,
            error: `查無 DUPR ID「${cleanDuprId}」，請確認 ID 是否正確，或直接填寫雙打分數儲存。`
          },
          { status: 404 }
        );
      }
    }

    // 3. 若有手動填寫的雙打分數
    if (finalRating === null && manual_rating !== undefined && manual_rating !== null && String(manual_rating).trim() !== "") {
      const parsed = parseFloat(String(manual_rating).trim());
      if (isNaN(parsed) || parsed < 1.0 || parsed > 8.5) {
        return Response.json(
          { ok: false, error: "請輸入有效的 DUPR 雙打分數（介於 1.00 ~ 8.00 之間的小數，例如 3.25）" },
          { status: 400 }
        );
      }
      finalRating = Number(parsed.toFixed(2));
    }

    if (finalRating === null) {
      return Response.json(
        { ok: false, error: "請輸入 DUPR 雙打分數（例如 3.25）" },
        { status: 400 }
      );
    }

    // 4. 寫入 users 資料表（不連動修改 skill_level 程度自評）
    const updatePayload = {
      rating: finalRating,
      dupr_id: cleanDuprId || null,
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

    return Response.json({
      ok: true,
      dupr_id: cleanDuprId || null,
      rating: finalRating,
      player_name: playerName,
      message: playerName
        ? `已成功同步 DUPR (${playerName}) 雙打分數：${finalRating.toFixed(2)}！`
        : `已成功綁定 DUPR 雙打分數：${finalRating.toFixed(2)}！`
    });
  } catch (error) {
    console.error("dupr-sync error:", error);
    return Response.json({ ok: false, error: error.message || "綁定失敗" }, { status: 500 });
  }
}
