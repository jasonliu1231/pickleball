export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { getSupabaseAdmin, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

const LINE_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || "2010841175";
const LINE_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET || "6315be05f5681bb8a10ab380d51ec5e1";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // 解析 state 中是否指定了 App 端自訂返回網址 (e.g. exp://... 或 pickleballceilidh://...)
  let appReturnUrl = null;
  if (state) {
    try {
      const parsed = JSON.parse(decodeURIComponent(state));
      if (parsed.returnUrl) appReturnUrl = parsed.returnUrl;
    } catch (e) {
      try {
        const decoded = Buffer.from(state, "base64").toString("utf-8");
        const parsed = JSON.parse(decoded);
        if (parsed.returnUrl) appReturnUrl = parsed.returnUrl;
      } catch (e2) {}
    }
  }

  // 1. 若 LINE 授權回傳錯誤
  if (error || !code) {
    console.error("LINE Auth callback error from provider:", error, errorDescription);
    const msg = errorDescription || error || "未收到 LINE 授權碼";
    if (appReturnUrl) {
      const sep = appReturnUrl.includes("#") ? "&" : "#";
      return NextResponse.redirect(
        `${appReturnUrl}${sep}error=${encodeURIComponent(error || "no_code")}&error_description=${encodeURIComponent(msg)}`
      );
    }
    return NextResponse.redirect(
      `${origin}/member?error=${encodeURIComponent(error || "no_code")}&error_description=${encodeURIComponent(msg)}`
    );
  }

  try {
    const redirectUri = `${origin}/api/auth/line/callback`;

    // 2. 向 LINE Token 端點換取 Access Token (POST application/x-www-form-urlencoded 表單)
    // 關鍵突破：直接將 client_id 與 client_secret 放在表單 Body，完全避開 Basic Auth Header 衝突！
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code.trim(),
        redirect_uri: redirectUri,
        client_id: String(LINE_CHANNEL_ID).trim(),
        client_secret: String(LINE_CHANNEL_SECRET).trim(),
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("LINE Token exchange failed:", tokenRes.status, errText);
      return NextResponse.redirect(
        `${origin}/member?error=token_exchange_failed&error_description=${encodeURIComponent("LINE 換證失敗：" + errText)}`
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 3. 取得 LINE User Profile (取得真實 LINE User ID、暱稱、頭像)
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileRes.ok) {
      const errProfile = await profileRes.text();
      console.error("Failed to fetch LINE profile:", profileRes.status, errProfile);
      return NextResponse.redirect(
        `${origin}/member?error=profile_fetch_failed&error_description=${encodeURIComponent("取得 LINE 個人資料失敗")}`
      );
    }

    const profile = await profileRes.json();
    const lineUserId = profile.userId; // 例如 U1234567890abcdef...
    const displayName = profile.displayName || "LINE 球友";
    const pictureUrl = profile.pictureUrl || "";

    // 4. 定義對應此 LINE 帳號之固定身分標識與密碼
    const deterministicEmail = `line_${lineUserId.toLowerCase()}@line.pickleball.app`;
    const deterministicPassword = crypto
      .createHmac("sha256", LINE_CHANNEL_SECRET)
      .update(lineUserId)
      .digest("hex");

    const admin = getSupabaseAdmin();
    let targetUserId = null;

    // 5. 若有 Admin 權限 (service_role)，確保使用者存在且信箱已確認 (email_confirm: true)
    if (admin) {
      try {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: deterministicEmail,
          password: deterministicPassword,
          email_confirm: true,
          user_metadata: {
            sub: lineUserId,
            full_name: displayName,
            name: displayName,
            avatar_url: pictureUrl,
            picture: pictureUrl,
            line_user_id: lineUserId,
          },
        });

        if (created?.user) {
          targetUserId = created.user.id;
        } else if (createErr) {
          // 若使用者已存在，列出或透過登入取得其 ID，並更新密碼與 metadata
          const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 100 });
          const existing = usersList?.users?.find((u) => u.email === deterministicEmail);
          if (existing) {
            targetUserId = existing.id;
            await admin.auth.admin.updateUserById(existing.id, {
              password: deterministicPassword,
              user_metadata: {
                sub: lineUserId,
                full_name: displayName,
                name: displayName,
                avatar_url: pictureUrl,
                picture: pictureUrl,
                line_user_id: lineUserId,
              },
            });
          }
        }
      } catch (adminErr) {
        console.warn("Admin create/update user non-fatal warning:", adminErr);
      }
    }

    // 6. 為該使用者簽發標準 Supabase Session
    const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let { data: authData, error: signInErr } = await publicClient.auth.signInWithPassword({
      email: deterministicEmail,
      password: deterministicPassword,
    });

    if (signInErr || !authData?.session) {
      // 若尚未建立且無 Admin 權限，嘗試前端 signUp
      const { data: signUpData, error: signUpErr } = await publicClient.auth.signUp({
        email: deterministicEmail,
        password: deterministicPassword,
        options: {
          data: {
            sub: lineUserId,
            full_name: displayName,
            name: displayName,
            avatar_url: pictureUrl,
            picture: pictureUrl,
            line_user_id: lineUserId,
          },
        },
      });
      if (signUpErr || !signUpData?.session) {
        console.error("Sign in/up failed:", signInErr || signUpErr);
        return NextResponse.redirect(
          `${origin}/member?error=login_failed&error_description=${encodeURIComponent(
            (signInErr || signUpErr)?.message || "登入失敗"
          )}`
        );
      }
      authData = signUpData;
    }

    const { access_token, refresh_token } = authData.session;
    const finalUserId = targetUserId || authData.session.user.id;

    // 7. 同步更新/新增 users 資料表 (防範 duplicate key 衝突)
    if (admin && finalUserId) {
      try {
        const { data: existingUser } = await admin
          .from("users")
          .select("id, name")
          .eq("line_user_id", lineUserId)
          .maybeSingle();

        if (existingUser) {
          // 已有該球友，更新名稱為 LINE 最新名稱
          await admin
            .from("users")
            .update({
              name: displayName || existingUser.name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingUser.id);
        } else {
          // 尚無該球友，建立新紀錄
          await admin.from("users").upsert(
            {
              id: finalUserId,
              name: displayName,
              line_user_id: lineUserId,
            },
            { onConflict: "id" }
          );
        }
      } catch (upsertErr) {
        console.warn("Users upsert warning:", upsertErr);
      }
    }

    // 8. 成功導回：若來自 App，跳轉回 App 專屬協定；若來自 Web，導回 /member
    // Supabase JS Client 會在頁面載入時自動解析 #access_token=...，完成身分驗證並持久化至 localStorage！
    if (appReturnUrl) {
      const sep = appReturnUrl.includes("#") ? "&" : "#";
      const redirectUrl = `${appReturnUrl}${sep}access_token=${access_token}&refresh_token=${refresh_token}&token_type=bearer&type=recovery`;
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUrl = `${origin}/member#access_token=${access_token}&refresh_token=${refresh_token}&token_type=bearer&type=recovery`;
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("Fatal exception in LINE callback:", err);
    if (appReturnUrl) {
      const sep = appReturnUrl.includes("#") ? "&" : "#";
      return NextResponse.redirect(
        `${appReturnUrl}${sep}error=server_error&error_description=${encodeURIComponent(err.message || "伺服器換證發生錯誤")}`
      );
    }
    return NextResponse.redirect(
      `${origin}/member?error=server_error&error_description=${encodeURIComponent(err.message || "伺服器換證發生錯誤")}`
    );
  }
}
