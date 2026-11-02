export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";

let cachedDuprSession = null;
let cachedDuprSessionExpiry = 0;

async function getDuprAuthMaterial(client, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedDuprSession && now < cachedDuprSessionExpiry) {
    return cachedDuprSession;
  }

  // 1. Read persisted DUPR Cookie session (__Host-dupr_at & __Host-dupr_rt) from Supabase
  try {
    const db = client || getSupabaseAdmin() || supabase;
    const { data: sysRow } = await db
      .from("organizers")
      .select("id, password_hash")
      .eq("account", "__dupr_system_session__")
      .maybeSingle();

    if (sysRow?.password_hash) {
      const parsed = JSON.parse(sysRow.password_hash);
      if (parsed?.at) {
        if (forceRefresh && parsed?.rt) {
          const refreshed = await refreshDuprCookieSession(db, sysRow.id, parsed.at, parsed.rt);
          if (refreshed) return refreshed;
        }
        const sessionObj = {
          type: "cookie",
          at: parsed.at,
          rt: parsed.rt || "",
          rowId: sysRow.id
        };
        cachedDuprSession = sessionObj;
        cachedDuprSessionExpiry = now + 10 * 60 * 1000;
        return sessionObj;
      }
    }
  } catch (e) {
    console.warn("Failed to load DUPR session from DB:", e);
  }

  if (process.env.DUPR_ACCESS_TOKEN) {
    return { type: "bearer", token: process.env.DUPR_ACCESS_TOKEN };
  }

  const clientKey = process.env.DUPR_CLIENT_KEY;
  const clientSecret = process.env.DUPR_CLIENT_SECRET;
  const baseUrl = process.env.DUPR_API_BASE_URL || "https://api.dupr.com";

  // 2. Partner Key + Secret Auth
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
      const sessionObj = { type: "bearer", token };
      cachedDuprSession = sessionObj;
      cachedDuprSessionExpiry = now + 50 * 60 * 1000;
      return sessionObj;
    }
  }

  return null;
}

async function refreshDuprCookieSession(db, rowId, oldAt, oldRt) {
  try {
    const cookieStr = [
      oldAt ? `__Host-dupr_at=${oldAt}` : "",
      oldRt ? `__Host-dupr_rt=${oldRt}` : ""
    ].filter(Boolean).join("; ");

    const res = await fetch("https://api.dupr.com/auth/v2.0/refresh", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Cookie: cookieStr,
        Origin: "https://dashboard.dupr.com",
        Referer: "https://dashboard.dupr.com/",
        "X-DUPR-Client-Capabilities": "totp,webauthn"
      }
    });

    if (!res.ok) return null;

    const setCookies = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);

    const newAt =
      setCookies
        .find((c) => c.startsWith("__Host-dupr_at="))
        ?.split(";")[0]
        ?.replace("__Host-dupr_at=", "") || oldAt;
    const newRt =
      setCookies
        .find((c) => c.startsWith("__Host-dupr_rt="))
        ?.split(";")[0]
        ?.replace("__Host-dupr_rt=", "") || oldRt;

    if (newAt && db && rowId) {
      await db
        .from("organizers")
        .update({
          password_hash: JSON.stringify({
            at: newAt,
            rt: newRt,
            updated_at: new Date().toISOString()
          })
        })
        .eq("id", rowId);
    }

    const sessionObj = { type: "cookie", at: newAt, rt: newRt, rowId };
    cachedDuprSession = sessionObj;
    cachedDuprSessionExpiry = Date.now() + 10 * 60 * 1000;
    return sessionObj;
  } catch (e) {
    console.warn("DUPR cookie refresh failed:", e);
    return null;
  }
}

async function fetchDuprProfileById(duprId, client, isRetry = false) {
  const auth = await getDuprAuthMaterial(client, isRetry);
  if (!auth) {
    return { ok: false, reason: "no_token" };
  }

  const baseUrl = process.env.DUPR_API_BASE_URL || "https://api.dupr.com";
  const headers =
    auth.type === "cookie"
      ? {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
          Cookie: [
            auth.at ? `__Host-dupr_at=${auth.at}` : "",
            auth.rt ? `__Host-dupr_rt=${auth.rt}` : ""
          ]
            .filter(Boolean)
            .join("; "),
          Origin: "https://dashboard.dupr.com",
          Referer: "https://dashboard.dupr.com/",
          "X-DUPR-Client-Capabilities": "totp,webauthn"
        }
      : {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json"
        };

  // 1. Primary: /player/v1.0/search (returns full player object + ratings)
  try {
    const res = await fetch(`${baseUrl}/player/v1.0/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        limit: 10,
        offset: 0,
        query: duprId,
        exclude: [],
        filter: {}
      })
    });

    if (res.status === 401 && !isRetry && auth.type === "cookie") {
      return fetchDuprProfileById(duprId, client, true);
    }

    if (res.ok) {
      const json = await res.json();
      const hits = json?.result?.hits || json?.result || [];
      const exact = (Array.isArray(hits) ? hits : []).find(
        (h) => String(h.duprId || "").toUpperCase() === duprId.toUpperCase()
      );
      if (exact) {
        return { ok: true, player: exact };
      }
      return { ok: false, reason: "not_found" };
    }
  } catch (e) {
    console.warn("DUPR v1.0/search lookup failed:", e);
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
    const lookup = await fetchDuprProfileById(cleanDuprId, client);
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
      // 若暫時無法連線 DUPR 或無憑證，保留資料庫既有 rating，避免把既有分數覆蓋成 null
      const { data: existingUser } = await client
        .from("users")
        .select("rating")
        .eq("id", user_id)
        .maybeSingle();
      const existingNum = Number(existingUser?.rating);
      if (!isNaN(existingNum) && existingNum >= 1.0 && existingNum <= 8.5) {
        finalRating = existingNum;
        isNr = false;
      } else {
        finalRating = null;
        isNr = true;
      }
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
