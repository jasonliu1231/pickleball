export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";
import { sendLinePushFlex, fetchTokensForUser, sendExpoPush } from "@/lib/line";
import { logUserNotification } from "@/lib/userNotifications";

export async function POST(request) {
  try {
    const body = await request.json();
    const { member_id, amount, type, notes } = body;
    
    if (!member_id) {
      return Response.json({ ok: false, message: "Missing member_id" }, { status: 400 });
    }
    
    // 1. Fetch organizer member details with user and organizer
    const { data: members } = await supabase
      .from("organizer_members")
      .select("id, user_id, organizer_id, balance, organizers(name), user:users(id, name, line_user_id, expo_push_token)")
      .eq("id", member_id);
    
    if (!members || members.length === 0) {
      return Response.json({ ok: false, message: "Member not found" }, { status: 404 });
    }
    
    const member = members[0];
    const userObj = member.user;
    const lineUserId = userObj?.line_user_id;
    const appPushTokens = await fetchTokensForUser(supabase, {
      userId: member.user_id,
      phone: userObj?.phone
    });
    
    if (!lineUserId && appPushTokens.length === 0) {
      console.log(`No LINE user ID or App push token linked for organizer_member: ${member_id}`);
      return Response.json({ ok: true, message: "No LINE ID or App push token linked to this member" });
    }
    
    const balanceAmount = Number(member.balance || 0);
    const amountVal = Number(amount || 0);
    const orgName = member.organizers?.name || "未知團主";
    const playerNickname = member.user?.name || "會員";
    const typeLabel = type || "checkin";

    // 3. Format header and labels based on transaction type
    let headerTitle = "帳戶交易通知";
    let amountTextLabel = "交易點數";
    let amountSign = amountVal > 0 ? "+" : "";
    let amountColor = amountVal >= 0 ? "#4ade80" : "#f87171";
    let headerColor = "#fb923c"; // Default orange/amber

    if (typeLabel === "checkin") {
      headerTitle = "帳戶扣點通知";
      amountTextLabel = "扣除點數";
      headerColor = "#fb923c"; // Warm orange/coral for deductions
    } else if (typeLabel === "topup") {
      headerTitle = "帳戶儲值通知";
      amountTextLabel = "儲值點數";
      headerColor = "#4ade80"; // Bright green for top-ups
    } else if (typeLabel === "refund") {
      headerTitle = "帳戶退款通知";
      amountTextLabel = "退回點數";
      headerColor = "#38bdf8"; // Light sky blue for refunds
    }

    const flexContents = {
      type: "bubble",
      size: "giga",
      styles: {
        header: {
          backgroundColor: "#18181b" // Deep charcoal
        },
        body: {
          backgroundColor: "#27272a" // Medium charcoal
        },
        footer: {
          backgroundColor: "#18181b"
        }
      },
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: headerTitle,
            weight: "bold",
            color: headerColor,
            size: "lg"
          },
          {
            type: "text",
            text: "匹克球同樂會 - 儲值會員",
            color: "#9ca3af",
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
              {
                type: "text",
                text: "團主",
                color: "#9ca3af",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: orgName,
                color: "#ffffff",
                size: "sm",
                weight: "bold",
                align: "end",
                flex: 4
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "球友姓名",
                color: "#9ca3af",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: playerNickname,
                color: "#ffffff",
                size: "sm",
                align: "end",
                flex: 4
              }
            ]
          },
          {
            type: "separator",
            color: "#374151",
            margin: "md"
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "交易項目",
                color: "#9ca3af",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: notes || (typeLabel === "checkin" ? "簽到出席扣款" : typeLabel === "topup" ? "帳戶儲值" : "取消退款"),
                color: "#ffffff",
                size: "sm",
                wrap: true,
                align: "end",
                flex: 4
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: amountTextLabel,
                color: "#9ca3af",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: `${amountSign}${amountVal} 點`,
                color: amountColor,
                size: "md",
                weight: "bold",
                align: "end",
                flex: 4
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "最新餘額",
                color: "#9ca3af",
                size: "sm",
                flex: 2
              },
              {
                type: "text",
                text: `${balanceAmount.toLocaleString()} 點`,
                color: "#4ade80",
                size: "lg",
                weight: "bold",
                align: "end",
                flex: 4
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "前往預約網站 ➔",
              uri: "https://pickleball.jason1231.com"
            },
            style: "primary",
            color: "#0d9488"
          }
        ]
      }
    };
    
    // 4. Send App Push (Expo Push)
    let appPushSuccess = false;
    if (appPushTokens.length > 0) {
      try {
        const appMessages = appPushTokens.map((token) => ({
          to: token,
          title: `💰 ${headerTitle}`,
          body: `【${orgName}】${headerTitle}：${amountSign}$${Math.abs(amountVal)} 點，目前最新餘額 $${balanceAmount.toLocaleString()} 點。`,
          sound: "default",
          channelId: "pickleball-alerts",
          data: {
            type: "transaction",
            transaction_type: typeLabel,
            amount: amountVal,
            balance: balanceAmount,
          },
        }));
        const expoRes = await sendExpoPush(appMessages);
        appPushSuccess = !!expoRes.ok;
      } catch (expoErr) {
        console.warn("Failed to send Expo App transaction push:", expoErr);
      }
    }

    // Log notification in user_notifications table for notification center
    if (member.user_id) {
      await logUserNotification({
        userId: member.user_id,
        category: "billing_balance",
        title: `💰 ${headerTitle}`,
        body: `【${orgName}】${headerTitle}：${amountSign}$${Math.abs(amountVal)} 點，目前最新餘額 $${balanceAmount.toLocaleString()} 點。`,
        data: {
          type: "transaction",
          transaction_type: typeLabel,
          amount: amountVal,
          balance: balanceAmount,
        },
      });
    }

    // 5. Send LINE Push Message (if linked and organizer quota allows)
    let lineSuccess = false;
    let skipReason = "";

    if (lineUserId && member.organizer_id) {
      try {
        const { data: deductResult, error: rpcError } = await supabase.rpc("deduct_organizer_message_quota", {
          p_organizer_id: member.organizer_id,
          p_message_type: "transaction",
          p_recipient_phone: userObj?.phone || null,
          p_content: `${headerTitle}: ${playerNickname} - ${amountSign}${amountVal} 點`,
          p_cost: 1,
          p_allow_overdraft: false // 扣點制：數量沒了就不再發送
        });

        const deductRes = Array.isArray(deductResult) ? deductResult[0] : deductResult;
        if (!rpcError && deductRes?.ok) {
          lineSuccess = await sendLinePushFlex(lineUserId, flexContents, `匹克球同樂會 - ${headerTitle}`);
          console.log(`[Transaction Quota Deducted] Organizer (${member.organizer_id}) remaining quota: ${deductRes.remaining_quota}`);
        } else {
          skipReason = deductRes?.message || rpcError?.message || "LINE 免費額度已用完或團主已關閉 LINE 推播";
          console.log(`[Transaction LINE Push Skipped]: ${skipReason}`);
        }
      } catch (deductErr) {
        console.error("Failed to deduct transaction quota:", deductErr);
        skipReason = "推播額度檢核異常";
      }
    } else if (lineUserId && !member.organizer_id) {
      skipReason = "無關聯團長，略過 LINE 推播以節省成本";
    }
    
    return Response.json({
      ok: true,
      sent_line: lineSuccess,
      sent_app: appPushSuccess,
      ...(skipReason ? { skipped_line: skipReason } : {})
    });
  } catch (error) {
    console.error("Transaction notification error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
