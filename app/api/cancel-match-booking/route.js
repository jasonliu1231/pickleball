export const runtime = "nodejs";

const SUPABASE_URL = "https://vurcntmcpemioybqqrcx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Z9nUlOsBQ3cIi37lr00vcw_VdBEDo3o";

// Helper to query Supabase REST API
async function querySupabase(endpoint, queryParams = {}) {
  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}${queryString ? "?" + queryString : ""}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    }
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Query ${endpoint} failed: ${response.status} ${errText}`);
  }
  return await response.json();
}

// Helper to perform Supabase mutation (PATCH / POST)
async function mutateSupabase(endpoint, method, body, queryParams = {}) {
  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}${queryString ? "?" + queryString : ""}`;
  
  const response = await fetch(url, {
    method: method,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Mutation ${method} ${endpoint} failed: ${response.status} ${errText}`);
  }
  return await response.json();
}

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
            background-color: ${success ? "#064e3b" : "#7f1d1d"}; 
            border-radius: 24px; 
            padding: 34px 28px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.4); 
            max-width: 420px; 
            width: 100%; 
            border: 1px solid ${success ? "#047857" : "#b91c1c"}; 
            box-sizing: border-box;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          h1 { 
            color: ${success ? "#34d399" : "#fca5a5"}; 
            font-size: 24px; 
            margin-top: 0; 
            margin-bottom: 12px;
            font-weight: 800;
          }
          p { 
            color: ${success ? "#a7f3d0" : "#fecaca"}; 
            line-height: 1.6; 
            font-size: 15px; 
            margin-bottom: 28px; 
            font-weight: 600;
          }
          .btn { 
            display: inline-block; 
            background-color: ${success ? "#059669" : "#dc2626"}; 
            color: #fff; 
            text-decoration: none; 
            padding: 13px 26px; 
            border-radius: 14px; 
            font-weight: bold; 
            font-size: 15px;
            transition: background-color 0.2s; 
          }
          .btn:hover { 
            background-color: ${success ? "#047857" : "#b91c1c"}; 
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
      
      // 1. Fetch signup details
      const signups = await querySupabase("signups", {
        id: `eq.${signupId}`,
        select: "reservation_date,meetup_id,status,meetups(name)"
      });
      
      if (!signups || signups.length === 0) {
        return new Response(makeHtmlResponse(false, "取消失敗", "找不到此筆預約紀錄。"), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      
      const signup = signups[0];
      const meetupName = signup.meetups?.name || "活動";
      const dateStr = signup.reservation_date || "";
      
      if (signup.status === "cancelled") {
        return new Response(makeHtmlResponse(true, "已取消預約", `此筆預約項目先前已成功取消。<br>活動：${meetupName}<br>日期：${dateStr}`), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      
      // 2. Perform cancellation
      await mutateSupabase("signups", "PATCH", {
        status: "cancelled",
        updated_at: new Date().toISOString()
      }, {
        id: `eq.${signupId}`
      });
      
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
      const members = await querySupabase("members", {
        id: `eq.${memberId}`,
        select: "name"
      });
      const meetups = await querySupabase("meetups", {
        id: `eq.${meetupId}`,
        select: "name"
      });
      
      if (!members || members.length === 0 || !meetups || meetups.length === 0) {
        return new Response(makeHtmlResponse(false, "取消失敗", "找不到此筆會員或活動資料。"), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      
      const memberName = members[0].name;
      const meetupName = meetups[0].name;
      
      // Check if already absent
      const absences = await querySupabase("member_absences", {
        member_id: `eq.${memberId}`,
        meetup_id: `eq.${meetupId}`,
        reservation_date: `eq.${date}`
      });
      
      if (absences && absences.length > 0) {
        return new Response(makeHtmlResponse(true, "已登錄請假", `您之前已成功登錄此場次請假。<br>活動：${meetupName}<br>日期：${date}`), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      
      // 2. Perform absence insertion (equivalent to member cancellation)
      await mutateSupabase("member_absences", "POST", {
        member_id: memberId,
        meetup_id: meetupId,
        reservation_date: date,
        reason: "LINE行前提醒自主取消"
      });
      
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
