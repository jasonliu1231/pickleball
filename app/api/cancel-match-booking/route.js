export const runtime = "nodejs";

import { supabase } from "@/lib/supabase";

function makeHtmlResponse(success, title, message) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            background-color: ${success ? "#022c22" : "#450a0a"}; 
            color: #fff; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0; 
            text-align: center; 
            padding: 20px; 
          }
          .card { 
            background-color: ${success ? "#1e3a8a" : "#7f1d1d"}; 
            border-radius: 24px; 
            padding: 34px 28px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.4); 
            max-width: 420px; 
            width: 100%; 
            border: 1px solid ${success ? "#2563eb" : "#b91c1c"}; 
            box-sizing: border-box;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          h1 { 
            color: ${success ? "#93c5fd" : "#fca5a5"}; 
            font-size: 24px; 
            margin-top: 0; 
            margin-bottom: 12px;
            font-weight: 800;
          }
          p { 
            color: ${success ? "#dbeafe" : "#fecaca"}; 
            line-height: 1.6; 
            font-size: 15px; 
            margin-bottom: 28px; 
            font-weight: 600;
          }
          .btn { 
            display: inline-block; 
            background-color: ${success ? "#2563eb" : "#dc2626"}; 
            color: #fff; 
            text-decoration: none; 
            padding: 13px 26px; 
            border-radius: 14px; 
            font-weight: bold; 
            font-size: 15px;
            transition: background-color 0.2s; 
          }
          .btn:hover { 
            background-color: ${success ? "#1d4ed8" : "#b91c1c"}; 
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${success ? "🎉" : "❌"}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <a href="https://pickleball.jason1231.com" class="btn">回預約首頁</a>
        </div>
      </body>
    </html>
  `;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  
  try {
    if (type === "signup") {
      const signupId = searchParams.get("id");
      if (!signupId) {
        return new Response(makeHtmlResponse(false, "取消失敗", "缺少預約編號。"), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      
      // 1. Fetch participant details
      const { data: participants } = await supabase
        .from("session_participants")
        .select("id, status, session:sessions(session_date, meetup:meetups(name))")
        .eq("id", signupId);
      
      if (!participants || participants.length === 0) {
        return new Response(makeHtmlResponse(false, "取消失敗", "找不到此筆預約紀錄。"), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      
      const part = participants[0];
      const meetupName = part.session?.meetup?.name || "活動";
      const dateStr = part.session?.session_date || "";
      
      if (part.status === "cancelled") {
        return new Response(makeHtmlResponse(true, "已取消預約", `此筆預約項目先前已成功取消。<br>活動：${meetupName}<br>日期：${dateStr}`), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      
      // 2. Perform cancellation
      const { error: cancelError } = await supabase
        .from("session_participants")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", signupId);
      
      if (cancelError) throw cancelError;
      
      return new Response(makeHtmlResponse(true, "取消預約成功！", `已成功為您取消此場活動的預約。<br>活動：${meetupName}<br>日期：${dateStr}`), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
      
    } else if (type === "member") {
      const memberId = searchParams.get("member_id");
      const meetupId = searchParams.get("meetup_id");
      const date = searchParams.get("date");
      
      if (!memberId || !meetupId || !date) {
        return new Response(makeHtmlResponse(false, "取消失敗", "缺少必要的取消參數。"), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      
      // 1. Fetch details
      const { data: members } = await supabase
        .from("organizer_members")
        .select("id, user_id, user:users(name)")
        .eq("id", memberId);

      const { data: meetups } = await supabase
        .from("meetups")
        .select("name")
        .eq("id", meetupId);
      
      if (!members || members.length === 0 || !meetups || meetups.length === 0) {
        return new Response(makeHtmlResponse(false, "取消失敗", "找不到此筆會員或活動資料。"), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      
      const member = members[0];
      const memberName = member.user?.name || "會員";
      const meetupName = meetups[0].name;

      // Find or create session
      let { data: session } = await supabase
        .from("sessions")
        .select("id")
        .eq("meetup_id", meetupId)
        .eq("session_date", date)
        .maybeSingle();

      if (!session) {
        const { data: newS } = await supabase
          .from("sessions")
          .insert({ meetup_id: meetupId, session_date: date, status: "open" })
          .select("id")
          .single();
        session = newS;
      }

      if (session) {
        await supabase
          .from("session_participants")
          .upsert(
            {
              session_id: session.id,
              user_id: member.user_id,
              status: "absent",
              note: "LINE行前提醒自主請假",
              updated_at: new Date().toISOString()
            },
            { onConflict: "session_id,user_id" }
          );
      }
      
      return new Response(makeHtmlResponse(true, "取消預約成功！", `已成功為會員【${memberName}】完成該場次請假，釋出正取名額。<br>活動：${meetupName}<br>日期：${date}`), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
      
    } else {
      return new Response(makeHtmlResponse(false, "取消失敗", "不支援的取消類型。"), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  } catch (error) {
    console.error("Cancel match booking error:", error);
    return new Response(makeHtmlResponse(false, "系統錯誤", error.message || "處理您的取消請求時發生錯誤。"), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
}
