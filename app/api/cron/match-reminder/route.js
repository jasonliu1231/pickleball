export const runtime = "nodejs";

import { supabase, getSupabaseAdmin } from "@/lib/supabase";
import { sendExpoPush, normalizePhone, fetchTokensForUser, sendLinePushFlex } from "@/lib/line";
import { logBatchUserNotifications } from "@/lib/userNotifications";

/**
 * 取得台北時間 (UTC+8) 的日期字串 YYYY-MM-DD
 */
function getTaipeiDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // Format: "YYYY-MM-DD"
}

/**
 * 取得台北時間 (UTC+8) 的明天日期字串 YYYY-MM-DD
 */
function getTaipeiTomorrowKey() {
  const tomorrow = new Date(Date.now() + 86400000);
  return getTaipeiDateKey(tomorrow);
}

export async function GET(request) {
  return handleCronMatchReminder(request);
}

export async function POST(request) {
  return handleCronMatchReminder(request);
}

async function handleCronMatchReminder(request) {
  const client = getSupabaseAdmin() || supabase;
  const now = new Date();
  const todayKey = getTaipeiDateKey(now);
  const tomorrowKey = getTaipeiTomorrowKey();

  console.log(`[Cron:MatchReminder] Executing 2-hour match reminder check at ${now.toISOString()} (Taipei: ${todayKey})`);

  const searchParams = new URL(request.url).searchParams;
  const isTestAdmin = searchParams.get("test_admin") === "1";

  // 若為管理員測試請求，直接向 Jason 發送測試推播並回傳
  if (isTestAdmin) {
    const ADMIN_PHONE = "0988602005";
    const { data: adminUser } = await client
      .from("users")
      .select("id, name, expo_push_token")
      .eq("phone", ADMIN_PHONE)
      .maybeSingle();

    if (adminUser) {
      const adminTitle = "🤖 系統測試：開打提醒功能正常";
      const adminBody = "哈囉 Jason！這是系統排程測試回報，您的手機推播與排程通知通道均運作正常！";

      await logBatchUserNotifications([
        {
          userId: adminUser.id,
          category: "match_reminder",
          title: adminTitle,
          body: adminBody,
          data: { type: "admin_reminder_test" }
        }
      ]);

      if (adminUser.expo_push_token) {
        try {
          await sendExpoPush([
            {
              to: adminUser.expo_push_token,
              title: adminTitle,
              body: adminBody,
              sound: "default",
              channelId: "pickleball-alerts",
              data: { type: "admin_reminder_test" }
            }
          ]);
        } catch (e) {
          console.warn("Test push failed:", e);
        }
      }
    }

    return Response.json({
      ok: true,
      message: "已成功發送管理員功能正常測試推播給 Jason！",
      admin_user: adminUser?.name || "Jason",
      has_token: !!adminUser?.expo_push_token
    });
  }

  try {
    // 1. 查詢今天與明天尚未發送 2 小時提醒且未取消的場次 (包含 open 與 closed 額滿場次)
    const { data: sessions, error: sessErr } = await client
      .from("sessions")
      .select(`
        id,
        session_date,
        status,
        reminder_2h_sent_at,
        meetup:meetups!inner(
          id,
          name,
          city,
          address,
          street_address,
          start_time,
          organizer_id,
          creator_user_id,
          organizers(name),
          creator:users!creator_user_id(name)
        )
      `)
      .in("session_date", [todayKey, tomorrowKey])
      .neq("status", "cancelled")
      .is("reminder_2h_sent_at", null);

    if (sessErr) {
      console.error("[Cron:MatchReminder] Error querying sessions:", sessErr);
      return Response.json({ ok: false, error: sessErr.message }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return Response.json({
        ok: true,
        message: "目前無未發送 2 小時提醒的有效場次。",
        checked_sessions: 0,
        sent_sessions: 0,
        sent_reminders: 0,
        sent_line: 0,
      });
    }

    const sessionsToRemind = [];

    // 2. 篩選開賽時間落在未來 0 ~ 135 分鐘（約 2 小時左右且尚未開賽）的場次
    for (const s of sessions) {
      if (!s.meetup || !s.meetup.start_time) continue;
      
      const startTimeStr = s.meetup.start_time.slice(0, 5); // "20:00"
      // 組合台北時間 ISO 字串
      const sessionStartIso = `${s.session_date}T${startTimeStr}:00+08:00`;
      const sessionStartDate = new Date(sessionStartIso);
      const diffMs = sessionStartDate.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      // 開賽前 135 分鐘以內且比賽尚未開打
      if (diffMinutes > 0 && diffMinutes <= 135) {
        sessionsToRemind.push({ session: s, diffMinutes });
      }
    }

    if (sessionsToRemind.length === 0) {
      return Response.json({
        ok: true,
        message: `巡檢了 ${sessions.length} 場次，無符合開賽前 2 小時（未來 0~135 分鐘）的待通知場次。`,
        checked_sessions: sessions.length,
        sent_sessions: 0,
        sent_reminders: 0,
        sent_line: 0,
      });
    }

    let totalSentNotifications = 0;
    let totalSentLine = 0;
    const processedSessionIds = [];

    // 3. 遍歷符合條件的場次，發送推播並記錄歷史通知
    for (const item of sessionsToRemind) {
      const s = item.session;
      const meetup = s.meetup;
      const meetupName = meetup.name || "匹克球活動";
      const startTimeStr = (meetup.start_time || "").slice(0, 5);
      const location = [meetup.city, meetup.address, meetup.street_address].filter(Boolean).join(" ") || "未設定地點";
      const orgName = meetup.organizers?.name || meetup.creator?.name || (!meetup.organizer_id || meetup.creator_user_id ? "球友自發" : "球友同樂會");
      const organizerId = meetup.organizer_id;

      // 抓取該場次正取/已出席名單 (含 line_user_id)
      const { data: participants, error: partErr } = await client
        .from("session_participants")
        .select("id, status, user:users(id, name, phone, line_user_id, expo_push_token)")
        .eq("session_id", s.id)
        .in("status", ["confirmed", "attended"]);

      if (partErr) {
        console.warn(`[Cron:MatchReminder] Failed to fetch participants for session ${s.id}:`, partErr);
        continue;
      }

      const confirmedParticipants = participants || [];
      const appPushMessages = [];
      const userNotificationRows = [];

      for (const p of confirmedParticipants) {
        const userId = p.user?.id;
        const playerNickname = p.user?.name || "球友";
        const title = "⏰ 球聚即將開打提醒";
        const body = `哈囉 ${playerNickname}！您預約的「${meetupName}」即將在（${startTimeStr}）於 ${location} 開打，請準備整裝出發囉！🎾`;

        // (1) 無論是否有裝 App，一律寫入會員歷史通知記錄
        if (userId) {
          userNotificationRows.push({
            userId,
            category: "match_reminder",
            title,
            body,
            data: {
              type: "match_reminder_2h",
              meetup_id: meetup.id,
              session_id: s.id,
              session_date: s.session_date,
              start_time: startTimeStr,
            },
          });
        }

        // (2) 若有手機 App 推播 Token，收集發送
        if (p.user?.expo_push_token) {
          appPushMessages.push({
            to: p.user.expo_push_token,
            title,
            body,
            sound: "default",
            channelId: "pickleball-alerts",
            data: {
              type: "match_reminder_2h",
              meetup_id: meetup.id,
              session_id: s.id,
              session_date: s.session_date,
            },
          });
        }

        // (3) 若有 LINE User ID 且有團主 ID，透過扣點制發送 LINE 官方 Flex 卡片
        if (organizerId && p.user?.line_user_id) {
          try {
            const { data: deductResult, error: rpcError } = await client.rpc("deduct_organizer_message_quota", {
              p_organizer_id: organizerId,
              p_message_type: "reminder",
              p_recipient_phone: p.user.phone || "",
              p_content: `即將開打提醒: ${playerNickname} - ${s.session_date} ${startTimeStr} - ${meetupName}`,
              p_cost: 1,
              p_allow_overdraft: false
            });

            const deductRes = Array.isArray(deductResult) ? deductResult[0] : deductResult;
            if (!rpcError && deductRes?.ok) {
              const flexContents = {
                type: "bubble",
                size: "giga",
                styles: {
                  header: { backgroundColor: "#0f172a" },
                  body: { backgroundColor: "#1e3a8a" },
                  footer: { backgroundColor: "#0f172a" }
                },
                header: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "球聚即將開打提醒 ⏰",
                      weight: "bold",
                      color: "#93c5fd",
                      size: "lg"
                    },
                    {
                      type: "text",
                      text: "即將開打，請準備整裝出發！",
                      color: "#dbeafe",
                      size: "xs",
                      margin: "xs"
                    }
                  ]
                },
                body: {
                  type: "box",
                  layout: "vertical",
                  spacing: "md",
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      margin: "md",
                      contents: [
                        { type: "text", text: "團主", color: "#93c5fd", size: "sm", flex: 2 },
                        { type: "text", text: orgName, color: "#ffffff", size: "sm", weight: "bold", align: "end", flex: 4 }
                      ]
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "球友姓名", color: "#93c5fd", size: "sm", flex: 2 },
                        { type: "text", text: playerNickname, color: "#ffffff", size: "sm", align: "end", flex: 4 }
                      ]
                    },
                    { type: "separator", color: "#2563eb", margin: "md" },
                    {
                      type: "box",
                      layout: "horizontal",
                      margin: "md",
                      contents: [
                        { type: "text", text: "活動項目", color: "#93c5fd", size: "sm", flex: 2 },
                        { type: "text", text: meetupName, color: "#ffffff", size: "sm", wrap: true, align: "end", flex: 4 }
                      ]
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "開打時間", color: "#93c5fd", size: "sm", flex: 2 },
                        { type: "text", text: `今天 (${s.session_date}) ${startTimeStr}`, color: "#38bdf8", size: "sm", weight: "bold", align: "end", flex: 4 }
                      ]
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "球場地點", color: "#93c5fd", size: "sm", flex: 2 },
                        { type: "text", text: location, color: "#ffffff", size: "sm", wrap: true, align: "end", flex: 4 }
                      ]
                    }
                  ]
                },
                footer: {
                  type: "box",
                  layout: "horizontal",
                  spacing: "sm",
                  contents: [
                    {
                      type: "button",
                      action: {
                        type: "uri",
                        label: "查看預約 ➔",
                        uri: "https://pickleball.jason1231.com/member"
                      },
                      style: "primary",
                      color: "#2563eb",
                      flex: 1
                    }
                  ]
                }
              };

              const sent = await sendLinePushFlex(p.user.line_user_id, flexContents, `⏰ 開賽提醒：${meetupName} 即將於 ${startTimeStr} 開打！`);
              if (sent) totalSentLine++;
            } else {
              console.log(`[Cron:MatchReminder] Skipped LINE push for ${p.user.phone}: ${deductRes?.message || rpcError?.message}`);
            }
          } catch (lineErr) {
            console.error("[Cron:MatchReminder] LINE push error:", lineErr);
          }
        }
      }

      // (3) 寫入資料庫歷史紀錄庫
      if (userNotificationRows.length > 0) {
        await logBatchUserNotifications(userNotificationRows);
      }

      // (4) 發送手機即時推播
      if (appPushMessages.length > 0) {
        try {
          await sendExpoPush(appPushMessages);
        } catch (pushErr) {
          console.warn("[Cron:MatchReminder] Expo push error:", pushErr);
        }
      }

      // (5) 標記該場次已發送 2 小時提醒，避免重複發送
      await client
        .from("sessions")
        .update({ reminder_2h_sent_at: now.toISOString() })
        .eq("id", s.id)
        .catch(() => {});

      totalSentNotifications += userNotificationRows.length;
      processedSessionIds.push(s.id);
    }

    // 4. 若有成功發送開賽提醒，同步發送一筆「管理員系統回報」給 Jason（免費 App 原生推播 + 站內通知）
    if (processedSessionIds.length > 0) {
      const ADMIN_PHONE = "0988602005";
      const { data: adminUser } = await client
        .from("users")
        .select("id, name, expo_push_token")
        .eq("phone", ADMIN_PHONE)
        .maybeSingle();

      if (adminUser) {
        const adminTitle = "🤖 系統回報：開打提醒已順利發送";
        const adminBody = `系統剛完成開打提醒！共計為 ${processedSessionIds.length} 個場次發送通知，通知 ${totalSentNotifications} 人次，送出 LINE 官方推播 ${totalSentLine} 則，系統正常運行中！`;

        // (1) 寫入 Jason 站內通知紀錄
        await logBatchUserNotifications([
          {
            userId: adminUser.id,
            category: "match_reminder",
            title: adminTitle,
            body: adminBody,
            data: {
              type: "admin_reminder_report",
              sent_sessions: processedSessionIds.length,
              sent_reminders: totalSentNotifications,
              sent_line: totalSentLine
            }
          }
        ]);

        // (2) 發送手機 App 原生推播橫幅給 Jason
        if (adminUser.expo_push_token) {
          try {
            await sendExpoPush([
              {
                to: adminUser.expo_push_token,
                title: adminTitle,
                body: adminBody,
                sound: "default",
                channelId: "pickleball-alerts",
                data: {
                  type: "admin_reminder_report"
                }
              }
            ]);
            console.log("[Cron:MatchReminder] Admin status report sent to Jason successfully.");
          } catch (adminPushErr) {
            console.warn("[Cron:MatchReminder] Failed to send admin push report:", adminPushErr);
          }
        }
      }
    }

    return Response.json({
      ok: true,
      message: `成功發送 ${processedSessionIds.length} 場開賽前 2 小時提醒，共通知 ${totalSentNotifications} 人次，送出 ${totalSentLine} 則 LINE 官方推播。`,
      processed_session_ids: processedSessionIds,
      sent_reminders: totalSentNotifications,
      sent_line: totalSentLine,
    });
  } catch (error) {
    console.error("[Cron:MatchReminder] Fatal error:", error);
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
