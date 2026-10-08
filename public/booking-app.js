const SUPABASE_URL = "https://jynbpziqitriicruwqlz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_l92pwfLLpWoFtNVv_QF39g_xzZOwqpZ";

function getSupabaseClient() {
  if (typeof window !== "undefined" && window.supabaseClient) {
    return window.supabaseClient;
  }
  if (typeof window !== "undefined" && window.supabase?.createClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window.supabaseClient;
  }
  if (typeof supabase !== "undefined" && supabase.createClient) {
    return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return null;
}

const client = new Proxy({}, {
  get(target, prop) {
    const actualClient = getSupabaseClient();
    if (!actualClient) {
      if (prop === "auth") {
        return {
          getSession: () => Promise.resolve({ data: { session: null } }),
          onAuthStateChange: (cb) => {
            // 当 client 就绪后自动補訂閱
            const poll = setInterval(() => {
              const c = getSupabaseClient();
              if (c) {
                clearInterval(poll);
                c.auth.onAuthStateChange(cb);
              }
            }, 100);
            return { data: { subscription: { unsubscribe: () => clearInterval(poll) } } };
          },
          setSession: (s) => {
            const c = getSupabaseClient();
            return c ? c.auth.setSession(s) : Promise.resolve({ data: { session: null }, error: null });
          },
          signInWithPassword: (p) => {
            const c = getSupabaseClient();
            return c ? c.auth.signInWithPassword(p) : Promise.resolve({ data: {}, error: new Error("Client initializing") });
          },
          signUp: (p) => {
            const c = getSupabaseClient();
            return c ? c.auth.signUp(p) : Promise.resolve({ data: {}, error: new Error("Client initializing") });
          },
          signOut: () => {
            const c = getSupabaseClient();
            return c ? c.auth.signOut() : Promise.resolve({ error: null });
          }
        };
      }
      return (...args) => Promise.resolve({ data: null, error: new Error("Supabase client initializing") });
    }
    const val = actualClient[prop];
    return typeof val === "function" ? val.bind(actualClient) : val;
  }
});

let countdownInterval = null;
let exclusions = [];

function getBookingWindow(m, dateStr) {
  if (!m || !dateStr) return { openDateTime: null, closeDateTime: null };
  const [yr, mo, dy] = dateStr.split("-").map(Number);
  const [h, min] = (m.start_time || "00:00").split(":");
  const gameStart = new Date(yr, mo - 1, dy, Number(h), Number(min), 0, 0);
  
  let openDateTime = null;
  if (m.booking_open_days_before !== null && m.booking_open_days_before !== undefined && Number(m.booking_open_days_before) > 0) {
    openDateTime = new Date(gameStart.getTime() - Number(m.booking_open_days_before) * 60 * 60 * 1000);
  }
  
  let closeDateTime = null;
  if (m.booking_close_days_before !== null && m.booking_close_days_before !== undefined && Number(m.booking_close_days_before) > 0) {
    closeDateTime = new Date(gameStart.getTime() - Number(m.booking_close_days_before) * 60 * 60 * 1000);
  } else {
    closeDateTime = gameStart;
  }
  
  return { openDateTime, closeDateTime };
}

function formatShortDateTime(dt) {
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const h = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  return `${m}/${d} ${h}:${min}`;
}

function startCountdownTicker() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const now = new Date().getTime();
    let activeCountdowns = 0;
    
    document.querySelectorAll(".meetup-card[data-open-time]").forEach((card) => {
      const openTimeMs = Number(card.dataset.openTime);
      const btn = card.querySelector(".signup-btn");
      if (!btn) return;
      
      const delta = openTimeMs - now;
      if (delta > 0) {
        activeCountdowns++;
        if (delta <= 60000) {
          const seconds = Math.ceil(delta / 1000);
          btn.disabled = true;
          btn.textContent = `即將開放 (${seconds}秒)`;
        }
      } else {
        card.removeAttribute("data-open-time");
        const isFull = card.dataset.isFull === "true";
        btn.disabled = false;
        btn.textContent = isFull ? "加入備取" : "我要報名";
        
        const badge = card.querySelector(".badge");
        if (badge && badge.textContent.includes("尚未開放")) {
          const cap = Number(card.dataset.capacity || 0);
          const left = Number(card.dataset.slotsLeft || 0);
          badge.textContent = isFull ? "可備取" : cap > 0 ? `剩 ${left}` : "可報名";
          badge.className = `badge ${isFull ? "full" : ""}`;
        }
      }
    });
    
    if (activeCountdowns === 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }, 1000);
}

function isCancelBlocked(meetup, selectedDate) {
  if (!meetup || !selectedDate) return { blocked: false, reason: "" };
  
  const [yr, mo, dy] = selectedDate.split("-").map(Number);
  const [h, min] = (meetup.start_time || "00:00").split(":");
  const gameStart = new Date(yr, mo - 1, dy, Number(h), Number(min), 0, 0);
  const now = new Date();
  
  if (now >= gameStart) {
    return { blocked: true, reason: "活動已開始，不可線上取消。" };
  }
  
  if (meetup.cancel_deadline_hours !== null && meetup.cancel_deadline_hours !== undefined && Number(meetup.cancel_deadline_hours) > 0) {
    const deadline = new Date(gameStart.getTime() - Number(meetup.cancel_deadline_hours) * 60 * 60 * 1000);
    if (now > deadline) {
      return { 
        blocked: true, 
        reason: `此場次限制於開始前 ${meetup.cancel_deadline_hours} 小時內不可線上取消預約，請聯絡團長。` 
      };
    }
  }
  
  return { blocked: false, reason: "" };
}



const fallbackAnnouncements = [
  { title: "歡迎使用線上預約", content: "最新公告會由發起人更新，請留意此頁資訊。", author_name: "系統" }
];
let announcements = [...fallbackAnnouncements];

const knowledgeItems = [
  { title: "發球：下手發球與落點", desc: "多數規則要求下手發球，球要落在對角發球區內。新手先追求穩定進場，再追求速度與旋轉。", image: { src: "https://i.postimg.cc/0NdMqvTG/s4.jpg", alt: "球場上的球示意" }, tags: [{ k: "重點", v: "下手、對角" }, { k: "新手", v: "先穩再快" }, { k: "練習", v: "固定落點" }] },
  { title: "禁區（廚房）：不能截擊", desc: "網前禁區內不能截擊（球未落地就打）。掌握禁區線附近的腳步與控球，能提升對戰穩定度。", image: { src: "https://i.postimg.cc/43b7TGDW/s5.png", alt: "球拍與球示意" }, tags: [{ k: "規則", v: "禁區不截擊" }, { k: "技巧", v: "腳步控制" }, { k: "策略", v: "打短球" }] },
  { title: "基本：站位與輪轉", desc: "先把站位與輪轉建立起來，比追求大力更容易快速進步；也更適合團體輪轉上場。", image: { src: "https://i.postimg.cc/5tqYMJhq/s6.jpg", alt: "球場上活動示意" }, tags: [{ k: "觀念", v: "先站位" }, { k: "團體", v: "輪轉順暢" }, { k: "新手", v: "更好上手" }] },
  { title: "得分規則：多數採 11 分制、需領先 2 分", desc: "常見賽制為 11 分（或 15/21 分），且需要領先 2 分才算勝。很多休閒玩法採「只有發球方能得分」。", image: { src: "https://i.postimg.cc/q7XhdrPw/s7.png", alt: "計分與比賽示意" }, tags: [{ k: "常見", v: "11 分制" }, { k: "規則", v: "領先 2 分" }, { k: "玩法", v: "發球方得分" }] },
  { title: "雙落地制：發球後前兩拍必須落地", desc: "發球後，接發球方必須讓球落地再回擊；接著發球方也必須讓回球落地再打。完成這兩次落地後，雙方才可以選擇截擊。", image: { src: "https://i.postimg.cc/yNXgzKMn/s8.png", alt: "對打示意" }, tags: [{ k: "關鍵", v: "前兩拍要落地" }, { k: "之後", v: "才可截擊" }, { k: "目的", v: "回合更公平" }] }
];

const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
const weekdaysFull = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
const taiwanCities = [
  "台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市",
  "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣",
  "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
  "台東縣", "澎湖縣", "金門縣", "連江縣"
];
let selectedCity = "all";
const skillLabels = {
  first_time: "需教學 (<2.0)",
  beginner: "初學 (2.0-2.5)",
  normal: "一般 (2.5-3.0)",
  advanced: "進階 (3.0+)"
};
function skillLabel(value, isBeginner) {
  return skillLabels[value] || (isBeginner ? "初學" : "一般");
}
function isBeginnerSkill(value) {
  return value === "first_time" || value === "beginner";
}

function normalizePushTokens(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_) {
      return value ? [value] : [];
    }
  }
  return [];
}

async function notifyNewSignup({ meetup, meetupId, reservationDate, nickname, skillLevel }) {
  const sourceMeetup = meetup || currentMeetup || {};
  const tokens = normalizePushTokens(sourceMeetup.push_tokens);

  try {
    const response = await fetch("/api/send-signup-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pushTokens: tokens,
        meetupId: meetupId || sourceMeetup.id,
        meetupName: sourceMeetup.name || "開團",
        reservationDate,
        nickname,
        skillLevel,
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok === false) {
      console.log("notify new signup failed", result?.message || result);
    }
  } catch (error) {
    console.log("notify new signup failed", error?.message || error);
  }
}

async function notifyCancelSignup({ meetup, meetupId, reservationDate, nickname, meetupName }) {
  const sourceMeetup = meetup || currentMeetup || {};
  try {
    const response = await fetch("/api/send-cancel-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetupId: meetupId || sourceMeetup.id,
        meetupName: meetupName || sourceMeetup.name || "開團",
        reservationDate,
        nickname,
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok === false) {
      console.log("notify cancel signup failed", result?.message || result);
    }
  } catch (error) {
    console.log("notify cancel signup failed", error?.message || error);
  }
}

// URL Query Parameter parsing (for shareable links & deep links)
const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
const urlDate = urlParams.get("date");
const urlMeetupId = urlParams.get("meetup_id") || urlParams.get("id");
const urlPwd = urlParams.get("pwd") || urlParams.get("password");
let hasHandledUrlMeetup = false;

let selectedDate = (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate.trim())) ? urlDate.trim() : toISODate(new Date());
let visibleMonth = selectedDate.slice(0, 7) + "-01";
let availableRules = [];
let currentMeetup = null;
const rosterCache = new Map();

const $ = (id) => document.getElementById(id);

function toISODate(date) {
  const tz = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}
function dateFromISO(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function formatDate(dateStr) {
  const d = dateFromISO(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdaysFull[d.getDay()]}`;
}
function shortDate(dateStr) {
  const d = dateFromISO(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${weekdaysFull[d.getDay()]}`;
}
function addMonths(dateStr, amount) {
  const d = dateFromISO(dateStr);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + amount, 1));
}
function monthTitle(dateStr) {
  const d = dateFromISO(dateStr);
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
}
function timeText(start, end) {
  if (!start || !end) return "時間另行公告";
  return `${String(start).slice(0,5)}–${String(end).slice(0,5)}`;
}
function cleanPhone(phone) { return String(phone || "").replace(/\D/g, ""); }
function validatePhone(phone) { return /^09\d{8}$/.test(cleanPhone(phone)); }
function isTodayDate(dateStr) { return dateStr === toISODate(new Date()); }
function sameDayCancelMessage() { return "當天不開放線上取消預約，請直接聯絡團長處理續數與名額調整。"; }
function maskPhone(phone) {
  const p = cleanPhone(phone);
  if (p.length < 7) return "";
  return `${p.slice(0,4)}***${p.slice(-3)}`;
}
function setMessage(el, text, ok) {
  el.textContent = text || "";
  el.className = `message show ${ok ? "ok" : "err"}`;
}
function clearMessage(el) { el.textContent = ""; el.className = "message"; }

function renderCityFilter() {
  const select = $("cityFilter");
  if (!select) return;
  select.innerHTML = [
    `<option value="all">全部城市</option>`,
    ...taiwanCities.map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`)
  ].join("");
  select.value = selectedCity;
}

function applyCityFilter(query) {
  if (selectedCity && selectedCity !== "all") {
    return query.eq("city", selectedCity);
  }
  return query;
}

async function loadAvailableWeekdays(forceRefresh = false) {
  if (availableRules && availableRules.length > 0 && Array.isArray(exclusions) && !forceRefresh) {
    return; // Fast path: return cached rules without network request
  }
  let query = client
    .from("meetups")
    .select("id, city, weekdays, is_one_off, one_off_date, is_active")
    .eq("is_active", true);
  query = applyCityFilter(query);

  try {
    const [meetupsRes, cancelSessRes] = await Promise.all([
      query,
      client.from("sessions").select("meetup_id, session_date").eq("status", "cancelled")
    ]);
    if (meetupsRes.error) throw meetupsRes.error;

    const rules = [];
    (meetupsRes.data || []).forEach((m) => {
      if (m.is_one_off) {
        rules.push({
          id: m.id,
          weekday: m.one_off_date ? dateFromISO(m.one_off_date).getDay() : 0,
          is_one_off: true,
          one_off_date: m.one_off_date,
          city: m.city || null
        });
      } else {
        (m.weekdays || []).forEach((w) => {
          rules.push({
            id: m.id,
            weekday: Number(w),
            is_one_off: false,
            one_off_date: null,
            city: m.city || null
          });
        });
      }
    });

    availableRules = rules;
    exclusions = (cancelSessRes.data || []).map(s => ({
      meetup_id: s.meetup_id,
      exclude_date: s.session_date
    }));
  } catch (err) {
    console.error("載入開團規則或停開日期失敗", err);
  }
}

function hasAvailableMeetupOnDate(dateStr) {
  const weekday = dateFromISO(dateStr).getDay();
  return availableRules.some((rule) => {
    if (Number(rule.weekday) !== weekday) return false;
    if (rule.start_date && dateStr < rule.start_date) return false;
    if (rule.is_one_off && rule.one_off_date !== dateStr) return false;
    const isExcluded = exclusions.some(ex => String(ex.meetup_id) === String(rule.id) && ex.exclude_date === dateStr);
    if (isExcluded) return false;
    return true;
  });
}

function isMeetupEnded(m, dateStr) {
  if (!m || !dateStr) return false;
  const [yr, mo, dy] = dateStr.split("-").map(Number);
  const [hStart, minStart] = (m.start_time || "00:00").split(":");
  const gameStart = new Date(yr, mo - 1, dy, Number(hStart), Number(minStart), 0, 0);
  
  let gameEnd;
  if (m.end_time) {
    const [hEnd, minEnd] = m.end_time.split(":");
    gameEnd = new Date(yr, mo - 1, dy, Number(hEnd), Number(minEnd), 0, 0);
  } else {
    // 預設活動長度為 2 小時
    gameEnd = new Date(gameStart.getTime() + 2 * 60 * 60 * 1000);
  }
  return new Date() > gameEnd;
}

// 高效記憶體快取 (90 秒 TTL) 與並行請求去重
const MEETUP_CACHE = new Map();
const CACHE_TTL = 90 * 1000;
const inFlightMeetupRequests = new Map();

async function loadMeetupsByDate(dateStr, forceRefresh = false) {
  const cached = MEETUP_CACHE.get(dateStr);
  const now = Date.now();
  if (cached && !forceRefresh && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data; // 0ms 極速秒開！
  }

  // 若相同日期的請求正在進行中，共用同一個 Promise，避免重複發送請求
  if (inFlightMeetupRequests.has(dateStr)) {
    return inFlightMeetupRequests.get(dateStr);
  }

  const fetchPromise = (async () => {
    try {
      const weekday = dateFromISO(dateStr).getDay();

      let mQuery = client
        .from("meetups")
        .select("*, organizer:organizers(name, line_id, phone)")
        .eq("is_active", true);
      mQuery = applyCityFilter(mQuery);

      const [sessionRes, meetupRes, subsRes] = await Promise.all([
        client
          .from("sessions")
          .select("*, meetup:meetups(*, organizer:organizers(name, line_id, phone)), participants:session_participants(user_id, status)")
          .eq("session_date", dateStr),
        mQuery.order("start_time", { ascending: true }),
        client
          .from("member_meetup_subscriptions")
          .select("meetup_id, organizer_member_id, organizer_member:organizer_members(id, user_id, status)")
      ]);

      if (sessionRes.error) throw sessionRes.error;
      if (meetupRes.error) throw meetupRes.error;

      const sessionRows = sessionRes.data || [];
      const activeMeetups = meetupRes.data || [];
      const sessionMeetupIds = new Set(sessionRows.map((s) => String(s.meetup_id)));

      // 建立開團之固定會員訂閱映射
      const allSubs = subsRes?.data || [];
      const subsByMeetup = new Map();
      allSubs.forEach((s) => {
        if (s.organizer_member && s.organizer_member.status !== "active") return;
        const mId = String(s.meetup_id);
        if (!subsByMeetup.has(mId)) subsByMeetup.set(mId, []);
        subsByMeetup.get(mId).push(s);
      });

      const rows = [];

      // 1. 處理當天已實例化的場次
      sessionRows.forEach((s) => {
        if (s.status === "cancelled") return;
        const m = s.meetup || {};
        const cap = s.capacity_override ?? m.capacity ?? 0;
        const mId = String(s.meetup_id || m.id);
        const subs = subsByMeetup.get(mId) || [];
        const absentUserIds = new Set((s.participants || []).filter(p => p.status === 'absent').map(p => String(p.user_id)));
        const activeSubs = subs.filter(sub => !absentUserIds.has(String(sub.organizer_member?.user_id)));
        const memberCount = activeSubs.length;
        const signupConfirmed = Number(s.confirmed_count || 0);
        const realConfirmed = signupConfirmed + memberCount;

        rows.push({
          ...m,
          session_id: s.id,
          session_date: s.session_date,
          capacity_override: s.capacity_override,
          capacity: cap,
          session_notes: s.session_notes || null,
          notes: s.session_notes || m.notes,
          status: s.status || "open",
          match_schedule: s.match_schedule || null,
          confirmed_count: realConfirmed,
          display_confirmed_count: cap > 0 ? Math.min(realConfirmed, cap) : realConfirmed,
          waitlist_count: Number(s.waitlist_count || 0),
          over_capacity_count: cap > 0 ? Math.max(realConfirmed - cap, 0) : 0,
          member_count: memberCount,
          confirmed_signup_count: signupConfirmed,
          organizer_name: m.organizer?.name || "未知主辦"
        });
      });

      // 2. 虛擬場次合成 (常態性每週開團但尚未有預約之日)
      activeMeetups.forEach((m) => {
        if (sessionMeetupIds.has(String(m.id))) return;
        const matchesWeekday = !m.is_one_off && (m.weekdays || []).includes(weekday);
        const matchesOneOff = m.is_one_off && m.one_off_date === dateStr;
        if (matchesWeekday || matchesOneOff) {
          const cap = m.capacity ?? 0;
          const subs = subsByMeetup.get(String(m.id)) || [];
          const memberCount = subs.length;
          const realConfirmed = memberCount;
          rows.push({
            ...m,
            session_id: null,
            session_date: dateStr,
            capacity: cap,
            session_notes: null,
            status: "open",
            match_schedule: null,
            confirmed_count: realConfirmed,
            display_confirmed_count: cap > 0 ? Math.min(realConfirmed, cap) : realConfirmed,
            waitlist_count: 0,
            over_capacity_count: cap > 0 ? Math.max(realConfirmed - cap, 0) : 0,
            member_count: memberCount,
            confirmed_signup_count: 0,
            organizer_name: m.organizer?.name || "未知主辦"
          });
        }
      });

      // 排序邏輯：未結束的活動排前面，已結束的排後面；自訂排序 sort_order 優先（預設：上課 ➔ 覆訓 ➔ 球敘）；次依開始時間排序
      const DEFAULT_MEETUP_ORDER = {
        "匹克球初階（上課）": 1,
        "學長姊覆訓": 2,
        "匹克球初階（球敘）": 3
      };
      const getOrder = (m) => {
        if (m.sort_order !== null && m.sort_order !== undefined && Number(m.sort_order) > 0) return Number(m.sort_order);
        const name = m.name || m.meetup_name || "";
        return DEFAULT_MEETUP_ORDER[name] || 100;
      };

      rows.sort((a, b) => {
        const aEnded = isMeetupEnded(a, dateStr);
        const bEnded = isMeetupEnded(b, dateStr);
        if (aEnded !== bEnded) return aEnded ? 1 : -1;
        const orderA = getOrder(a);
        const orderB = getOrder(b);
        if (orderA !== orderB) return orderA - orderB;
        return String(a.start_time).localeCompare(String(b.start_time));
      });

      MEETUP_CACHE.set(dateStr, {
        timestamp: Date.now(),
        data: rows
      });
      return rows;
    } finally {
      inFlightMeetupRequests.delete(dateStr);
    }
  })();

  inFlightMeetupRequests.set(dateStr, fetchPromise);
  return fetchPromise;
}

async function fetchRoster(meetupId, dateStr) {
  const key = `${meetupId}-${dateStr}`;
  if (rosterCache.has(key)) return rosterCache.get(key);

  try {
    const [sessionRes, subsRes] = await Promise.all([
      client
        .from("sessions")
        .select("id, participants:session_participants(id, people_count, status, note, created_at, user:users(id, name, phone, is_beginner, skill_level, rating))")
        .eq("meetup_id", meetupId)
        .eq("session_date", dateStr)
        .maybeSingle(),
      client
        .from("member_meetup_subscriptions")
        .select("organizer_member_id, organizer_member:organizer_members(id, user_id, status, created_at, user:users(id, name, phone, is_beginner, skill_level, rating))")
        .eq("meetup_id", meetupId)
    ]);

    const session = sessionRes?.data;
    const participants = session?.participants || [];
    const absentUserIds = new Set(participants.filter(p => p.status === 'absent').map(p => String(p.user?.id)));

    // 1. 固定會員（保留名冊，依加入時間先後順序排序）
    const memberRows = [];
    (subsRes?.data || []).forEach(sub => {
      const om = sub.organizer_member;
      if (!om || om.status !== 'active') return;
      const uId = String(om.user?.id || om.user_id);
      if (absentUserIds.has(uId)) return; // 請假不列入
      memberRows.push({
        id: `member-${om.id}`,
        user_id: uId,
        nickname: om.user?.name || "固定會員",
        display_name: om.user?.name || "固定會員",
        phone: om.user?.phone || "",
        is_beginner: om.user?.is_beginner || false,
        skill_level: om.user?.skill_level || "3.0",
        rating: om.user?.rating || 1000,
        people_count: 1,
        status: "confirmed",
        note: "",
        created_at: om.created_at || null,
        source: "member"
      });
    });

    memberRows.sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

    const subUserIds = new Set(memberRows.map(m => String(m.user_id)));

    // 2. 一般報名者（依報名時間先後順序排序）
    const signupRows = participants
      .filter(x => ["confirmed", "waitlist", "attended"].includes(x.status) && !subUserIds.has(String(x.user?.id)))
      .map(x => ({
        id: x.id,
        user_id: x.user?.id,
        nickname: x.user?.name || "球友",
        display_name: x.user?.name || "球友",
        phone: x.user?.phone || "",
        is_beginner: x.user?.is_beginner || false,
        skill_level: x.user?.skill_level || "3.0",
        rating: x.user?.rating || 1000,
        people_count: x.people_count || 1,
        status: x.status === "attended" ? "confirmed" : x.status,
        note: x.note,
        created_at: x.created_at,
        source: "signup"
      }));

    signupRows.sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

    const rows = [...memberRows, ...signupRows];
    rosterCache.set(key, rows);
    return rows;
  } catch (err) {
    console.error("fetchRoster error:", err);
    return [];
  }
}
function clearRosterCache() {
  rosterCache.clear();
  MEETUP_CACHE.clear();
}

function renderCalendar() {
  const monthTitleEl = $("monthTitle");
  const weekRowEl = $("weekRow");
  const daysGridEl = $("daysGrid");
  if (!monthTitleEl || !weekRowEl || !daysGridEl) return;

  monthTitleEl.textContent = monthTitle(visibleMonth);
  weekRowEl.innerHTML = weekdays.map(w => `<div>${w}</div>`).join("");
  const base = dateFromISO(visibleMonth);
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(toISODate(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const today = toISODate(new Date());
  daysGridEl.innerHTML = cells.map((dateStr) => {
    if (!dateStr) return `<button class="day empty" tabindex="-1"></button>`;
    const d = dateFromISO(dateStr);
    const isPast = dateStr < today;
    const has = hasAvailableMeetupOnDate(dateStr);
    const selected = dateStr === selectedDate;
    const isToday = dateStr === today;
    return `<button class="day ${isToday ? "today" : ""} ${isPast ? "past" : ""} ${has && !isPast ? "available" : ""} ${selected ? "selected" : ""}" data-date="${dateStr}">
      <span>${d.getDate()}</span>${has && !isPast ? `<span class="dot"></span>` : ""}
    </button>`;
  }).join("");
  document.querySelectorAll(".day[data-date]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedDate = btn.dataset.date;
      visibleMonth = selectedDate.slice(0, 7) + "-01";
      renderCalendar();
      refreshAll(false);
    });
  });
}

function hasRatingThreshold(m) {
  return false;
}

function formatRatingMin(val) {
  const num = Number(val);
  if (num <= 10) {
    return `DUPR ${num.toFixed(1)} 以上`;
  }
  const minDupr = Math.max(2.0, 2.0 + (num - 1000) / 400).toFixed(2);
  return `${num}分 (等同 DUPR ${minDupr} 以上)`;
}

function renderMeetups(meetups) {
  const dateEl = $("selectedDateText");
  const listEl = $("meetupList");
  if (!listEl) return;
  if (dateEl) dateEl.textContent = formatDate(selectedDate);

  if (!meetups.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏓</div>
        <div class="empty-title">這天目前沒有開放報名</div>
        <p class="empty-sub">在上方月曆點選有黃色小點的日期，即可查看當天可報名的球團！</p>
        <button class="btn-secondary" id="emptyStatePickupBtn" style="margin-top: 14px; font-weight: 800;">➕ 立即發起這天自揪</button>
      </div>
    `;
    $("emptyStatePickupBtn")?.addEventListener("click", () => openCreatePickupModal(selectedDate));
    return;
  }
  listEl.innerHTML = meetups.map((m) => {
    const cap = m.capacity_override ?? m.capacity ?? 0;
    const realConfirmed = Number(m.confirmed_count || 0);
    const displayConfirmed = Number(m.display_confirmed_count ?? (cap > 0 ? Math.min(realConfirmed, cap) : realConfirmed));
    const waitlistCount = Number(m.waitlist_count || 0);
    const mapAddr = m.street_address || m.address;
    const hasCity = mapAddr ? (mapAddr.includes("台中") || mapAddr.includes("臺中") || (m.city && mapAddr.includes(m.city))) : false;
    const queryStr = hasCity ? mapAddr : `${m.city || ""} ${mapAddr}`;
    const memberCount = Number(m.member_count || 0);
    const left = Math.max(0, cap - realConfirmed);
    const full = cap > 0 && left <= 0;

    const { openDateTime, closeDateTime } = getBookingWindow(m, selectedDate);
    const now = new Date();
    
    let isBookingNotOpen = openDateTime && now < openDateTime;
    let isBookingClosed = (closeDateTime && now > closeDateTime) || m.status === 'closed';
    
    let badgeText = "";
    let badgeClass = "";
    if (isBookingNotOpen) {
      badgeText = "尚未開放";
      badgeClass = "muted";
    } else if (isBookingClosed) {
      badgeText = "已截止";
      badgeClass = "muted";
    } else {
      badgeText = full ? "可備取" : cap > 0 ? `剩 ${left}` : "可報名";
      badgeClass = full ? "full" : "";
    }
    
    let primaryBtnText = "";
    let btnDisabledAttr = "";
    if (isBookingNotOpen) {
      const delta = openDateTime.getTime() - now.getTime();
      primaryBtnText = delta <= 60000 ? `即將開放 (${Math.ceil(delta / 1000)}秒)` : `${formatShortDateTime(openDateTime)} 開放`;
      btnDisabledAttr = "disabled";
    } else if (isBookingClosed) {
      primaryBtnText = "預約已截止";
      btnDisabledAttr = "disabled";
    } else {
      primaryBtnText = full ? "加入備取" : "我要報名";
    }

    const showQuickSignup = currentSystemMember && currentSystemMember.phone && currentSystemMember.nickname && !isBookingNotOpen && !isBookingClosed && !btnDisabledAttr && !hasRatingThreshold(m);
    const quickSignupBtnHtml = showQuickSignup 
      ? `<button class="btn-secondary quick-signup-btn" style="background:#eff6ff;border:1.5px solid var(--primary);color:var(--primary);font-weight:900" title="使用您的個人資料快速報名">⚡ 快速報名</button>`
      : "";

    const fillPct = cap > 0 ? Math.min(100, Math.round((displayConfirmed / cap) * 100)) : 100;
    const isUrgent = cap > 0 && left <= 2 && left > 0;
    const capBarHtml = cap > 0 ? `
      <div class="capacity-bar-wrap" title="目前進度：${displayConfirmed}/${cap} 人">
        <div class="capacity-bar-track">
          <div class="capacity-bar-fill ${full ? 'full' : isUrgent ? 'urgent' : ''}" style="width: ${fillPct}%"></div>
        </div>
      </div>
    ` : "";

    return `<article class="meetup-card" id="meetup-card-${m.id}" data-meetup-id="${m.id}" 
      ${isBookingNotOpen ? `data-open-time="${openDateTime.getTime()}"` : ""}
      data-is-full="${full}"
      data-capacity="${cap}"
      data-slots-left="${left}">
      <div class="meetup-top">
        <div>
          <h3 class="meetup-title">
            ${m.creator_member_id ? `<span class="badge pickup-badge" style="margin-right: 6px; font-size: 11px; padding: 2px 6px;">球友自發</span>` : ""}
            ${(m.has_password || m.is_private) ? `<span class="badge" style="margin-right: 6px; font-size: 11px; padding: 2px 6px; background:#fef3c7; color:#92400e; border:1px solid #fde68a;">🔒 私人密碼團</span>` : ""}
            ${escapeHtml(m.name || "未命名活動")}
          </h3>
          <p class="muted">
            ${m.address && m.address !== "地點另行公告" ? `
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryStr)}" target="_blank" rel="noopener noreferrer" class="map-link" title="在地圖中搜尋">
                📍 ${escapeHtml(m.address)}${m.street_address ? ` <span class="street-addr">(${escapeHtml(m.street_address)})</span>` : ""}
              </a>
            ` : "📍 地點另行公告"}
          </p>
        </div>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="info-grid">
        <div class="info"><strong>發起人</strong>${escapeHtml(m.organizer_name || "未設定")}${m.creator_member_id && currentSystemMember && String(m.creator_member_id) === String(currentSystemMember.id) ? ' <span style="color:var(--primary);font-weight:bold;">(我)</span>' : ''}</div>
        <div class="info"><strong>時間</strong>${timeText(m.start_time, m.end_time)}</div>
        <div class="info"><strong>費用</strong>${escapeHtml(String(m.guest_fee !== null && m.guest_fee !== undefined ? m.guest_fee : (m.fee || "現場公告")))}</div>
        <div class="info"><strong>人數</strong>${cap > 0 ? `${displayConfirmed}/${cap} 人` : `${realConfirmed} 人`}</div>
        ${waitlistCount > 0 ? `<div class="info"><strong>備取</strong>${waitlistCount} 人</div>` : ""}
        ${m.coach ? `<div class="info"><strong>教練</strong>${escapeHtml(m.coach)}</div>` : ""}
        ${hasRatingThreshold(m) ? `<div class="info" style="color:#D97706; font-weight:bold;"><strong>戰力門檻</strong>🏆 ${formatRatingMin(m.rating_min)}</div>` : ""}
      </div>
      ${capBarHtml}
      ${m.notes ? `<p class="note">${escapeHtml(m.notes)}</p>` : ""}
      ${m.session_notes ? `<div class="session-note-banner">📢 <strong>當日公告：</strong>${escapeHtml(m.session_notes)}</div>` : ""}
      <div class="actions">
        <button class="btn-primary signup-btn" ${btnDisabledAttr}>${primaryBtnText}</button>
        ${quickSignupBtnHtml}
        <button class="btn-secondary roster-btn">查看名單</button>
        ${m.match_schedule ? `<button class="btn-secondary schedule-btn" style="background:#eff6ff; border-color:var(--primary); color:var(--primary); font-weight:800;">📅 查看賽程</button>` : ""}
        <button class="btn-ghost share-link-btn" style="font-size: 12.5px; font-weight: 800;" title="複製此活動分享連結">🔗 分享</button>
        <button class="btn-ghost cancel-btn">預約管理</button>
      </div>
      <div class="roster" id="roster-${m.id}"></div>
      <div class="schedule" id="schedule-${m.id}"></div>
    </article>`;
  }).join("");

  document.querySelectorAll(".meetup-card").forEach((card) => {
    const id = String(card.dataset.meetupId);
    const meetup = meetups.find((x) => String(x.id) === id);
    card.querySelector(".signup-btn")?.addEventListener("click", () => openSignup(meetup));
    card.querySelector(".cancel-btn")?.addEventListener("click", () => openCancel(meetup));
    card.querySelector(".roster-btn")?.addEventListener("click", () => toggleRoster(meetup));
    card.querySelector(".schedule-btn")?.addEventListener("click", () => toggleSchedule(meetup));
    card.querySelector(".quick-signup-btn")?.addEventListener("click", (e) => handleQuickSignup(meetup, e.currentTarget));
    card.querySelector(".share-link-btn")?.addEventListener("click", () => {
      const shareUrl = `${window.location.origin}/?date=${selectedDate}&meetup_id=${meetup.id}${meetup.join_password ? `&pwd=${encodeURIComponent(meetup.join_password)}` : ''}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          alert(`🎉 已複製專屬報名連結！可直接傳給朋友或貼到 LINE 群組：\n\n${shareUrl}`);
        }).catch(() => {
          prompt("請複製以下活動報名連結：", shareUrl);
        });
      } else {
        prompt("請複製以下活動報名連結：", shareUrl);
      }
    });
  });

  // Auto-scroll and auto-open signup modal if meetup_id is passed in URL
  if (urlMeetupId && !hasHandledUrlMeetup && meetups && meetups.length) {
    const target = meetups.find((x) => String(x.id) === String(urlMeetupId));
    if (target) {
      hasHandledUrlMeetup = true;
      setTimeout(() => {
        const card = document.getElementById(`meetup-card-${target.id}`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.style.transition = "box-shadow 0.4s ease, border-color 0.4s ease";
          card.style.borderColor = "var(--primary)";
          card.style.boxShadow = "0 0 0 4px rgba(37, 99, 235, 0.4)";
          setTimeout(() => {
            card.style.boxShadow = "";
            card.style.borderColor = "";
          }, 3000);
        }
        openSignup(target, urlPwd);
      }, 400);
    }
  }

  if (document.querySelector(".meetup-card[data-open-time]")) {
    startCountdownTicker();
  }
}

async function toggleSchedule(meetup) {
  const el = $(`schedule-${meetup.id}`);
  if (!el) return;
  if (el.classList.contains("show")) {
    el.classList.remove("show");
    return;
  }
  
  // Close roster if open
  const rosterEl = $(`roster-${meetup.id}`);
  if (rosterEl) rosterEl.classList.remove("show");

  el.classList.add("show");
  
  const schedule = meetup.match_schedule;
  if (!schedule || !schedule.courts || schedule.courts.length === 0) {
    el.innerHTML = `<p class="muted">目前尚未排定賽程。</p>`;
    return;
  }

  // Render the schedule grouped by court
  el.innerHTML = `
    <div class="schedule-container" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 12px; margin-top: 12px; display: flex; flex-direction: column; gap: 14px;">
      <h4 style="margin: 0; font-size: 15px; font-weight: 800; color: var(--text); border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          📅 今日預排賽程對戰表
          <span style="font-size: 10px; background: #E2E8F0; color: #475569; padding: 2px 6px; border-radius: 6px; font-weight: 800;">
            ${schedule.mode === 'casual' ? '🍀 球敘模式' : '🏆 DUPR 模式'}
          </span>
        </div>
        <a href="/pickleball_2h_rules_a4.html" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: var(--accent); text-decoration: none; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; background: #f0fdf4; border: 1px solid var(--accent); padding: 2px 8px; border-radius: 6px;">
          🖨️ A4 輪替規則與計分表
        </a>
      </h4>
      ${schedule.courts.map(court => {
        return `
          <div class="court-schedule" style="margin-bottom: 6px;">
            <div style="background: #E2E8F0; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 12px; margin-bottom: 8px; color: #475569; display: flex; justify-content: space-between;">
              <span>第 ${court.courtNumber} 球場</span>
              <span style="font-size: 11px; color: #64748B;">共 ${court.rounds.length} 輪</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${court.rounds.map(round => {
                const ta = round.teamA.map(p => p.nickname).join(' + ');
                const tb = round.teamB.map(p => p.nickname).join(' + ');
                const rest = round.resting.map(p => p.nickname).join(', ');
                
                let scoreText = `<span style="background: #E2E8F0; color: #64748B; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: bold;">未開賽</span>`;
                if (round.scoreA !== null && round.scoreB !== null) {
                  const scoreA = round.scoreA;
                  const scoreB = round.scoreB;
                  const winA = scoreA > scoreB;
                  const winB = scoreB > scoreA;
                  scoreText = `
                    <div style="display: flex; align-items: center; gap: 4px; font-weight: bold; font-size: 13.5px;">
                      <span style="color: ${winA ? 'var(--accent)' : '#64748B'};">${scoreA}</span>
                      <span style="color: #94A3B8;">:</span>
                      <span style="color: ${winB ? 'var(--accent)' : '#64748B'};">${scoreB}</span>
                    </div>
                  `;
                }

                return `
                  <div style="background: #fff; border: 1px solid #F1F5F9; padding: 8px 10px; border-radius: 8px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.01);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <span style="font-size: 11px; font-weight: 800; color: #94A3B8;">第 ${round.roundNumber} 輪</span>
                      ${scoreText}
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: var(--text);">
                      <span style="flex: 1; text-align: left; font-weight: 700;">${ta}</span>
                      <span style="color: #CBD5E1; margin: 0 6px; font-size: 10px; font-weight: bold;">VS</span>
                      <span style="flex: 1; text-align: right; font-weight: 700;">${tb}</span>
                    </div>
                    ${rest ? `
                      <div style="font-size: 10.5px; color: #94A3B8; border-top: 1px dashed #F1F5F9; padding-top: 3px; margin-top: 1px;">
                        💤 休息：${rest}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function toggleRoster(meetup) {
  const el = $(`roster-${meetup.id}`);
  if (el.classList.contains("show")) { el.classList.remove("show"); return; }
  el.classList.add("show");
  el.innerHTML = `<p class="muted">讀取名單中...</p>`;
  try {
    const rows = await fetchRoster(meetup.id, selectedDate);
    if (!rows.length) {
      el.innerHTML = `<p class="muted">目前還沒有人報名。</p>`;
      return;
    }
    const confirmedRows = rows.filter((r) => (r.status || "confirmed") === "confirmed");
    const waitlistRows = rows.filter((r) => r.status === "waitlist");
    const renderPerson = (r, idx) => {
      const countSuffix = (r.people_count > 1) ? ` (+${r.people_count - 1}人)` : '';
      return `
      <div class="person">
        <div class="person-main">
          <div class="person-name">${idx + 1}. ${escapeHtml(r.display_name || r.nickname || "球友")}${countSuffix} ${r.source === "member" ? "<span class=\"pill\">會員</span>" : ""}</div>
          ${r.note ? `<div class="person-note">${escapeHtml(r.note)}</div>` : ""}
        </div>
        <span class="pill">${escapeHtml(skillLabel(r.skill_level, r.is_beginner))}</span>
      </div>`;
    };
    el.innerHTML = `
      <strong>正取名單</strong>
      <div class="roster-list">${confirmedRows.length ? confirmedRows.map(renderPerson).join("") : `<p class="muted">目前尚無正取。</p>`}</div>
      <strong style="display:block;margin-top:12px;">備取名單</strong>
      <div class="roster-list">${waitlistRows.length ? waitlistRows.map(renderPerson).join("") : `<p class="muted">目前尚無備取。</p>`}</div>`;
  } catch (e) {
    el.innerHTML = `<p class="muted">名單讀取失敗，請稍後再試。</p>`;
  }
}

function openSignup(meetup, initialPwd = null) {
  currentMeetup = meetup;
  clearMessage($("formMessage"));
  $("signupForm").reset();
  $("modalTitle").textContent = meetup.name || "我要報名";
  $("modalSubtitle").textContent = `${formatDate(selectedDate)}｜${timeText(meetup.start_time, meetup.end_time)}`;
  
  if ($("modalFeeText")) {
    $("modalFeeText").textContent = meetup.guest_fee !== null && meetup.guest_fee !== undefined ? meetup.guest_fee : (meetup.fee || "現場公告 / 場租平分");
  }
  if ($("modalAddressText")) {
    const loc = [meetup.city, meetup.address].filter(Boolean).join(" ");
    $("modalAddressText").textContent = loc ? `${loc}${meetup.street_address ? ` (${meetup.street_address})` : ""}` : "地點另行公告";
  }
  const notesBox = $("modalNotesBox");
  const notesText = $("modalNotesText");
  const fullNotes = [meetup.notes, meetup.session_notes, meetup.weekday_notes].filter(Boolean).join(" ｜ ");
  if (notesBox && notesText) {
    if (fullNotes && fullNotes.trim()) {
      notesText.textContent = fullNotes.trim();
      notesBox.style.display = "block";
    } else {
      notesBox.style.display = "none";
    }
  }
  
  if (currentSystemMember) {
    $("nickname").value = currentSystemMember.nickname || "";
    $("phone").value = currentSystemMember.phone || "";
    if ($("skillLevel")) {
      $("skillLevel").value = currentSystemMember.skill_level || "normal";
    }
  }
  $("nickname").readOnly = false;
  $("phone").readOnly = false;
  
  const peopleCountLabel = $("peopleCount")?.closest("label");
  if (peopleCountLabel) {
    peopleCountLabel.style.display = "none";
  }
  
  const ratingWarningEl = $("ratingLimitWarning");
  if (ratingWarningEl) {
    if (hasRatingThreshold(meetup)) {
      const ratingLabel = formatRatingMin(meetup.rating_min);
      ratingWarningEl.style.display = "block";
      ratingWarningEl.innerHTML = `🏆 <b>本場次設有戰力門檻</b>：報名門檻需達 <b>${ratingLabel}</b>。<br/>若您的戰力未達限制，報名送出後會<b>自動加入「彈性候補」</b>，待場主審核後即可轉為正取！`;
    } else {
      ratingWarningEl.style.display = "none";
    }
  }

  const pwdRow = $("signupPasswordRow");
  if (pwdRow) {
    if (meetup.has_password || meetup.is_private) {
      pwdRow.style.display = "block";
      if ($("signupPassword")) $("signupPassword").value = initialPwd || "";
    } else {
      pwdRow.style.display = "none";
      if ($("signupPassword")) $("signupPassword").value = "";
    }
  }

  setModalVisible($("signupModal"), true);
}
function closeSignup() { setModalVisible($("signupModal"), false); currentMeetup = null; }
function openCancel(meetup) {
  currentMeetup = meetup;
  clearMessage($("cancelMessage"));
  $("cancelForm").reset();
  $("cancelFormSecondStep").style.display = "none";
  $("queryResultText").textContent = "";
  if ($("guestPromoteBtn")) $("guestPromoteBtn").style.display = "none";
  const baseText = `${meetup.name || "活動"}｜${formatDate(selectedDate)}｜一般報名可在此查詢、取消或轉正；固定會員可登記請假。`;
  
  const blockCheck = isCancelBlocked(meetup, selectedDate);
  if (blockCheck.blocked) {
    $("cancelSubtitle").textContent = `${baseText}｜提醒：${blockCheck.reason}`;
    $("queryCancelBtn").disabled = true;
    $("cancelSubmitBtn").disabled = true;
    $("cancelSubmitBtn").textContent = "不可線上取消";
    setMessage($("cancelMessage"), blockCheck.reason, false);
  } else {
    $("cancelSubtitle").textContent = baseText;
    $("queryCancelBtn").disabled = false;
    $("cancelSubmitBtn").disabled = false;
    $("cancelSubmitBtn").textContent = "取消預約";
  }
  setModalVisible($("cancelModal"), true);
}
function closeCancel() { setModalVisible($("cancelModal"), false); currentMeetup = null; }

function setModalVisible(el, visible) {
  if (!el) return;
  if (visible) {
    el.classList.add("show");
    document.body.classList.add("modal-open");
  } else {
    el.classList.remove("show");
    if (!document.querySelector(".modal.show")) {
      document.body.classList.remove("modal-open");
    }
  }
}

function initPickupModal() {
  const citySelect = $("pickupCity");
  if (citySelect && citySelect.options.length <= 1) {
    citySelect.innerHTML = taiwanCities.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    if (selectedCity && selectedCity !== "all") {
      citySelect.value = selectedCity;
    } else {
      citySelect.value = "台中市";
    }
  }
  const editCitySelect = $("editPickupCity");
  if (editCitySelect && editCitySelect.options.length <= 1) {
    editCitySelect.innerHTML = taiwanCities.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  }
}

function openEditPickupModal(m) {
  if (!m) return;
  initPickupModal();
  if ($("editPickupId")) $("editPickupId").value = m.id;
  if ($("editPickupName")) $("editPickupName").value = m.name || "";
  if ($("editPickupDate")) $("editPickupDate").value = m.start_date || "";
  if ($("editPickupCity")) $("editPickupCity").value = m.city || "台中市";
  if ($("editPickupStartTime")) $("editPickupStartTime").value = m.start_time ? m.start_time.slice(0, 5) : "14:00";
  if ($("editPickupEndTime")) $("editPickupEndTime").value = m.end_time ? m.end_time.slice(0, 5) : "16:00";
  if ($("editPickupAddress")) $("editPickupAddress").value = m.address || "";
  if ($("editPickupStreetAddress")) $("editPickupStreetAddress").value = m.street_address || "";
  if ($("editPickupCapacity")) $("editPickupCapacity").value = m.capacity || 4;
  if ($("editPickupFee")) $("editPickupFee").value = m.fee || "場租平分";
  if ($("editPickupNotes")) $("editPickupNotes").value = m.notes || "";
  if ($("editPickupJoinPassword")) $("editPickupJoinPassword").value = m.join_password || "";
  clearMessage($("editPickupMessage"));
  setModalVisible($("editPickupModal"), true);
}

function closeEditPickupModal() {
  setModalVisible($("editPickupModal"), false);
}

async function handleUpdatePickup(e) {
  e.preventDefault();
  if (!currentUser || !currentSystemMember) {
    return setMessage($("editPickupMessage"), "請先登入會員", false);
  }
  const meetupId = $("editPickupId")?.value;
  const name = $("editPickupName")?.value?.trim();
  const city = $("editPickupCity")?.value;
  const startTime = $("editPickupStartTime")?.value;
  const endTime = $("editPickupEndTime")?.value;
  const address = $("editPickupAddress")?.value?.trim();
  const streetAddress = $("editPickupStreetAddress")?.value?.trim() || "";
  const capacity = parseInt($("editPickupCapacity")?.value || "4", 10);
  const fee = $("editPickupFee")?.value?.trim() || "場租平分";
  const notes = $("editPickupNotes")?.value?.trim() || "";
  const joinPassword = $("editPickupJoinPassword")?.value?.trim() || null;

  if (!meetupId || !name || !city || !startTime || !endTime || !address || !capacity) {
    return setMessage($("editPickupMessage"), "請填寫所有必填欄位", false);
  }

  const saveBtn = $("savePickupBtn");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "儲存中...";
  }
  clearMessage($("editPickupMessage"));

  try {
    const { data, error } = await client.rpc("update_member_pickup", {
      p_creator_member_id: currentSystemMember.id,
      p_meetup_id: Number(meetupId),
      p_name: name,
      p_city: city,
      p_address: address,
      p_street_address: streetAddress,
      p_start_time: startTime,
      p_end_time: endTime,
      p_capacity: capacity,
      p_fee: fee,
      p_notes: notes,
      p_join_password: joinPassword
    });

    if (error) throw error;
    if (data && !data.ok) {
      throw new Error(data.error || "儲存修改失敗");
    }

    setMessage($("editPickupMessage"), "✅ 自揪活動修改成功！", true);
    setTimeout(async () => {
      closeEditPickupModal();
      clearRosterCache();
      await loadAvailableWeekdays(true);
      if ($("memberDashboard")) loadMemberDashboard();
    }, 1000);
  } catch (err) {
    console.error("修改自揪失敗:", err);
    setMessage($("editPickupMessage"), err.message || "修改失敗，請稍候重試", false);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "儲存修改";
    }
  }
}

function openCreatePickupModal(presetDate) {
  if (!currentUser || !currentSystemMember) {
    if (confirm("發起自揪活動需要登入會員帳號，是否前往會員登入？")) {
      window.location.href = "/member";
    }
    return;
  }
  if (!currentSystemMember.phone) {
    openBindPhoneModal("發起自揪活動需要您的聯絡手機，請先完成手機綁定！");
    return;
  }

  initPickupModal();
  const targetDate = presetDate || selectedDate || toISODate(new Date());
  if ($("pickupDate")) $("pickupDate").value = targetDate;
  if ($("pickupCity") && selectedCity && selectedCity !== "all") {
    $("pickupCity").value = selectedCity;
  }
  clearMessage($("pickupFormMessage"));
  const privateCheckbox = $("pickupIsPrivate");
  const pwdWrap = $("pickupPasswordWrap");
  if (privateCheckbox && pwdWrap) {
    privateCheckbox.checked = false;
    pwdWrap.style.display = "none";
    if ($("pickupJoinPassword")) $("pickupJoinPassword").value = "";
    privateCheckbox.onchange = () => {
      pwdWrap.style.display = privateCheckbox.checked ? "block" : "none";
      if (privateCheckbox.checked) $("pickupJoinPassword")?.focus();
    };
  }
  setModalVisible($("createPickupModal"), true);
}

function closeCreatePickupModal() {
  setModalVisible($("createPickupModal"), false);
}

async function handleCreatePickup(e) {
  e.preventDefault();
  if (!currentUser || !currentSystemMember) {
    return setMessage($("pickupFormMessage"), "請先登入會員", false);
  }
  const name = $("pickupName")?.value?.trim();
  const date = $("pickupDate")?.value;
  const city = $("pickupCity")?.value;
  const startTime = $("pickupStartTime")?.value;
  const endTime = $("pickupEndTime")?.value;
  const address = $("pickupAddress")?.value?.trim();
  const streetAddress = $("pickupStreetAddress")?.value?.trim() || "";
  const capacity = parseInt($("pickupCapacity")?.value || "4", 10);
  const fee = $("pickupFee")?.value?.trim() || "場租平分";
  const notes = $("pickupNotes")?.value?.trim() || "";

  const isPrivate = $("pickupIsPrivate")?.checked;
  const joinPassword = isPrivate ? ($("pickupJoinPassword")?.value?.trim() || null) : null;
  if (isPrivate && !joinPassword) {
    return setMessage($("pickupFormMessage"), "請為私人團設定通關密碼，或取消勾選私人團。", false);
  }

  if (!name || !date || !city || !startTime || !endTime || !address || !capacity) {
    return setMessage($("pickupFormMessage"), "請填寫所有必填欄位", false);
  }

  const submitBtn = $("submitPickupBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "發起揪團中...";
  }
  clearMessage($("pickupFormMessage"));

  try {
    const { data, error } = await client.rpc("create_member_pickup", {
      p_creator_member_id: currentSystemMember.id,
      p_name: name,
      p_city: city,
      p_address: address,
      p_street_address: streetAddress,
      p_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
      p_capacity: capacity,
      p_fee: fee,
      p_notes: notes,
      p_join_password: joinPassword
    });

    if (error) throw error;
    if (data && !data.ok) {
      throw new Error(data.error || "發起揪團失敗");
    }

    const newMeetupId = data?.meetup_id;
    let successMsg = "🎉 自揪團發起成功！已自動將您加入正取第 1 位。";
    if (newMeetupId && navigator?.clipboard?.writeText) {
      const shareUrl = `${window.location.origin}/?date=${date}&meetup_id=${newMeetupId}${joinPassword ? `&pwd=${encodeURIComponent(joinPassword)}` : ''}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        successMsg += "（活動專屬連結已複製至剪貼簿）";
      } catch (_) {}
    }
    setMessage($("pickupFormMessage"), successMsg, true);
    setTimeout(async () => {
      closeCreatePickupModal();
      $("createPickupForm")?.reset();
      selectedDate = date;
      if (selectedCity !== "all" && selectedCity !== city) {
        selectedCity = "all";
        if ($("cityFilter")) $("cityFilter").value = "all";
      }
      clearRosterCache();
      await loadAvailableWeekdays(true);
      await refreshAll();
    }, 1200);
  } catch (err) {
    console.error("發起自揪失敗:", err);
    setMessage($("pickupFormMessage"), err.message || "發起失敗，請稍候重試", false);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "確認發起揪團";
    }
  }
}

async function handleQueryCancel() {
  if (!currentMeetup) return;
  const blockCheck = isCancelBlocked(currentMeetup, selectedDate);
  if (blockCheck.blocked) return setMessage($("cancelMessage"), blockCheck.reason, false);
  const phone = cleanPhone($("cancelPhone").value);
  if (!validatePhone(phone)) return setMessage($("cancelMessage"), "請輸入正確手機號碼，例如 0912345678。", false);

  clearMessage($("cancelMessage"));
  $("queryCancelBtn").disabled = true;
  $("queryCancelBtn").textContent = "查詢中...";
  try {
    const { data: user } = await client
      .from("users")
      .select("id, name")
      .eq("phone", phone)
      .maybeSingle();

    if (!user) {
      $("cancelFormSecondStep").style.display = "none";
      return setMessage($("cancelMessage"), "找不到該手機的預約紀錄。", false);
    }

    const { data: session } = await client
      .from("sessions")
      .select("id")
      .eq("meetup_id", currentMeetup.id)
      .eq("session_date", selectedDate)
      .maybeSingle();

    if (!session) {
      $("cancelFormSecondStep").style.display = "none";
      return setMessage($("cancelMessage"), "查無該場次預約紀錄。", false);
    }

    const { data, error } = await client
      .from("session_participants")
      .select("id, people_count, status")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .in("status", ["confirmed", "waitlist"])
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      $("cancelFormSecondStep").style.display = "none";
      return setMessage($("cancelMessage"), "找不到該手機的預約紀錄。", false);
    }

    const select = $("cancelPeopleCount");
    const count = Number(data.people_count || 1);
    if (select) {
      select.innerHTML = "";
      for (let i = 1; i <= count; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = `${i} 人`;
        if (i === 1) opt.selected = true;
        select.appendChild(opt);
      }

      const cancelPeopleLabel = select.closest("label");
      if (cancelPeopleLabel) {
        cancelPeopleLabel.style.display = count > 1 ? "grid" : "none";
      }
    }

    const statusText = data.status === "waitlist" ? "備取" : "正取";
    $("queryResultText").textContent = `查得預約：${user.name || "球友"} (${statusText} ${count}人)`;
    
    $("cancelFormSecondStep").style.display = "block";
  } catch (err) {
    setMessage($("cancelMessage"), err.message || "查詢失敗，請稍後再試。", false);
  } finally {
    $("queryCancelBtn").disabled = false;
    $("queryCancelBtn").textContent = "查詢預約";
  }
}

async function handleSignup(e) {
  e.preventDefault();
  if (!currentMeetup) return;
  const nickname = $("nickname").value.trim();
  const phone = cleanPhone($("phone").value);
  const note = $("note").value.trim();
  const skillLevel = $("skillLevel").value || "normal";
  const isBeginner = isBeginnerSkill(skillLevel);
  const peopleCount = parseInt($("peopleCount")?.value || "1") || 1;
  const password = $("signupPassword")?.value?.trim() || null;

  if (currentMeetup.join_password && String(currentMeetup.join_password).trim() !== String(password || "").trim()) {
    return setMessage($("formMessage"), "此活動通關密碼錯誤，請確認後再試！", false);
  }
  if (!nickname) return setMessage($("formMessage"), "請填寫暱稱。", false);
  if (!validatePhone(phone)) return setMessage($("formMessage"), "請輸入正確手機號碼，例如 0912345678。", false);
  $("submitBtn").disabled = true;
  $("submitBtn").textContent = "送出中...";
  try {
    // 1. Find or create user
    let user = null;
    const { data: existingUser } = await client
      .from("users")
      .select("id, name, phone")
      .eq("phone", phone)
      .maybeSingle();

    if (existingUser) {
      user = existingUser;
      if (nickname && nickname !== user.name) {
        await client.from("users").update({ name: nickname }).eq("id", user.id);
      }
    } else {
      const { data: newUser, error: createErr } = await client
        .from("users")
        .insert({
          phone: phone,
          name: nickname,
          skill_level: skillLevel,
          is_beginner: isBeginner
        })
        .select()
        .single();
      if (createErr) throw createErr;
      user = newUser;
    }

    // 2. Find or create session
    let session = null;
    const { data: existingSession } = await client
      .from("sessions")
      .select("id, capacity_override, confirmed_count, waitlist_count, status")
      .eq("meetup_id", currentMeetup.id)
      .eq("session_date", selectedDate)
      .maybeSingle();

    if (existingSession) {
      session = existingSession;
    } else {
      const { data: newSession, error: createSessErr } = await client
        .from("sessions")
        .insert({
          meetup_id: currentMeetup.id,
          session_date: selectedDate,
          status: "open"
        })
        .select()
        .single();
      if (createSessErr) throw createSessErr;
      session = newSession;
    }

    // 3. Calculate status (confirmed vs waitlist)
    const capacity = session.capacity_override ?? currentMeetup.capacity ?? 0;
    const confirmed = Number(session.confirmed_count || 0);
    const targetStatus = (capacity > 0 && confirmed + peopleCount > capacity) ? "waitlist" : "confirmed";

    // 4. Upsert session_participant
    const { error: partErr } = await client
      .from("session_participants")
      .upsert(
        {
          session_id: session.id,
          user_id: user.id,
          people_count: peopleCount,
          status: targetStatus,
          payment_method: "cash",
          note: note || null
        },
        { onConflict: "session_id,user_id" }
      );
    if (partErr) throw partErr;

    // 如果球友已登入，且資料中手機為空，自動更新
    if (currentUser && currentSystemMember && !currentSystemMember.phone && phone) {
      try {
        const { data: updatedMember } = await client
          .from("users")
          .update({ phone: phone, name: nickname })
          .eq("id", currentSystemMember?.id || currentUser.id)
          .select()
          .single();
        if (updatedMember) {
          currentSystemMember = { ...updatedMember, nickname: updatedMember.name };
          if ($("profilePhone")) $("profilePhone").value = phone;
          if ($("profileNickname")) $("profileNickname").value = nickname;
        }
      } catch (profileErr) {
        console.error("Failed to auto-update profile phone:", profileErr);
      }
    }

    setMessage($("formMessage"), targetStatus === "waitlist" ? "目前正取已滿，已幫您加入備取。" : "報名成功，您目前為正取。", true);
    notifyNewSignup({ meetup: currentMeetup, meetupId: currentMeetup.id, reservationDate: selectedDate, nickname, skillLevel });
    clearRosterCache();
    await refreshMeetupListOnly();
  } catch (err) {
    setMessage($("formMessage"), err.message || "報名失敗，請稍後再試。", false);
  } finally {
    $("submitBtn").disabled = false;
    $("submitBtn").textContent = "確認報名";
  }
}

async function handleQuickSignup(meetup, btn) {
  if (!currentSystemMember || !currentSystemMember.phone || !currentSystemMember.nickname) {
    openBindPhoneModal("使用 1 鍵快速預約前，請先完成手機號碼綁定！");
    return;
  }

  let passwordVal = null;
  if (meetup.join_password) {
    passwordVal = prompt(`活動「${meetup.name}」為私人密碼團，請輸入通關密碼：`);
    if (passwordVal === null) return;
    if (String(passwordVal).trim() !== String(meetup.join_password).trim()) {
      alert("通關密碼錯誤，請確認後再試！");
      return;
    }
  }

  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = "⏳ 傳送中...";
  try {
    const isBeginnerVal = currentSystemMember.is_beginner || false;
    const skillLevelVal = currentSystemMember.skill_level || "normal";
    const phone = cleanPhone(currentSystemMember.phone);

    // 1. Find or create user
    let user = null;
    const { data: existingUser } = await client
      .from("users")
      .select("id, name, phone")
      .eq("phone", phone)
      .maybeSingle();

    if (existingUser) {
      user = existingUser;
    } else {
      const { data: newUser, error: createErr } = await client
        .from("users")
        .insert({
          phone: phone,
          name: currentSystemMember.nickname,
          skill_level: skillLevelVal,
          is_beginner: isBeginnerVal
        })
        .select()
        .single();
      if (createErr) throw createErr;
      user = newUser;
    }

    // 2. Find or create session
    let session = null;
    const { data: existingSession } = await client
      .from("sessions")
      .select("id, capacity_override, confirmed_count, waitlist_count, status")
      .eq("meetup_id", meetup.id)
      .eq("session_date", selectedDate)
      .maybeSingle();

    if (existingSession) {
      session = existingSession;
    } else {
      const { data: newSession, error: createSessErr } = await client
        .from("sessions")
        .insert({
          meetup_id: meetup.id,
          session_date: selectedDate,
          status: "open"
        })
        .select()
        .single();
      if (createSessErr) throw createSessErr;
      session = newSession;
    }

    // 3. Calculate status (confirmed vs waitlist)
    const capacity = session.capacity_override ?? meetup.capacity ?? 0;
    const confirmed = Number(session.confirmed_count || 0);
    const targetStatus = (capacity > 0 && confirmed + 1 > capacity) ? "waitlist" : "confirmed";

    // 4. Upsert session_participant
    const { error: partErr } = await client
      .from("session_participants")
      .upsert(
        {
          session_id: session.id,
          user_id: user.id,
          people_count: 1,
          status: targetStatus,
          payment_method: "cash"
        },
        { onConflict: "session_id,user_id" }
      );
    if (partErr) throw partErr;

    const msg = targetStatus === "waitlist" ? "正取已滿，已幫您排入備取！" : "恭喜！您已成功預約正取！";
    alert(msg);
    notifyNewSignup({ meetup, meetupId: meetup.id, reservationDate: selectedDate, nickname: currentSystemMember.nickname, skillLevel: skillLevelVal });
    clearRosterCache();
    await refreshMeetupListOnly();
  } catch (err) {
    alert("預約失敗：" + (err.message || String(err)));
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function handleCancel(e) {
  e.preventDefault();
  if (!currentMeetup) return;
  const blockCheck = isCancelBlocked(currentMeetup, selectedDate);
  if (blockCheck.blocked) return setMessage($("cancelMessage"), blockCheck.reason, false);
  const phone = cleanPhone($("cancelPhone").value);
  const cancelPeopleCount = $("cancelPeopleCount") ? (parseInt($("cancelPeopleCount").value) || 1) : 1;
  if (!validatePhone(phone)) return setMessage($("cancelMessage"), "請輸入報名或會員手機，例如 0912345678。", false);
  $("cancelSubmitBtn").disabled = true;
  $("cancelSubmitBtn").textContent = "取消中...";
  try {
    const { data: user } = await client
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (!user) throw new Error("找不到該手機的預約紀錄。");

    const { data: session } = await client
      .from("sessions")
      .select("id")
      .eq("meetup_id", currentMeetup.id)
      .eq("session_date", selectedDate)
      .maybeSingle();
    if (!session) throw new Error("查無該場次紀錄。");

    const { data: part } = await client
      .from("session_participants")
      .select("id, people_count, status")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .in("status", ["confirmed", "waitlist"])
      .maybeSingle();
    if (!part) throw new Error("找不到有效的預約紀錄。");

    if (cancelPeopleCount && cancelPeopleCount < part.people_count) {
      const newCount = part.people_count - cancelPeopleCount;
      await client
        .from("session_participants")
        .update({ people_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", part.id);
    } else {
      await client
        .from("session_participants")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", part.id);
    }

    if (part.status === "confirmed") {
      const { data: waitlist } = await client
        .from("session_participants")
        .select("id")
        .eq("session_id", session.id)
        .eq("status", "waitlist")
        .order("created_at", { ascending: true })
        .limit(1);

      if (waitlist && waitlist.length > 0) {
        await client
          .from("session_participants")
          .update({ status: "confirmed", updated_at: new Date().toISOString() })
          .eq("id", waitlist[0].id);
      }
    }

    setMessage($("cancelMessage"), "已成功取消預約，名額已釋出。", true);
    notifyCancelSignup({
      meetup: currentMeetup,
      meetupId: currentMeetup.id,
      reservationDate: selectedDate,
      nickname: currentSystemMember?.nickname || phone,
      meetupName: currentMeetup.name
    });
    $("cancelFormSecondStep").style.display = "none";
    $("queryResultText").textContent = "";
    clearRosterCache();
    await refreshMeetupListOnly();
  } catch (err) {
    setMessage($("cancelMessage"), err.message || "取消失敗，請稍後再試。", false);
  } finally {
    $("cancelSubmitBtn").disabled = false;
    $("cancelSubmitBtn").textContent = "確認取消";
  }
}

async function refreshMeetupListOnly() {
  const meetups = await loadMeetupsByDate(selectedDate, true);
  renderMeetups(meetups);
  updateDailyPulse(meetups);
}
async function refreshAll(showLoading = true) {
  if (!$("daysGrid") && !$("meetupList")) return;
  renderCalendar();
  const dateEl = $("selectedDateText");
  if (dateEl) dateEl.textContent = formatDate(selectedDate);
  
  const meetupEl = $("meetupList");
  const cached = MEETUP_CACHE.get(selectedDate);
  const now = Date.now();
  const isFresh = cached && (now - cached.timestamp < CACHE_TTL);

  // 1. 若記憶體已有快取，0ms 極速秒開渲染！
  if (cached) {
    renderMeetups(cached.data);
    updateDailyPulse(cached.data);
    if (isFresh && !showLoading) {
      return;
    }
  } else if (meetupEl && showLoading) {
    meetupEl.innerHTML = `
      <div class="skeleton-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="skeleton-shimmer" style="width: 140px; height: 22px; border-radius: 6px;"></div>
          <div class="skeleton-shimmer" style="width: 60px; height: 20px; border-radius: 99px;"></div>
        </div>
        <div class="skeleton-shimmer" style="width: 180px; height: 14px; border-radius: 4px; margin-top: 6px;"></div>
        <div style="display:flex; gap: 8px; margin-top: 10px;">
          <div class="skeleton-shimmer" style="width: 70px; height: 26px; border-radius: 6px;"></div>
          <div class="skeleton-shimmer" style="width: 90px; height: 26px; border-radius: 6px;"></div>
          <div class="skeleton-shimmer" style="width: 60px; height: 26px; border-radius: 6px;"></div>
        </div>
        <div class="skeleton-shimmer" style="width: 100%; height: 44px; border-radius: 10px; margin-top: 14px;"></div>
      </div>
      <div class="skeleton-card" style="opacity: 0.65;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="skeleton-shimmer" style="width: 120px; height: 22px; border-radius: 6px;"></div>
          <div class="skeleton-shimmer" style="width: 60px; height: 20px; border-radius: 99px;"></div>
        </div>
        <div class="skeleton-shimmer" style="width: 160px; height: 14px; border-radius: 4px; margin-top: 6px;"></div>
        <div style="display:flex; gap: 8px; margin-top: 10px;">
          <div class="skeleton-shimmer" style="width: 80px; height: 26px; border-radius: 6px;"></div>
          <div class="skeleton-shimmer" style="width: 70px; height: 26px; border-radius: 6px;"></div>
        </div>
        <div class="skeleton-shimmer" style="width: 100%; height: 44px; border-radius: 10px; margin-top: 14px;"></div>
      </div>
    `;
  }
  try {
    const meetups = await loadMeetupsByDate(selectedDate, !isFresh);
    renderMeetups(meetups);
    updateDailyPulse(meetups);
  } catch (e) {
    if (meetupEl && !cached) {
      meetupEl.innerHTML = `<p class="empty">資料讀取失敗，請稍後再試。</p>`;
    }
    console.error(e);
  }
}

function updateDailyPulse(meetups) {
  const banner = $("dailyPulseBanner");
  const textEl = $("pulseText");
  const iconEl = $("pulseIcon");
  if (!banner || !textEl || !iconEl) return;

  const currentList = Array.isArray(meetups) ? meetups : [];
  const dateFormatted = formatDate(selectedDate);

  if (currentList.length === 0) {
    iconEl.textContent = "💡";
    textEl.innerHTML = `<b>${escapeHtml(dateFormatted)}</b> 目前尚無開團，歡迎發起今日自揪或點選月曆探索！`;
    return;
  }

  let totalSlotsLeft = 0;
  currentList.forEach((m) => {
    const cap = m.capacity_override ?? m.capacity ?? 0;
    const confirmed = Number(m.confirmed_count || 0);
    const left = Math.max(0, cap - confirmed);
    totalSlotsLeft += left;
  });

  if (totalSlotsLeft > 0) {
    iconEl.textContent = "🔥";
    textEl.innerHTML = `<b>${escapeHtml(dateFormatted)}</b> 共有 <b>${currentList.length}</b> 場球聚，尚餘 <b>${totalSlotsLeft}</b> 席熱烈報名中！`;
  } else {
    iconEl.textContent = "🎉";
    textEl.innerHTML = `<b>${escapeHtml(dateFormatted)}</b> 共有 <b>${currentList.length}</b> 場球聚，目前全部額滿（可排備取），或發起自揪！`;
  }
}
function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}


function formatAnnouncementDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

async function loadAnnouncements() {
  const ann = $("announcementList");
  if (ann) ann.innerHTML = `<p class="empty">公告讀取中...</p>`;
  try {
    const { data, error } = await client
      .from("announcements")
      .select("id,title,content,author_name,created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    announcements = (data && data.length) ? data : [...fallbackAnnouncements];
  } catch (err) {
    console.error(err);
    announcements = [...fallbackAnnouncements];
  }
  renderAnnouncements();
}

function renderAnnouncements() {
  const ann = $("announcementList");
  if (ann) {
    ann.innerHTML = announcements.map((item, idx) => `
      <article class="notice-card">
        <span class="tag">公告 ${idx + 1}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="muted" style="white-space: pre-line;">${escapeHtml(item.content)}</p>
        <p class="muted" style="margin-top:10px;font-size:13px;font-weight:900;">${escapeHtml(item.author_name || "發起人")}${item.created_at ? ` · ${escapeHtml(formatAnnouncementDate(item.created_at))}` : ""}</p>
      </article>`).join("");
  }
}

// Image Lightbox System (點擊圖片全螢幕/放大檢視)
function openImageLightbox(src, title, desc) {
  if (!src) return;
  let modal = $("imageLightboxModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "imageLightboxModal";
    modal.className = "image-lightbox-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "放大圖片預覽");
    modal.innerHTML = `
      <div class="image-lightbox-backdrop" id="lightboxBackdrop"></div>
      <div class="image-lightbox-container">
        <button type="button" class="image-lightbox-close" id="lightboxCloseBtn" aria-label="關閉預覽">✕</button>
        <div class="image-lightbox-content">
          <img id="lightboxImg" src="" alt="放大預覽" class="image-lightbox-img" />
          <div class="image-lightbox-info">
            <h4 id="lightboxTitle" class="image-lightbox-title"></h4>
            <p id="lightboxDesc" class="image-lightbox-desc"></p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#lightboxBackdrop").addEventListener("click", closeImageLightbox);
    modal.querySelector("#lightboxCloseBtn").addEventListener("click", closeImageLightbox);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.style.display === "flex") {
        closeImageLightbox();
      }
    });
  }

  const imgEl = modal.querySelector("#lightboxImg");
  const titleEl = modal.querySelector("#lightboxTitle");
  const descEl = modal.querySelector("#lightboxDesc");

  if (imgEl) {
    imgEl.src = src;
    imgEl.alt = title || "放大預覽";
  }
  if (titleEl) titleEl.textContent = title || "";
  if (descEl) descEl.textContent = desc || "";

  modal.style.display = "flex";
  document.body.classList.add("modal-open");
}

function closeImageLightbox() {
  const modal = $("imageLightboxModal");
  if (modal) {
    modal.style.display = "none";
    if (!document.querySelector(".modal.show")) {
      document.body.classList.remove("modal-open");
    }
  }
}

function renderStaticContent() {
  renderAnnouncements();
  const know = $("knowledgeList");
  if (know) {
    know.innerHTML = knowledgeItems.map((item, idx) => `
      <article class="knowledge-card">
        <div class="knowledge-img-wrap" data-knowledge-idx="${idx}" title="點擊放大圖片">
          <img class="knowledge-img" src="${escapeHtml(item.image?.src || "")}" alt="${escapeHtml(item.image?.alt || item.title)}" loading="lazy" />
          <div class="knowledge-img-zoom-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            <span>點擊放大</span>
          </div>
        </div>
        <div class="knowledge-body">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="muted">${item.desc}</p>
          <div class="tag-row">${(item.tags || []).map(tag => `<span class="mini-tag">${escapeHtml(tag.k)}｜${escapeHtml(tag.v)}</span>`).join("")}</div>
        </div>
      </article>`).join("");

    know.querySelectorAll(".knowledge-img-wrap").forEach((wrap) => {
      wrap.addEventListener("click", () => {
        const idx = parseInt(wrap.dataset.knowledgeIdx, 10);
        const item = knowledgeItems[idx];
        if (item) {
          openImageLightbox(item.image?.src, item.title, item.desc);
        }
      });
    });
  }
}

function openTab(tabId) {
  document.querySelectorAll(".nav a").forEach(link => {
    link.classList.toggle("active", link.dataset.openTab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === tabId));
}

let currentUser = null;
let currentSystemMember = null;

function initAuthTabs() {
  const tabLogin = $("authTabLogin");
  const tabRegister = $("authTabRegister");
  const regFields = $("registerFields");
  if (!tabLogin || !tabRegister || !regFields) return;

  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabLogin.style.color = "var(--accent)";
    tabLogin.style.borderBottom = "2px solid var(--accent)";
    tabRegister.classList.remove("active");
    tabRegister.style.color = "var(--sub)";
    tabRegister.style.borderBottom = "none";
    regFields.style.display = "none";
  });

  tabRegister.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabRegister.style.color = "var(--accent)";
    tabRegister.style.borderBottom = "2px solid var(--accent)";
    tabLogin.classList.remove("active");
    tabLogin.style.color = "var(--sub)";
    tabLogin.style.borderBottom = "none";
    regFields.style.display = "flex";
  });
}

async function ensureSystemMember(user) {
  let defaultName = user.user_metadata?.full_name || user.user_metadata?.name || user.raw_user_meta_data?.name || user.user_metadata?.nickname;
  if (!defaultName) {
    if (user.email && !user.email.startsWith("line_")) {
      defaultName = user.email.split("@")[0];
    } else {
      defaultName = "球友";
    }
  }
  
  let lineUserId = null;
  const metaSub = user.raw_user_meta_data?.sub || user.user_metadata?.sub;
  if (metaSub && typeof metaSub === "string" && metaSub.startsWith("U") && metaSub.length === 33) {
    lineUserId = metaSub;
  }
  
  if (!lineUserId && user.user_metadata?.line_user_id) {
    lineUserId = user.user_metadata.line_user_id;
  }

  if (!lineUserId) {
    const identId = user.identities?.[0]?.identity_id;
    if (identId && typeof identId === "string" && identId.startsWith("U") && identId.length === 33) {
      lineUserId = identId;
    }
  }
  
  if (!lineUserId) {
    lineUserId = user.raw_user_meta_data?.sub || user.user_metadata?.sub || user.identities?.[0]?.identity_id || null;
  }

  // 1. 優先以 Auth user.id 查詢
  let data = null;
  const { data: userById } = await client
    .from("users")
    .select("id, name, phone, line_user_id, skill_level, is_beginner, rating")
    .eq("id", user.id)
    .maybeSingle();

  if (userById) {
    data = userById;
  } else if (lineUserId) {
    // 2. 若以 ID 查無資料，但有 LINE User ID，比對既有已匯入/已綁定的球友 (防止 duplicate key 衝突)
    const { data: userByLine } = await client
      .from("users")
      .select("id, name, phone, line_user_id, skill_level, is_beginner, rating")
      .eq("line_user_id", lineUserId)
      .maybeSingle();
    if (userByLine) {
      data = userByLine;
    }
  }

  if (!data) {
    const defaultPhone = user.user_metadata?.phone || null;
    const { data: inserted, error: insertError } = await client
      .from("users")
      .insert({ id: user.id, name: defaultName, phone: defaultPhone, line_user_id: lineUserId })
      .select()
      .single();
    if (insertError) {
      console.error("Error creating user record:", insertError);
      // 若因 line_user_id unique 衝突，再次嘗試以 line_user_id 取得既有球友資料
      if (insertError.code === "23505" && lineUserId) {
        const { data: retryUser } = await client
          .from("users")
          .select("id, name, phone, line_user_id, skill_level, is_beginner, rating")
          .eq("line_user_id", lineUserId)
          .maybeSingle();
        if (retryUser) return { ...retryUser, nickname: retryUser.name };
      }
      return null;
    }
    return { ...inserted, nickname: inserted.name };
  } else {
    const shouldUpdateName = (data.name === "球友" || !data.name) && defaultName && defaultName !== "球友";
    const hasValidLineId = data.line_user_id && typeof data.line_user_id === "string" && data.line_user_id.startsWith("U") && data.line_user_id.length === 33;
    const hasNewValidLineId = lineUserId && typeof lineUserId === "string" && lineUserId.startsWith("U") && lineUserId.length === 33;
    const shouldUpdateLine = hasNewValidLineId && (!hasValidLineId || lineUserId !== data.line_user_id);

    if (shouldUpdateName || shouldUpdateLine) {
      try {
        const { data: updated } = await client
          .from("users")
          .update({ 
            name: shouldUpdateName ? defaultName : data.name, 
            line_user_id: shouldUpdateLine ? lineUserId : data.line_user_id,
            updated_at: new Date().toISOString()
          })
          .eq("id", data.id)
          .select()
          .maybeSingle();
        if (updated) return { ...updated, nickname: updated.name };
      } catch (err) {
        console.warn("Update member record non-fatal warning:", err);
      }
    }
  }
  return { ...data, nickname: data.name };
}

let activeMemberTab = "clubs";
let lastEloTrend = [];
let cachedMemberUserIds = [];
let hasQueriedMatchRecords = false;

async function loadMemberMatchRecords(targetIds) {
  const allUserIds = (targetIds && targetIds.length > 0) ? targetIds : cachedMemberUserIds;
  const matchHistoryList = $("matchHistoryList");
  const matchStatsSummary = $("matchStatsSummary");

  if (!allUserIds || allUserIds.length === 0) {
    lastEloTrend = [];
    if (matchStatsSummary) matchStatsSummary.textContent = "0 場 ｜ 0勝 0敗 (勝率 0%)";
    if (matchHistoryList) {
      matchHistoryList.innerHTML = `
        <div class="empty-view-box">
          <span class="empty-icon">⚔️</span>
          <div class="empty-title">目前尚無任何積分對抗戰績</div>
          <div class="empty-desc">參加俱樂部的對抗賽並完成結算後，戰績將自動呈現在此！</div>
        </div>
      `;
    }
    drawEloChart([]);
    return;
  }

  let matches = [];
  try {
    const orFilterV2 = allUserIds.map(id => `team_a_user_ids.cs.{${id}},team_b_user_ids.cs.{${id}}`).join(",");
    const { data: v2Data } = await client
      .from("session_matches")
      .select("id, court_number, team_a_user_ids, team_b_user_ids, score_a, score_b, winner, rating_change, created_at, session:sessions(session_date, meetup_id, meetups(name, organizers(name)))")
      .or(orFilterV2)
      .order("created_at", { ascending: true });

    if (v2Data && v2Data.length > 0) {
      matches = v2Data.map(m => ({
        id: m.id,
        meetup_id: m.session?.meetup_id,
        reservation_date: m.session?.session_date,
        court_number: m.court_number,
        player_a1_id: m.team_a_user_ids?.[0],
        player_a2_id: m.team_a_user_ids?.[1],
        player_b1_id: m.team_b_user_ids?.[0],
        player_b2_id: m.team_b_user_ids?.[1],
        score_a: m.score_a,
        score_b: m.score_b,
        rating_change: m.rating_change,
        created_at: m.created_at,
        meetups: m.session?.meetups
      }));
    } else {
      const idsFilter = allUserIds.map(id => `"${id}"`).join(",");
      const orFilter = `player_a1_id.in.(${idsFilter}),player_a2_id.in.(${idsFilter}),player_b1_id.in.(${idsFilter}),player_b2_id.in.(${idsFilter})`;
      const { data: v1Data } = await client
        .from("session_match_records")
        .select(`id, meetup_id, reservation_date, court_number, player_a1_id, player_a2_id, player_b1_id, player_b2_id, score_a, score_b, rating_change, created_at, meetups(name, organizers(name))`)
        .or(orFilter)
        .order("created_at", { ascending: true });
      if (v1Data) matches = v1Data;
    }
  } catch (err) {
    console.warn("Matches fetch notice:", err);
  }

    if (matches && matches.length > 0) {
      let currentElo = 1000;
      const eloTrend = [{ elo: 1000, date: "" }];
      const renderedMatches = [];
      let calcWins = 0;
      let calcLosses = 0;

      const playerNamesMap = new Map();
      const playerIdsQuery = [];
      matches.forEach(m => {
        [m.player_a1_id, m.player_a2_id, m.player_b1_id, m.player_b2_id].forEach(id => {
          if (id && !playerNamesMap.has(id)) {
            playerNamesMap.set(id, "");
            playerIdsQuery.push(id);
          }
        });
      });

      if (playerIdsQuery.length > 0) {
        const { data: usersData } = await client.from("users").select("id, name").in("id", playerIdsQuery);
        (usersData || []).forEach(x => {
          playerNamesMap.set(x.id, x.name);
        });
      }

      matches.forEach((m, index) => {
        const isTeamA = allUserIds.includes(m.player_a1_id) || allUserIds.includes(m.player_a2_id);
        
        let partnerName = "";
        let opponent1Name = "";
        let opponent2Name = "";
        let myScore = 0;
        let oppScore = 0;

        if (isTeamA) {
          partnerName = m.player_a2_id ? (playerNamesMap.get(m.player_a2_id) || "隊友") : "";
          opponent1Name = playerNamesMap.get(m.player_b1_id) || "對手A";
          opponent2Name = m.player_b2_id ? (playerNamesMap.get(m.player_b2_id) || "對手B") : "";
          myScore = m.score_a;
          oppScore = m.score_b;
        } else {
          partnerName = m.player_b2_id ? (playerNamesMap.get(m.player_b2_id) || "隊友") : "";
          opponent1Name = playerNamesMap.get(m.player_a1_id) || "對手A";
          opponent2Name = m.player_a2_id ? (playerNamesMap.get(m.player_a2_id) || "對手B") : "";
          myScore = m.score_b;
          oppScore = m.score_a;
        }

        let outcome = "TIE";
        if (myScore > oppScore) outcome = "WIN";
        else if (myScore < oppScore) outcome = "LOSS";

        if (outcome === "WIN") calcWins++;
        else if (outcome === "LOSS") calcLosses++;

        const change = m.rating_change || 0;
        if (outcome === "WIN") currentElo += change;
        else if (outcome === "LOSS") currentElo -= change;

        eloTrend.push({
          elo: currentElo,
          date: m.reservation_date ? m.reservation_date.slice(5) : `第${index + 1}場`
        });

        const isWin = outcome === "WIN";
        const badgeStyle = isWin
          ? "background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 6px;"
          : "background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 6px;";
        const changeColor = isWin ? "#1d4ed8" : "#64748b";
        const changeSymbol = isWin ? `+${change}` : (change > 0 ? `-${change}` : `${change}`);

        const clubPrefix = m.meetups?.organizers?.name ? `[${m.meetups.organizers.name}] ` : "";
        const formattedDate = m.reservation_date ? m.reservation_date.replace(/-/g, "/") : "";
        const partnerStr = partnerName ? ` + ${partnerName}` : "";
        const opponentsStr = opponent2Name ? `${opponent1Name} + ${opponent2Name}` : opponent1Name;

        renderedMatches.unshift(`
          <div class="match-history-row" style="display:flex; flex-direction:row; align-items:center; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:14px; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,0.01)">
            <div style="flex:1">
              <div style="display:flex; align-items:center; justify-content:space-between">
                <div style="display:flex; align-items:center; gap:8px">
                  <span style="${badgeStyle}">${outcome === "WIN" ? "勝" : (outcome === "LOSS" ? "敗" : "平")}</span>
                  <span style="font-size:15px; font-weight:800; color:#0f172a">${myScore} : ${oppScore}</span>
                </div>
                <span style="font-size:14px; font-weight:800; color:${changeColor}">${changeSymbol} 分</span>
              </div>
              <div style="font-size:13px; color:#475569; font-weight:700; margin-top:8px; display:flex; gap:6px; flex-wrap:wrap">
                <span>我${partnerStr}</span>
                <span style="color:#94a3b8">vs</span>
                <span>${opponentsStr}</span>
              </div>
              <div style="font-size:11px; color:#94a3b8; font-weight:600; margin-top:6px">
                📅 ${formattedDate} ｜ 🎾 ${escapeHtml(clubPrefix + (m.meetups?.name || "計分對戰"))} (第 ${m.court_number} 場)
              </div>
            </div>
          </div>
        `);
      });

      lastEloTrend = eloTrend;
      const winRate = matches.length > 0 ? ((calcWins / matches.length) * 100).toFixed(0) + "%" : "0%";
      if (matchStatsSummary) {
        matchStatsSummary.textContent = `${matches.length} 場 ｜ ${calcWins}勝 ${calcLosses}敗 (勝率 ${winRate})`;
      }
      if (matchHistoryList) {
        matchHistoryList.innerHTML = renderedMatches.join("");
      }

      drawEloChart(eloTrend);
    } else {
      lastEloTrend = [];
      if (matchStatsSummary) {
        matchStatsSummary.textContent = "0 場 ｜ 0勝 0敗 (勝率 0%)";
      }
      if (matchHistoryList) {
        matchHistoryList.innerHTML = `
          <div class="empty-view-box">
            <span class="empty-icon">⚔️</span>
            <div class="empty-title">目前尚無任何積分對抗戰績</div>
            <div class="empty-desc">參加俱樂部的對抗賽並完成結算後，戰績將自動呈現在此！</div>
          </div>
        `;
      }
      drawEloChart([]);
    }
  } catch (err) {
    if (err?.code !== "PGRST205" && !String(err?.message || "").includes("schema cache")) {
      console.warn("Match records notice:", err?.message || err);
    }
  }
}

function switchMemberTab(tab) {
  if (tab === "stats") tab = "clubs";
  activeMemberTab = tab;
  document.querySelectorAll(".member-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  const panels = {
    clubs: $("tabPanelClubs"),
    bookings: $("tabPanelBookings"),
    pickups: $("tabPanelPickups"),
    stats: $("tabPanelStats")
  };
  Object.entries(panels).forEach(([key, el]) => {
    if (el) el.style.display = (key === tab) ? "block" : "none";
  });
  if (tab === "stats") {
    if (!hasQueriedMatchRecords) {
      hasQueriedMatchRecords = true;
      loadMemberMatchRecords(cachedMemberUserIds);
    } else {
      setTimeout(() => {
        if (lastEloTrend && typeof drawEloChart === "function") {
          drawEloChart(lastEloTrend);
        }
      }, 60);
    }
  }
}

function initMemberTabs() {
  const tabsNav = $("memberTabsNav");
  if (!tabsNav) return;
  tabsNav.querySelectorAll(".member-tab-btn").forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.tab;
      switchMemberTab(tab);
    };
  });
}

function initSkillChips() {
  const chipsRow = $("skillChipsRow");
  if (!chipsRow) return;
  chipsRow.querySelectorAll(".skill-chip-btn").forEach(btn => {
    btn.onclick = () => {
      chipsRow.querySelectorAll(".skill-chip-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if ($("profileSkillLevel")) {
        $("profileSkillLevel").value = btn.dataset.value;
      }
    };
  });
}

function drawEloChart(trend) {
  const container = $("eloChartContainer");
  if (!container) return;

  if (!trend || trend.length < 2) {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; gap:8px;">
        <span style="font-size:32px;">📊</span>
        <p style="color:var(--muted); font-style:italic; font-size:13.5px; font-weight:600; text-align:center;">需要至少 2 場對抗賽數據才能顯示積分走勢。</p>
      </div>
    `;
    return;
  }

  const width = Math.min(640, container.clientWidth || 340);
  const height = 190;
  const paddingLeft = 42;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 32;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const elos = trend.map(t => t.elo);
  const minElo = Math.min(...elos) - 15;
  const maxElo = Math.max(...elos) + 15;
  const range = maxElo - minElo || 40;
  const pointsCount = trend.length;

  const coords = trend.map((t, idx) => {
    const x = paddingLeft + (idx / (pointsCount - 1)) * chartWidth;
    const y = height - paddingBottom - ((t.elo - minElo) / range) * chartHeight;
    return { x, y, elo: t.elo, date: t.date };
  });

  const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(" ");
  const polygonPoints = `${coords[0].x},${height - paddingBottom} ` + polylinePoints + ` ${coords[coords.length - 1].x},${height - paddingBottom}`;

  // Grid lines
  let gridsHtml = "";
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const val = Math.round(minElo + (i / gridCount) * range);
    const y = height - paddingBottom - (i / gridCount) * chartHeight;
    gridsHtml += `
      <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="4 4" stroke-width="1"/>
      <text x="${paddingLeft - 8}" y="${y + 4}" fill="#94a3b8" font-size="10" text-anchor="end" font-weight="bold">${val}</text>
    `;
  }

  // Dots
  let dotsHtml = "";
  coords.forEach((c, idx) => {
    let dotColor = "#2563eb";
    if (idx > 0) {
      const prevElo = coords[idx - 1].elo;
      if (c.elo > prevElo) dotColor = "#3b82f6";
      else if (c.elo < prevElo) dotColor = "#ef4444";
    }
    dotsHtml += `
      <circle cx="${c.x}" cy="${c.y}" r="4.5" fill="${dotColor}" stroke="#ffffff" stroke-width="2" style="cursor:pointer;">
        <title>${idx === 0 ? "初始積分" : `第 ${idx} 局`}: ${c.elo} 分${c.date ? ` (${c.date})` : ""}</title>
      </circle>
    `;
  });

  let xLabelsHtml = "";
  const labelInterval = Math.max(1, Math.ceil(pointsCount / 6));
  coords.forEach((c, idx) => {
    if (idx % labelInterval === 0 || idx === pointsCount - 1) {
      xLabelsHtml += `
        <text x="${c.x}" y="${height - 10}" fill="#94a3b8" font-size="9.5" text-anchor="middle" font-weight="bold">${idx === 0 ? "起點" : `局${idx}`}</text>
      `;
    }
  });

  const svgHtml = `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow:visible; display:block;">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2563eb" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#2563eb" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      ${gridsHtml}
      <polygon points="${polygonPoints}" fill="url(#chartGrad)"/>
      <polyline points="${polylinePoints}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${xLabelsHtml}
      ${dotsHtml}
    </svg>
  `;

  container.innerHTML = svgHtml;
}

window.renderMemberBookingsUI = function(targetContainer) {
  const container = targetContainer || $("userBookingsList");
  if (!container || !window._allMemberBookings) return;

  const data = window._allMemberBookings;
  const currentFilter = window._currentBookingFilter || "all";
  const displayItems = data[currentFilter] || data.all || [];

  if (data.all.length === 0) {
    container.innerHTML = `
      <div class="empty-view-box">
        <span class="empty-icon">📅</span>
        <div class="empty-title">目前無任何預約紀錄</div>
        <div class="empty-desc">歡迎至「立即預約」挑選心儀場次進行報名！</div>
      </div>
    `;
    return;
  }

  // 1. Subfilter bar
  let html = `
    <div class="booking-subfilter-bar">
      <button type="button" class="subfilter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="window.switchBookingFilter('all')">
        全部 (${data.all.length})
      </button>
      <button type="button" class="subfilter-btn ${currentFilter === 'upcoming' ? 'active' : ''}" onclick="window.switchBookingFilter('upcoming')">
        即將到來 (${data.upcoming.length})
      </button>
      <button type="button" class="subfilter-btn ${currentFilter === 'past' ? 'active' : ''}" onclick="window.switchBookingFilter('past')">
        歷史場次 (${data.past.length})
      </button>
    </div>
  `;

  // 2. Empty state for selected filter
  if (displayItems.length === 0) {
    if (currentFilter === "upcoming") {
      html += `
        <div class="empty-view-box" style="padding: 32px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px;">
          <span class="empty-icon" style="font-size: 32px;">⏰</span>
          <div class="empty-title" style="font-size: 15px; margin-top: 6px;">目前沒有即將到來的預約</div>
          <div class="empty-desc" style="font-size: 13px; max-width: 380px;">您目前所有的預約場次均已順利結束。歡迎前往首頁挑選全新場次！</div>
          <a href="/#meetupsSection" class="btn-primary" style="margin-top: 14px; font-size: 13px; padding: 8px 18px; border-radius: 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
            🔍 探索最新活動場次
          </a>
        </div>
      `;
    } else {
      html += `
        <div class="empty-view-box" style="padding: 32px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px;">
          <span class="empty-icon" style="font-size: 32px;">📅</span>
          <div class="empty-title" style="font-size: 15px;">此分類目前無預約紀錄</div>
        </div>
      `;
    }
    container.innerHTML = html;
    return;
  }

  // 3. Render Card List
  html += `<div class="booking-cards-list" style="display: flex; flex-direction: column; gap: 12px;">`;

  displayItems.forEach(s => {
    // Date Tile
    let monthStr = "--";
    let dayStr = "--";
    let weekdayStr = "";
    if (s.dateStr) {
      const d = dateFromISO(s.dateStr);
      monthStr = `${d.getMonth() + 1}月`;
      dayStr = d.getDate();
      weekdayStr = (typeof weekdaysFull !== 'undefined' && weekdaysFull[d.getDay()]) ? weekdaysFull[d.getDay()] : "";
    }

    // Status Badge
    let statusClass = "status-confirmed";
    let statusText = "✓ 正取";
    if (s.isAttended) {
      statusClass = "status-attended";
      statusText = "✓ 已出席";
    } else if (s.isPast) {
      statusClass = "status-past";
      statusText = "🏁 已結束";
    } else if (s.status === "confirmed") {
      statusClass = "status-confirmed";
      statusText = "✓ 正取";
    } else if (s.is_tentative) {
      statusClass = "status-tentative";
      statusText = "⏳ 彈性候補";
    } else if (s.status === "waitlist") {
      statusClass = "status-waitlist";
      statusText = "⌛ 候補中";
    } else {
      statusClass = "status-other";
      statusText = escapeHtml(s.status);
    }

    // Time Text
    let timeStr = "";
    if (s.startTime && s.endTime) {
      timeStr = `${s.startTime} - ${s.endTime}`;
    } else if (s.startTime) {
      timeStr = `${s.startTime} 開始`;
    } else {
      timeStr = "時間另行公告";
    }

    // Location & Map
    const mObj = s.meetup || s.meetups || {};
    const address = mObj.address || "";
    const city = mObj.city || "";
    const venueText = address || city || "球館/場地另行通知";
    let mapChipHtml = "";
    if (address && address.trim()) {
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      mapChipHtml = `
        <a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="booking-map-chip" title="開啟 Google 地圖導航">
          導航 ↗
        </a>
      `;
    }

    // Fee & Payment
    const feeVal = mObj.member_fee || mObj.guest_fee;
    const feeLabel = feeVal ? `$${feeVal}/人` : "現場收費";
    let methodLabel = "";
    if (s.payment_method === "wallet") {
      methodLabel = "點數扣款";
    } else if (s.payment_method === "cash") {
      methodLabel = "現場付現";
    } else if (s.payment_method) {
      methodLabel = escapeHtml(s.payment_method);
    }
    const paymentFeeText = methodLabel ? `${feeLabel} · ${methodLabel}` : feeLabel;

    const paidBadgeHtml = s.is_paid ? `<span class="badge-micro-paid">已繳費</span>` : "";
    const attendedBadgeHtml = s.arrived_count > 0 ? `<span class="badge-micro-attended">已簽到扣點</span>` : "";

    // Note Box
    const noteHtml = s.note ? `<div class="booking-note-box">💬 備註：${escapeHtml(s.note)}</div>` : "";

    // Footer & Actions
    let footerTipHtml = "";
    let actionButtonsHtml = "";

    if (s.isPast) {
      footerTipHtml = `<span class="booking-tip-text muted">此場次活動已圓滿結束</span>`;
    } else if (s.is_tentative) {
      footerTipHtml = `<span class="booking-tip-text tentative">已為您保留候補資格，請確認出席</span>`;
      if (!s.blockCheck.blocked && s.arrived_count === 0) {
        actionButtonsHtml += `
          <button type="button" class="btn-booking-cancel" onclick="cancelMemberDashboardSignup('${s.id}', '${escapeHtml(s.meetupName)}')">
            取消預約
          </button>
        `;
      }
      actionButtonsHtml += `
        <button type="button" class="btn-booking-promote" onclick="promoteTentative('${s.id}')">
          確認出席轉正 ➔
        </button>
      `;
    } else if (s.status === "waitlist") {
      footerTipHtml = `<span class="booking-tip-text hint">排隊候補中，若有名額釋出將依序自動轉正</span>`;
      if (!s.blockCheck.blocked && s.arrived_count === 0) {
        actionButtonsHtml = `
          <button type="button" class="btn-booking-cancel" onclick="cancelMemberDashboardSignup('${s.id}', '${escapeHtml(s.meetupName)}')">
            退出候補
          </button>
        `;
      }
    } else {
      // Confirmed upcoming
      if (!s.blockCheck.blocked && s.arrived_count === 0) {
        footerTipHtml = `<span class="booking-tip-text hint">開賽前可線上免費取消預約</span>`;
        actionButtonsHtml = `
          <button type="button" class="btn-booking-cancel" onclick="cancelMemberDashboardSignup('${s.id}', '${escapeHtml(s.meetupName)}')">
            取消預約
          </button>
        `;
      } else if (s.arrived_count > 0) {
        footerTipHtml = `<span class="booking-tip-text attended">您已完成現場簽到出席</span>`;
      } else {
        footerTipHtml = `<span class="booking-tip-text warn">⚠️ ${s.blockCheck.reason || "已逾線上取消時限，如需請假請聯繫主辦方"}</span>`;
      }
    }

    html += `
      <div class="booking-item-card ${s.isPast ? 'is-past' : 'is-upcoming'}">
        <div class="booking-card-top">
          <!-- Calendar Date Tile -->
          <div class="booking-date-tile ${s.isPast ? 'is-past' : ''}">
            <span class="date-tile-month">${monthStr}</span>
            <span class="date-tile-day">${dayStr}</span>
            <span class="date-tile-weekday">${weekdayStr}</span>
          </div>

          <!-- Main Info Column -->
          <div class="booking-card-main-col">
            <!-- Title & Status Badge -->
            <div class="booking-card-title-row">
              <h4 class="booking-meetup-title">${escapeHtml(s.meetupName)}</h4>
              <span class="booking-status-badge ${statusClass}">${statusText}</span>
            </div>

            <!-- Meta Chips -->
            <div class="booking-info-chips">
              <span class="booking-info-item">
                <span class="chip-icon">⏰</span>
                <span>${timeStr}</span>
              </span>

              <span class="booking-info-item">
                <span class="chip-icon">📍</span>
                <span title="${escapeHtml(venueText)}">${escapeHtml(venueText)}</span>
                ${mapChipHtml}
              </span>

              <span class="booking-info-item">
                <span class="chip-icon">👥</span>
                <span>報名 <strong>${s.people_count || 1}</strong> 人</span>
              </span>

              <span class="booking-info-item">
                <span class="chip-icon">💰</span>
                <span>${paymentFeeText}</span>
                ${paidBadgeHtml}
                ${attendedBadgeHtml}
              </span>
            </div>

            ${noteHtml}
          </div>
        </div>

        <!-- Footer Row -->
        <div class="booking-card-footer">
          <div>${footerTipHtml}</div>
          ${actionButtonsHtml ? `<div class="booking-actions-group">${actionButtonsHtml}</div>` : ''}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
};

window.switchBookingFilter = function(filterType) {
  window._currentBookingFilter = filterType;
  window.renderMemberBookingsUI();
};

async function loadMemberDashboard() {
  if (!currentUser || !currentSystemMember) return;
  try {
  
  if ($("dashboardNickname")) $("dashboardNickname").textContent = currentSystemMember.nickname || "球友";
  if ($("dashboardPhone")) $("dashboardPhone").textContent = currentSystemMember.phone || "未設定";
  if ($("dashboardMemberId")) $("dashboardMemberId").textContent = currentSystemMember.id;
  if ($("memberQrImg")) $("memberQrImg").src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentSystemMember.id}`;

  const phoneWarningBanner = $("phoneWarningBanner");
  if (phoneWarningBanner) {
    if (!currentSystemMember.phone) {
      phoneWarningBanner.style.display = "flex";
    } else {
      phoneWarningBanner.style.display = "none";
    }
  }

  const avatarEl = $("dashboardAvatar");
  if (avatarEl) {
    const firstChar = (currentSystemMember.nickname || "球").charAt(0).toUpperCase();
    avatarEl.textContent = firstChar;
  }
  
  if ($("profileNickname")) $("profileNickname").value = currentSystemMember.nickname || "";
  if ($("profilePhone")) $("profilePhone").value = currentSystemMember.phone || "";
  const userSkill = currentSystemMember.skill_level || "normal";
  if ($("profileSkillLevel")) $("profileSkillLevel").value = userSkill;
  document.querySelectorAll("#skillChipsRow .skill-chip-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === userSkill);
  });

  const cleanPh = cleanPhone(currentSystemMember.phone);

  // ==========================================
  // Wave 1: 核心資料平行並發請求 (Promise.all)
  // ==========================================
  const pClubs = (async () => {
    const { data: rows } = await client
      .from("organizer_members")
      .select("id, balance, member_type, status, note, organizer:organizers(id, name)")
      .eq("user_id", currentSystemMember.id);
    return (rows || []).map(r => ({
      id: r.id,
      balance: Number(r.balance || 0),
      remaining_times: null,
      status: r.status,
      rating: currentSystemMember.rating || 1000,
      organizers: r.organizer || { id: "", name: "特約球隊" }
    }));
  })();

  const pBookings = (async () => {
    try {
      const { data: signups, error: signupsError } = await client
        .from("session_participants")
        .select(`
          id,
          status,
          people_count,
          payment_method,
          is_paid,
          arrived_count,
          note,
          created_at,
          session:sessions (
            id,
            session_date,
            meetup:meetups (
              id,
              name,
              start_time,
              end_time,
              address,
              city,
              guest_fee,
              member_fee,
              cancel_deadline_hours,
              capacity
            )
          )
        `)
        .eq("user_id", currentSystemMember.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (signupsError || !signups) {
        console.warn("pBookings query note:", signupsError);
        return [];
      }

      return signups.map(s => ({
        id: s.id,
        status: s.status,
        people_count: s.people_count || 1,
        payment_method: s.payment_method || "",
        is_paid: !!s.is_paid,
        arrived_count: s.arrived_count || (s.status === "attended" ? (s.people_count || 1) : 0),
        note: s.note || "",
        is_tentative: s.status === "tentative" || !!s.is_tentative,
        created_at: s.created_at,
        reservation_date: s.session?.session_date || "",
        meetup_id: s.session?.meetup?.id,
        meetup: s.session?.meetup || { id: "", name: "球敘活動" },
        meetups: s.session?.meetup || { id: "", name: "球敘活動" }
      }));
    } catch (err) {
      console.error("pBookings exception:", err);
      return [];
    }
  })();

  const pPickups = Promise.resolve({ myMeetups: [], signupsByMeetup: {} });
  const pSignupIds = Promise.resolve([]);
  const pFallbackRating = Promise.resolve(currentSystemMember.rating || 1000);

  const [clubMembers, upcomingSignups, pickupsData, userSignupIds, fallbackRating] = await Promise.all([
    pClubs,
    pBookings,
    pPickups,
    pSignupIds,
    pFallbackRating
  ]);

  // Update badge for Clubs
  const badgeClubs = $("badgeClubsCount");
  if (badgeClubs) {
    badgeClubs.textContent = clubMembers.length;
    badgeClubs.style.display = clubMembers.length > 0 ? "inline-flex" : "none";
  }

  // 取得並顯示會員/球友的最新戰力積分 (若有多個團，以最高分數顯示在個人主卡片)
  let userRating = null;
  if (clubMembers && clubMembers.length > 0) {
    const ratings = clubMembers.map(m => m.rating).filter(r => r !== null && r !== undefined);
    if (ratings.length > 0) {
      userRating = Math.max(...ratings);
    }
  }
  if (!userRating && fallbackRating) {
    userRating = fallbackRating;
  }

  if (userRating) {
    if ($("dashboardRating")) $("dashboardRating").textContent = userRating;
    if ($("dashboardDupr")) {
      const computedDupr = Math.max(2.0, 2.0 + (Number(userRating) - 1000) / 400);
      $("dashboardDupr").textContent = computedDupr.toFixed(2);
    }
    if ($("dashboardRatingPill")) $("dashboardRatingPill").style.display = "inline-flex";
    if ($("ratingInfoBanner")) $("ratingInfoBanner").style.display = "flex";
  } else {
    if ($("dashboardRatingPill")) $("dashboardRatingPill").style.display = "none";
    if ($("ratingInfoBanner")) $("ratingInfoBanner").style.display = "none";
  }

  const balancesList = $("balancesList");
  if (balancesList) {
    balancesList.innerHTML = "";
    
    let lowBalanceDetected = false;

    if (clubMembers.length === 0) {
      balancesList.innerHTML = `
        <div class="empty-view-box">
          <span class="empty-icon">🏢</span>
          <div class="empty-title">尚未加入任何俱樂部或無會員紀錄</div>
          <div class="empty-desc">向球館教練或團主出示您的專屬 QR Code / 系統 ID，即可完成跨場儲值與卡位綁定！</div>
        </div>
      `;
    } else {
      clubMembers.forEach(m => {
        const isActive = m.status === "active";
        const clubName = m.organizers?.name || m.meetups?.organizers?.name || m.meetups?.name || "未知俱樂部";
        const balanceVal = m.balance !== undefined ? m.balance : (m.remaining_times * 200);
        
        let feeVal = 200;
        if (m.member_meetup_subscriptions && m.member_meetup_subscriptions.length > 0) {
          const prices = m.member_meetup_subscriptions.map(s => s.meetups?.member_price || 200);
          feeVal = Math.max(...prices);
        } else if (m.meetups?.member_price !== undefined) {
          feeVal = m.meetups.member_price;
        }
        
        // 僅對「活躍」會員進行餘額不足的卡位警示
        const isLow = isActive && (balanceVal < feeVal);
        if (isLow) lowBalanceDetected = true;

        const ratingVal = m.rating !== null && m.rating !== undefined ? m.rating : 1000;
        const duprVal = (ratingVal / 500).toFixed(2);

        const div = document.createElement("div");
        div.className = `wallet-item-card ${isActive ? 'active-wallet' : 'inactive-wallet'}`;
        div.style.background = "#ffffff";
        div.style.border = "1px solid #f1f5f9";
        div.style.boxShadow = "0 4px 12px rgba(15,23,42,0.03)";
        div.style.borderRadius = "18px";
        div.style.padding = "16px";
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.gap = "14px";
        div.style.marginTop = "12px";

        div.innerHTML = `
          <!-- Header Row -->
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
              <!-- Circle Initials Icon -->
              <div style="width: 38px; height: 38px; border-radius: 50%; background: ${isActive ? 'rgba(37, 99, 235, 0.08)' : '#f1f5f9'}; border: 1px solid ${isActive ? 'rgba(37, 99, 235, 0.2)' : '#e2e8f0'}; display: flex; align-items: center; justify-content: center; color: ${isActive ? '#2563eb' : '#64748b'}; font-weight: 900; font-size: 15px; flex-shrink: 0;">
                ${escapeHtml(clubName.charAt(0))}
              </div>
              <div style="display: flex; flex-direction: column; min-width: 0;">
                <span style="font-weight: 900; font-size: 16px; color: ${isActive ? '#0f172a' : '#64748b'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(clubName)}</span>
                <span style="font-size: 11px; color: ${isActive ? '#2563eb' : '#94a3b8'}; font-weight: 700; margin-top: 2px;">${isActive ? '🔵 使用中' : '⚪ 已停用'}</span>
              </div>
            </div>
          </div>
          
          <!-- Balance Row -->
          <div style="display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 14px 0; width: 100%;">
            <span style="font-size: 11px; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">儲值餘額</span>
            <span style="font-size: 20px; font-weight: 900; color: #2563eb; white-space: nowrap;">
              ${balanceVal} <span style="font-size: 12px; font-weight: 700; color: #94a3b8;">點</span>
            </span>
          </div>

          ${isLow ? `
            <div style="color: var(--danger); font-size: 12px; font-weight: 700; background: rgba(239, 68, 68, 0.05); padding: 8px; border-radius: 8px; text-align: center; width: 100%;">
              ⚠️ 餘額不足以支付下週預約，請儘速儲值
            </div>
          ` : ''}
          
          <button type="button" class="btn-secondary" style="width: 100%; font-size: 13px; border-radius: 10px; height: 36px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; cursor: pointer; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; transition: all 0.2s;" onclick="showTransactions('${m.id}', '${escapeHtml(clubName)}', '${m.payer_member_id || ''}')">
            🔍 交易明細
          </button>
        `;
        balancesList.appendChild(div);
      });
    }

    const warningBanner = $("balanceWarningBanner");
    if (warningBanner) {
      warningBanner.style.display = lowBalanceDetected ? "flex" : "none";
    }
  }

  const upcomingList = $("userBookingsList");
  if (upcomingList) {
    let bookingCount = 0;
    if (currentSystemMember?.id || cleanPh) {
      const rawList = upcomingSignups || [];
      const now = new Date();
      
      const processed = rawList.map(s => {
        const dateStr = s.reservation_date || "";
        const meetup = s.meetup || s.meetups || {};
        const meetupName = meetup.name || "匹克球活動";
        const startTime = meetup.start_time ? meetup.start_time.slice(0, 5) : "";
        const endTime = meetup.end_time ? meetup.end_time.slice(0, 5) : "";
        
        let isPast = false;
        if (dateStr) {
          const [yr, mo, dy] = dateStr.split("-").map(Number);
          const timeToCheck = (meetup.end_time || meetup.start_time || "23:59").slice(0, 5);
          const [h, min] = timeToCheck.split(":").map(Number);
          const sessionEnd = new Date(yr, mo - 1, dy, isNaN(h) ? 23 : h, isNaN(min) ? 59 : min, 0);
          isPast = now > sessionEnd;
        }
        
        const blockCheck = isCancelBlocked(meetup, dateStr);
        const isAttended = s.arrived_count > 0 || s.status === "attended";
        
        return {
          ...s,
          dateStr,
          meetup,
          meetups: meetup,
          meetupName,
          startTime,
          endTime,
          isPast,
          blockCheck,
          isAttended
        };
      });

      // Sort upcoming chronologically (soonest first), past reverse-chronologically (newest first)
      const upcomingItems = processed
        .filter(s => !s.isPast)
        .sort((a, b) => (a.dateStr + a.startTime).localeCompare(b.dateStr + b.startTime));
      const pastItems = processed
        .filter(s => s.isPast)
        .sort((a, b) => (b.dateStr + b.startTime).localeCompare(a.dateStr + a.startTime));
        
      window._allMemberBookings = {
        all: [...upcomingItems, ...pastItems],
        upcoming: upcomingItems,
        past: pastItems
      };
      
      bookingCount = processed.length;
      
      if (!window._currentBookingFilter) {
        window._currentBookingFilter = upcomingItems.length > 0 ? "upcoming" : "all";
      }
      
      window.renderMemberBookingsUI(upcomingList);
    } else {
      upcomingList.innerHTML = `
        <div class="empty-view-box">
          <span class="empty-icon">📱</span>
          <div class="empty-title">尚未綁定手機號碼</div>
          <div class="empty-desc">請在上方編輯個人資料填寫並儲存手機，以便讀取您的預約紀錄與出席狀態。</div>
        </div>
      `;
    }
    const badgeBookings = $("badgeBookingsCount");
    if (badgeBookings) {
      badgeBookings.textContent = bookingCount;
      badgeBookings.style.display = bookingCount > 0 ? "inline-flex" : "none";
    }
  }

  // 讀取我發起的自揪團
  const myPickupsList = $("myPickupsList");
  if (myPickupsList && currentSystemMember?.id) {
    try {
      const myMeetups = pickupsData?.myMeetups || [];
      const signupsByMeetup = pickupsData?.signupsByMeetup || {};

      const badgePickups = $("badgePickupsCount");
      if (badgePickups) {
        const count = myMeetups.length;
        badgePickups.textContent = count;
        badgePickups.style.display = count > 0 ? "inline-flex" : "none";
      }

      if (myMeetups.length === 0) {
        myPickupsList.innerHTML = `
          <div class="empty-view-box">
            <span class="empty-icon">🏓</span>
            <div class="empty-title">目前尚無自揪活動</div>
            <div class="empty-desc">點擊右上角「➕ 發起新揪團」邀請球友開打！</div>
          </div>
        `;
      } else {
        myPickupsList.innerHTML = myMeetups.map((m) => {
          const isEnded = m.start_date < toISODate(new Date());
          const mSignups = signupsByMeetup[String(m.id)] || [];
          const confirmedSignups = mSignups.filter(s => s.status === 'confirmed');
          const waitlistSignups = mSignups.filter(s => s.status === 'waitlist');
          const confirmedCount = confirmedSignups.reduce((sum, s) => sum + (s.people_count || 1), 0);
          
          let rosterText = `【${m.name}】${m.start_date} 名單：\n`;
          rosterText += `--- 正取 (${confirmedCount}/${m.capacity}人) ---\n`;
          if (confirmedSignups.length) {
            rosterText += confirmedSignups.map((s, idx) => `${idx + 1}. ${s.nickname || "球友"}${s.people_count > 1 ? ` (+${s.people_count - 1}人)` : ""}`).join("\n");
          } else {
            rosterText += "(無)";
          }
          if (waitlistSignups.length) {
            rosterText += `\n--- 備取 (${waitlistSignups.length}人) ---\n`;
            rosterText += waitlistSignups.map((s, idx) => `備${idx + 1}. ${s.nickname || "球友"}${s.people_count > 1 ? ` (+${s.people_count - 1}人)` : ""}`).join("\n");
          }

          let statusBadge = "";
          if (!m.is_active) {
            statusBadge = `<span class="status-badge" style="background:#fee2e2;color:#b91c1c;">已取消</span>`;
          } else if (isEnded) {
            statusBadge = `<span class="status-badge" style="background:#f1f5f9;color:#64748b;">已結束</span>`;
          } else {
            statusBadge = `<span class="status-badge confirmed">開團中 (${confirmedCount}/${m.capacity}人)</span>`;
          }

          const shareUrl = `${window.location.origin}/?date=${m.start_date}&meetup_id=${m.id}${m.join_password ? `&pwd=${encodeURIComponent(m.join_password)}` : ''}`;

          return `
            <div class="booking-item-card" style="flex-direction: column; align-items: stretch; gap: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="badge pickup-badge" style="font-size: 11px; padding: 2px 6px;">我的自揪</span>
                    ${m.join_password ? `<span class="badge" style="font-size: 11px; padding: 2px 6px; background:#fef3c7; color:#92400e; border:1px solid #fde68a;">🔒 密碼: ${escapeHtml(m.join_password)}</span>` : `<span class="badge" style="font-size: 11px; padding: 2px 6px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">🌐 公開團</span>`}
                    <strong style="font-size: 15px; color: var(--text);">${escapeHtml(m.name)}</strong>
                  </div>
                  <div style="font-size: 13px; color: var(--muted); margin-top: 4px;">
                    📅 ${escapeHtml(m.start_date)} ${m.start_time?.slice(0, 5)} ~ ${m.end_time?.slice(0, 5)} ｜ 📍 ${escapeHtml(m.city || "")} ${escapeHtml(m.address || "")}
                  </div>
                </div>
                ${statusBadge}
              </div>
              <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center; border-top: 1px dashed var(--line); padding-top: 8px; flex-wrap: wrap;">
                <button type="button" class="btn-secondary copy-link-btn" data-url="${escapeHtml(shareUrl)}" style="font-size: 12.5px; height: 32px; padding: 0 12px; border-radius: 8px; font-weight: 800; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8;">
                  🔗 複製連結
                </button>
                <button type="button" class="btn-secondary copy-roster-btn" data-roster="${escapeHtml(rosterText)}" style="font-size: 12.5px; height: 32px; padding: 0 12px; border-radius: 8px; font-weight: 800;">
                  📋 複製名單
                </button>
                ${m.is_active && !isEnded ? `
                  <button type="button" class="btn-secondary edit-pickup-btn" data-id="${m.id}" style="font-size: 12.5px; height: 32px; padding: 0 12px; border-radius: 8px; font-weight: 800; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8;">
                    ✏️ 編輯
                  </button>
                  <button type="button" class="btn-ghost cancel-pickup-btn" data-id="${m.id}" data-name="${escapeHtml(m.name)}" style="font-size: 12.5px; height: 32px; padding: 0 12px; border-radius: 8px; font-weight: 800; color: var(--red); border: 1px solid var(--red);">
                    ❌ 取消活動
                  </button>
                ` : ""}
              </div>
            </div>
          `;
        }).join("");

        myPickupsList.querySelectorAll(".copy-link-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const url = btn.dataset.url;
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url).then(() => {
                alert(`🎉 已複製專屬報名連結！可直接傳給朋友或貼到 LINE 群組：\n\n${url}`);
              }).catch(() => {
                prompt("請手動複製以下報名連結：", url);
              });
            } else {
              prompt("請手動複製以下報名連結：", url);
            }
          });
        });

        myPickupsList.querySelectorAll(".copy-roster-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const roster = btn.dataset.roster;
            navigator.clipboard.writeText(roster);
            alert("已複製活動名單到剪貼簿！");
          });
        });

        myPickupsList.querySelectorAll(".edit-pickup-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const mId = btn.dataset.id;
            const meetup = myMeetups.find(x => String(x.id) === String(mId));
            if (meetup) openEditPickupModal(meetup);
          });
        });

        myPickupsList.querySelectorAll(".cancel-pickup-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const meetupId = btn.dataset.id;
            const name = btn.dataset.name;
            if (!confirm(`確定要取消自揪活動「${name}」嗎？取消後球友將無法再預約。`)) return;
            try {
              btn.disabled = true;
              btn.textContent = "取消中...";
              const { data, error } = await client.rpc("cancel_member_pickup", {
                p_creator_member_id: currentSystemMember.id,
                p_meetup_id: Number(meetupId)
              });
              if (error) throw error;
              if (data && !data.ok) throw new Error(data.error || "取消失敗");
              alert("自揪活動已成功取消！");
              loadMemberDashboard();
            } catch (err) {
              console.error("取消自揪活動失敗:", err);
              alert(err.message || "取消失敗，請稍候重試");
              btn.disabled = false;
              btn.textContent = "❌ 取消活動";
            }
          });
        });
      }
    } catch (err) {
      console.warn("載入我的自揪團失敗:", err);
      myPickupsList.innerHTML = `<p style="color: var(--muted); font-size: 13px;">載入自揪團失敗，請稍候重試。</p>`;
    }
  }

  // 3. 讀取戰力走勢圖與歷史戰績
  const matchHistoryList = $("matchHistoryList");
  const matchStatsSummary = $("matchStatsSummary");

  const allUserIds = [];
  if (clubMembers && clubMembers.length > 0) {
    clubMembers.forEach(m => {
      if (m.id) allUserIds.push(m.id);
    });
  }
  if (userSignupIds && userSignupIds.length > 0) {
    userSignupIds.forEach(id => {
      allUserIds.push(id);
    });
  }

  cachedMemberUserIds = allUserIds;
  if (activeMemberTab === "stats" && allUserIds.length > 0) {
    let matches = [];
    try {
      const orFilterV2 = allUserIds.map(id => `team_a_user_ids.cs.{${id}},team_b_user_ids.cs.{${id}}`).join(",");
      const { data: v2Data } = await client
        .from("session_matches")
        .select("id, court_number, team_a_user_ids, team_b_user_ids, score_a, score_b, winner, rating_change, created_at, session:sessions(session_date, meetup_id, meetups(name, organizers(name)))")
        .or(orFilterV2)
        .order("created_at", { ascending: true });

      if (v2Data && v2Data.length > 0) {
        matches = v2Data.map(m => ({
          id: m.id,
          meetup_id: m.session?.meetup_id,
          reservation_date: m.session?.session_date,
          court_number: m.court_number,
          player_a1_id: m.team_a_user_ids?.[0],
          player_a2_id: m.team_a_user_ids?.[1],
          player_b1_id: m.team_b_user_ids?.[0],
          player_b2_id: m.team_b_user_ids?.[1],
          score_a: m.score_a,
          score_b: m.score_b,
          rating_change: m.rating_change,
          created_at: m.created_at,
          meetups: m.session?.meetups
        }));
      } else {
        const idsFilter = allUserIds.map(id => `"${id}"`).join(",");
        const orFilter = `player_a1_id.in.(${idsFilter}),player_a2_id.in.(${idsFilter}),player_b1_id.in.(${idsFilter}),player_b2_id.in.(${idsFilter})`;
        const { data: v1Data } = await client
          .from("session_match_records")
          .select(`id, meetup_id, reservation_date, court_number, player_a1_id, player_a2_id, player_b1_id, player_b2_id, score_a, score_b, rating_change, created_at, meetups(name, organizers(name))`)
          .or(orFilter)
          .order("created_at", { ascending: true });
        if (v1Data) matches = v1Data;
      }
    } catch (err) {
      console.warn("Matches fetch notice:", err);
    }

      if (matches && matches.length > 0) {
        // Process matches to compute ELO trend & win rate stats
        let currentElo = 1000;
        const eloTrend = [{ elo: 1000, date: "" }];
        const renderedMatches = [];
        let calcWins = 0;
        let calcLosses = 0;

        // Query names mapping
        const uniquePlayerIds = new Set();
        matches.forEach(m => {
          if (m.player_a1_id) uniquePlayerIds.add(m.player_a1_id);
          if (m.player_a2_id) uniquePlayerIds.add(m.player_a2_id);
          if (m.player_b1_id) uniquePlayerIds.add(m.player_b1_id);
          if (m.player_b2_id) uniquePlayerIds.add(m.player_b2_id);
        });

        const playerNamesMap = new Map();
        allUserIds.forEach(id => playerNamesMap.set(id, "我"));

        const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || "").trim());
        const isInt = (id) => /^\d+$/.test(String(id || "").trim());

        const playerIdsQuery = [...uniquePlayerIds].filter(isUuid);

        // For non-UUID IDs (e.g. test dummy players), assign fallback names directly
        uniquePlayerIds.forEach(id => {
          if (!isUuid(id)) {
            if (!playerNamesMap.has(id)) {
              playerNamesMap.set(id, String(id).toLowerCase().includes("dummy") ? "練習球友" : id);
            }
          }
        });

        // 查詢球友姓名 (users)
        if (playerIdsQuery.length > 0) {
          const { data: usersData } = await client.from("users").select("id, name").in("id", playerIdsQuery);
          (usersData || []).forEach(x => {
            playerNamesMap.set(x.id, x.name);
          });
        }

        matches.forEach((m, index) => {
          const isTeamA = allUserIds.includes(m.player_a1_id) || allUserIds.includes(m.player_a2_id);
          
          let partnerName = "";
          let opponent1Name = "";
          let opponent2Name = "";
          let myScore = 0;
          let oppScore = 0;

          if (isTeamA) {
            partnerName = m.player_a2_id ? (playerNamesMap.get(m.player_a2_id) || "隊友") : "";
            opponent1Name = playerNamesMap.get(m.player_b1_id) || "對手A";
            opponent2Name = m.player_b2_id ? (playerNamesMap.get(m.player_b2_id) || "對手B") : "";
            myScore = m.score_a;
            oppScore = m.score_b;
          } else {
            partnerName = m.player_b2_id ? (playerNamesMap.get(m.player_b2_id) || "隊友") : "";
            opponent1Name = playerNamesMap.get(m.player_a1_id) || "對手A";
            opponent2Name = m.player_a2_id ? (playerNamesMap.get(m.player_a2_id) || "對手B") : "";
            myScore = m.score_b;
            oppScore = m.score_a;
          }

          let outcome = "TIE";
          let changeSymbol = "";
          let badgeStyle = "background-color:#e2e8f0; color:#475569; padding:3px 8px; border-radius:8px; font-size:11.5px; font-weight:900;";
          let changeColor = "#64748b";

          if (myScore > oppScore) {
            outcome = "WIN";
            calcWins++;
            currentElo += m.rating_change;
            changeSymbol = `+${m.rating_change}`;
            badgeStyle = "background-color:#eff6ff; color:#1d4ed8; padding:3px 8px; border-radius:8px; font-size:11.5px; font-weight:900; border:1px solid #bfdbfe;";
            changeColor = "#2563eb";
          } else if (myScore < oppScore) {
            outcome = "LOSS";
            calcLosses++;
            currentElo -= m.rating_change;
            changeSymbol = `-${m.rating_change}`;
            badgeStyle = "background-color:#fee2e2; color:#991b1b; padding:3px 8px; border-radius:8px; font-size:11.5px; font-weight:900;";
            changeColor = "#b91c1c";
          } else {
            changeSymbol = "±0";
          }

          eloTrend.push({
            elo: currentElo,
            date: m.reservation_date ? m.reservation_date.slice(5) : ""
          });

          const clubPrefix = m.meetups?.organizers?.name ? `[${m.meetups.organizers.name}] ` : "";
          const formattedDate = m.reservation_date ? m.reservation_date.replace(/-/g, "/") : "";
          const partnerStr = partnerName ? ` + ${partnerName}` : "";
          const opponentsStr = opponent2Name ? `${opponent1Name} + ${opponent2Name}` : opponent1Name;

          renderedMatches.unshift(`
            <div class="match-history-row" style="display:flex; flex-direction:row; align-items:center; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:14px; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,0.01)">
              <div style="flex:1">
                <div style="display:flex; align-items:center; justify-content:space-between">
                  <div style="display:flex; align-items:center; gap:8px">
                    <span style="${badgeStyle}">${outcome === "WIN" ? "勝" : (outcome === "LOSS" ? "敗" : "平")}</span>
                    <span style="font-size:15px; font-weight:800; color:#0f172a">${myScore} : ${oppScore}</span>
                  </div>
                  <span style="font-size:14px; font-weight:800; color:${changeColor}">${changeSymbol} 分</span>
                </div>
                <div style="font-size:13px; color:#475569; font-weight:700; margin-top:8px; display:flex; gap:6px; flex-wrap:wrap">
                  <span>我${partnerStr}</span>
                  <span style="color:#94a3b8">vs</span>
                  <span>${opponentsStr}</span>
                </div>
                <div style="font-size:11px; color:#94a3b8; font-weight:600; margin-top:6px">
                  📅 ${formattedDate} ｜ 🎾 ${escapeHtml(clubPrefix + (m.meetups?.name || "計分對戰"))} (第 ${m.court_number} 場)
                </div>
              </div>
            </div>
          `);
        });

        lastEloTrend = eloTrend;
        const winRate = matches.length > 0 ? ((calcWins / matches.length) * 100).toFixed(0) + "%" : "0%";
        if (matchStatsSummary) {
          matchStatsSummary.textContent = `${matches.length} 場 ｜ ${calcWins}勝 ${calcLosses}敗 (勝率 ${winRate})`;
        }
        if (matchHistoryList) {
          matchHistoryList.innerHTML = renderedMatches.join("");
        }

        drawEloChart(eloTrend);
      } else {
        lastEloTrend = [];
        if (matchStatsSummary) {
          matchStatsSummary.textContent = "0 場 ｜ 0勝 0敗 (勝率 0%)";
        }
        if (matchHistoryList) {
          matchHistoryList.innerHTML = `
            <div class="empty-view-box">
              <span class="empty-icon">⚔️</span>
              <div class="empty-title">目前尚無任何積分對抗戰績</div>
              <div class="empty-desc">參加俱樂部的對抗賽並完成結算後，戰績將自動呈現在此！</div>
            </div>
          `;
        }
        drawEloChart([]);
      }
    } catch (err) {
      if (err?.code !== "PGRST205" && !String(err?.message || "").includes("schema cache")) {
        console.warn("Match records notice:", err?.message || err);
      }
    }
  } else {
    lastEloTrend = [];
    if (matchStatsSummary) {
      matchStatsSummary.textContent = "0 場 ｜ 0勝 0敗 (勝率 0%)";
    }
    if (matchHistoryList) {
      matchHistoryList.innerHTML = `
        <div class="empty-view-box">
          <span class="empty-icon">⚔️</span>
          <div class="empty-title">目前尚無任何積分對抗戰績</div>
          <div class="empty-desc">參加俱樂部的對抗賽並完成結算後，戰績將自動呈現在此！</div>
        </div>
      `;
    }
    drawEloChart([]);
  }

  // Initialize tabs & skill chips and apply active tab
  initMemberTabs();
  initSkillChips();
  switchMemberTab(activeMemberTab);

  } catch (err) {
    console.error("loadMemberDashboard error:", err);
  }
}

window.cancelMemberDashboardSignup = async function(signupId, meetupName) {
  if (!confirm(`確定要取消「${meetupName}」的預約嗎？`)) return;
  try {
    const { data: part, error: getError } = await client
      .from("session_participants")
      .select("id, status, session:sessions(id, meetup_id, session_date)")
      .eq("id", signupId)
      .single();
    if (getError) throw getError;

    const { error: cancelErr } = await client
      .from("session_participants")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", signupId);
    if (cancelErr) throw cancelErr;

    // Auto-promote first waitlisted participant if status was confirmed
    if (part.status === "confirmed" && part.session?.id) {
      const { data: waitlist } = await client
        .from("session_participants")
        .select("id")
        .eq("session_id", part.session.id)
        .eq("status", "waitlist")
        .order("created_at", { ascending: true })
        .limit(1);

      if (waitlist && waitlist.length > 0) {
        await client
          .from("session_participants")
          .update({ status: "confirmed", updated_at: new Date().toISOString() })
          .eq("id", waitlist[0].id);
      }
    }

    alert("已成功取消預約！");
    notifyCancelSignup({
      meetupId: part.session?.meetup_id,
      reservationDate: part.session?.session_date,
      nickname: currentSystemMember?.nickname || "球友",
      meetupName: meetupName
    });
    if (typeof loadMemberDashboard === "function") {
      await loadMemberDashboard();
    }
    await refreshAll(true);
  } catch (err) {
    alert("取消失敗：" + (err.message || String(err)));
  }
};

window.promoteTentative = async function(signupId) {
  if (!confirm("確定要將此預約轉為正式席位嗎？")) return;
  try {
    const { error } = await client
      .from("session_participants")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", signupId);
    if (error) throw error;
    alert("已成功轉為正式正取席位！");
    if (typeof loadMemberDashboard === "function") {
      await loadMemberDashboard();
    }
    await refreshAll(true);
  } catch (err) {
    alert("操作失敗：" + (err.message || String(err)));
  }
};

window.promoteTentativeGuest = async function(signupId) {
  if (!confirm("確定要將此預約轉為正式席位嗎？")) return;
  try {
    const { error } = await client
      .from("session_participants")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", signupId);
    if (error) throw error;
    alert("已成功轉為正式正取席位！");
    $("cancelFormSecondStep").style.display = "none";
    $("queryResultText").textContent = "";
    if (typeof loadMemberDashboard === "function") {
      await loadMemberDashboard();
    }
    await refreshAll(true);
  } catch (err) {
    alert("操作失敗：" + (err.message || String(err)));
  }
};

window.showTransactions = async function(memberId, clubName, payerMemberId) {
  const container = $("transactionListContainer");
  const modalTitle = $("transactionModalTitle");
  if (!container || !modalTitle) return;

  modalTitle.textContent = `${clubName} 交易明細`;
  container.innerHTML = `<p style="color: var(--muted); text-align: center; padding: 20px;">載入中...</p>`;
  setModalVisible($("transactionModal"), true);

  const targetId = payerMemberId && payerMemberId !== 'null' ? payerMemberId : memberId;

  try {
    const { data, error } = await client
      .from("wallet_transactions")
      .select("id, amount, type, notes, created_at")
      .eq("organizer_member_id", targetId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p style="color: var(--muted); text-align: center; padding: 20px;">尚無任何交易與扣點明細紀錄</p>`;
      return;
    }

    container.innerHTML = data.map(t => {
      const typeLabel = t.type === 'topup' ? '儲值' : (t.type === 'checkin' ? '出席扣款' : (t.type === 'refund' ? '退款' : '手動調整'));
      const numAmount = Number(t.amount || 0);
      const amountColor = numAmount >= 0 ? '#16A34A' : '#EF4444';
      const amountLabel = numAmount >= 0 ? `+${numAmount} 點` : `${numAmount} 點`;
      const notesText = t.notes ? `<p style="font-size: 11px; color: var(--muted); margin-top: 2px;">${escapeHtml(t.notes)}</p>` : '';
      const timeStr = new Date(t.created_at).toLocaleString();

      return `
        <div style="border-bottom: 1px solid var(--line); padding: 12px 6px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-weight: 800; font-size: 13.5px; color: var(--text);">${typeLabel}</span>
            <p style="font-size: 11px; color: var(--muted); margin-top: 2px;">時間: ${timeStr}</p>
            ${notesText}
          </div>
          <span style="font-weight: 900; font-size: 15px; color: ${amountColor};">${amountLabel}</span>
        </div>
      `;
    }).join("");
  } catch (e) {
    container.innerHTML = `<p style="color: #EF4444; text-align: center; padding: 20px;">載入失敗: ${e.message || String(e)}</p>`;
  }
};

function checkAndPromptBindPhone(member) {
  if (!member) return;
  const cleanPh = cleanPhone(member.phone);
  if (cleanPh && cleanPh.length === 10) return; // Already has valid phone

  // If user clicked "稍後再說" during this browser session, do not auto-prompt
  if (sessionStorage.getItem("skip_bind_phone") === "true") return;

  openBindPhoneModal();
}

function openBindPhoneModal(customNotice) {
  if (!currentUser) return;
  if ($("bindNickname")) {
    $("bindNickname").value = currentSystemMember?.nickname || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || "";
  }
  if ($("bindPhone")) {
    $("bindPhone").value = currentSystemMember?.phone || "";
  }
  if ($("bindSkillLevel")) {
    $("bindSkillLevel").value = currentSystemMember?.skill_level || "normal";
  }
  const msgEl = $("bindPhoneMessage");
  if (msgEl) {
    if (customNotice) {
      setMessage(msgEl, customNotice, false);
    } else {
      msgEl.style.display = "none";
    }
  }
  setModalVisible($("bindPhoneModal"), true);
}

function closeBindPhoneModal(skip = false) {
  if (skip) {
    sessionStorage.setItem("skip_bind_phone", "true");
  }
  setModalVisible($("bindPhoneModal"), false);
}

async function handleBindPhoneSubmit(e) {
  e.preventDefault();
  if (!currentUser) return;
  const nickname = $("bindNickname")?.value?.trim() || "球友";
  const phoneVal = $("bindPhone")?.value || "";
  const phone = cleanPhone(phoneVal);
  const skillLevel = $("bindSkillLevel")?.value || "normal";
  const isBeginner = (skillLevel === "first_time" || skillLevel === "beginner");
  const msgEl = $("bindPhoneMessage");

  if (!phone || !validatePhone(phone)) {
    return setMessage(msgEl, "請輸入正確的手機號碼 (09開頭共10碼數字)", false);
  }

  const submitBtn = $("bindPhoneSubmitBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "綁定中...";
  }

  try {
    setMessage(msgEl, "正在為您綁定並連結球館資料...", true);

    // 1. Update users
    const { data: updatedMember, error: updateErr } = await client
      .from("users")
      .update({
        name: nickname,
        phone,
        skill_level: skillLevel,
        is_beginner: isBeginner,
        updated_at: new Date().toISOString()
      })
      .eq("id", currentSystemMember?.id || currentUser.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    currentSystemMember = { ...updatedMember, nickname: updatedMember.name };
    sessionStorage.removeItem("skip_bind_phone");
    closeBindPhoneModal(false);

    alert("🎉 手機號碼綁定成功！已為您連結會員資料。");

    // 2. Refresh views
    toggleAuthView(true);
    if ($("memberDashboard")) loadMemberDashboard();
    await refreshMeetupListOnly();
  } catch (err) {
    setMessage(msgEl, err.message || "綁定失敗，請稍候重試", false);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "立即綁定並連結資料";
    }
  }
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  if (!currentUser || !currentSystemMember) return;
  const nickname = $("profileNickname").value.trim();
  const phone = cleanPhone($("profilePhone").value);
  const skill_level = $("profileSkillLevel")?.value || "normal";
  const is_beginner = (skill_level === "first_time" || skill_level === "beginner");
  const msgEl = $("profileMessage");
  if (!nickname) return setMessage(msgEl, "請填寫姓名或暱稱", false);
  if (phone && !validatePhone(phone)) return setMessage(msgEl, "手機格式不正確", false);

  try {
    setMessage(msgEl, "更新中...", true);
    const { data, error } = await client
      .from("users")
      .update({ name: nickname, phone, skill_level, is_beginner, updated_at: new Date().toISOString() })
      .eq("id", currentSystemMember?.id || currentUser.id)
      .select()
      .single();

    if (error) throw error;
    currentSystemMember = { ...data, nickname: data.name };

    setMessage(msgEl, "個人資料更新成功！", true);
    toggleAuthView(true);
    loadMemberDashboard();
  } catch (err) {
    setMessage(msgEl, err.message || "更新失敗，請重試", false);
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value.trim();
  const isRegister = $("authTabRegister").classList.contains("active");
  const msgEl = $("authMessage");

  if (!email || !password) return setMessage(msgEl, "請填寫信箱與密碼。", false);
  if (password.length < 6) return setMessage(msgEl, "密碼長度至少為 6 位元。", false);

  $("authSubmitBtn").disabled = true;
  $("authSubmitBtn").textContent = "處理中...";

  try {
    if (isRegister) {
      const nickname = $("authNickname").value.trim();
      const phone = cleanPhone($("authPhone").value);
      if (!nickname) throw new Error("請填寫姓名/暱稱");
      if (!validatePhone(phone)) throw new Error("請填寫正確的手機號碼");

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { nickname, phone }
        }
      });
      if (error) throw error;
      
      if (data?.user) {
        currentUser = data.user;
        currentSystemMember = await ensureSystemMember(currentUser);
        toggleAuthView(true);
        loadMemberDashboard();
        setMessage(msgEl, "註冊成功！已自動登入。", true);
      } else {
        setMessage(msgEl, "註冊成功！請至信箱收取驗證信登入。", true);
      }
    } else {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) {
        currentUser = data.user;
        currentSystemMember = await ensureSystemMember(currentUser);
        toggleAuthView(true);
        loadMemberDashboard();
        setMessage(msgEl, "登入成功！", true);
      }
    }
  } catch (err) {
    setMessage(msgEl, err.message || "操作失敗，請稍候重試。", false);
  } finally {
    $("authSubmitBtn").disabled = false;
    $("authSubmitBtn").textContent = "確認";
  }
}

async function handleLineLogin() {
  const lineBtn = $("lineLoginBtn");
  if (lineBtn) {
    if (lineBtn.disabled) return;
    lineBtn.disabled = true;
  }
  const loadingContainer = $("memberLoading");
  const authContainer = $("authContainer");
  if (authContainer) authContainer.style.display = "none";
  if (loadingContainer) {
    loadingContainer.style.display = "flex";
    const textEl = loadingContainer.querySelector("span");
    if (textEl) textEl.textContent = "正在跳轉至 LINE 登入頁面...";
  }

  // 採用後端直通架構：直接導向 LINE 官方授權端點
  const clientId = "2010841175";
  const redirectUri = window.location.origin + "/api/auth/line/callback";
  const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
  sessionStorage.setItem("line_login_state", state);

  const authUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid`;
  window.location.href = authUrl;
}

function toggleAuthView(isLoggedIn) {
  const loadingContainer = $("memberLoading");
  const authContainer = $("authContainer");
  const memberDashboard = $("memberDashboard");
  
  if (loadingContainer) loadingContainer.style.display = "none";
  
  const welcomeEl = $("headerWelcome");
  if (welcomeEl) {
    if (isLoggedIn) {
      let name = currentSystemMember?.nickname || currentSystemMember?.name;
      if (!name || name === "球友") {
        name = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || "";
      }
      if (!name) {
        if (currentUser?.email && !currentUser.email.startsWith("line_")) {
          name = currentUser.email.split("@")[0];
        } else {
          name = "球友";
        }
      }
      let phoneWarningHtml = "";
      if (!currentSystemMember?.phone) {
        phoneWarningHtml = `<span style="background-color:#FFFBEB;color:#D97706;font-size:11.5px;font-weight:900;padding:2px 8px;border-radius:999px;margin-left:6px;border:1px solid #FDE68A;display:inline-flex;align-items:center;gap:3px;vertical-align:middle;">⚠️ 設定手機</span>`;
      }
      welcomeEl.innerHTML = `👋 您好，<span style="color:#2563eb;margin-left:2px">${name}</span>！${phoneWarningHtml}`;
      welcomeEl.style.display = "inline-flex";
    } else {
      welcomeEl.style.display = "none";
    }
  }
  
  if (isLoggedIn) {
    if (authContainer) authContainer.style.display = "none";
    if (memberDashboard) memberDashboard.style.display = "flex";
  } else {
    if (authContainer) authContainer.style.display = "block";
    if (memberDashboard) memberDashboard.style.display = "none";
  }
}

$("prevMonth")?.addEventListener("click", () => { visibleMonth = addMonths(visibleMonth, -1); renderCalendar(); });
$("nextMonth")?.addEventListener("click", () => { visibleMonth = addMonths(visibleMonth, 1); renderCalendar(); });
$("refreshBtn")?.addEventListener("click", async () => { clearRosterCache(); await loadAvailableWeekdays(); refreshAll(); });
$("cityFilter")?.addEventListener("change", async (e) => {
  selectedCity = e.target.value || "all";
  clearRosterCache();
  await loadAvailableWeekdays();
  refreshAll();
});
$("closeModal")?.addEventListener("click", closeSignup);
$("closeCancelModal")?.addEventListener("click", closeCancel);
$("closeCreatePickupModal")?.addEventListener("click", closeCreatePickupModal);
$("closeEditPickupModal")?.addEventListener("click", closeEditPickupModal);
$("openCreatePickupBtn")?.addEventListener("click", () => openCreatePickupModal(selectedDate));
$("openCreatePickupInlineBtn")?.addEventListener("click", () => openCreatePickupModal(selectedDate));
$("closeTransactionModal")?.addEventListener("click", () => setModalVisible($("transactionModal"), false));
$("transactionModal")?.addEventListener("click", (e) => { if (e.target.id === "transactionModal") setModalVisible($("transactionModal"), false); });
$("signupModal")?.addEventListener("click", (e) => { if (e.target.id === "signupModal") closeSignup(); });
$("cancelModal")?.addEventListener("click", (e) => { if (e.target.id === "cancelModal") closeCancel(); });
$("createPickupModal")?.addEventListener("click", (e) => { if (e.target.id === "createPickupModal") closeCreatePickupModal(); });
$("editPickupModal")?.addEventListener("click", (e) => { if (e.target.id === "editPickupModal") closeEditPickupModal(); });
$("createPickupForm")?.addEventListener("submit", handleCreatePickup);
$("editPickupForm")?.addEventListener("submit", handleUpdatePickup);
$("signupForm")?.addEventListener("submit", handleSignup);
$("phone")?.addEventListener("input", async (e) => {
  if (currentSystemMember) return;
  const rawVal = e.target.value;
  const cleanPh = cleanPhone(rawVal);
  if (/^09\d{8}$/.test(cleanPh)) {
    try {
      const { data } = await client
        .from("users")
        .select("skill_level")
        .eq("phone", cleanPh)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        if ($("skillLevel") && data.skill_level) {
          $("skillLevel").value = data.skill_level;
        }
      }
    } catch (err) {
      console.warn("Failed to autofill last signup details:", err);
    }
  }
});
$("cancelForm")?.addEventListener("submit", handleCancel);
$("queryCancelBtn")?.addEventListener("click", handleQueryCancel);
$("logoutBtn")?.addEventListener("click", async () => { sessionStorage.setItem("user_logged_out", "true"); await client.auth.signOut(); currentUser = null; currentSystemMember = null; toggleAuthView(false); });
$("deleteAccountBtn")?.addEventListener("click", async () => {
  if (!confirm("確定要註銷並刪除您的會員資料嗎？此操作將解除綁定並清除所有登入資訊，且無法復原。")) return;
  try {
    if (currentSystemMember?.id) {
      await client.from("users").delete().eq("id", currentSystemMember.id);
    }
    sessionStorage.setItem("user_logged_out", "true");
    await client.auth.signOut();
    currentUser = null;
    currentSystemMember = null;
    toggleAuthView(false);
    alert("已成功註銷並清除會員帳號！");
  } catch (err) {
    console.error("註銷失敗:", err);
    sessionStorage.setItem("user_logged_out", "true");
    await client.auth.signOut();
    currentUser = null;
    currentSystemMember = null;
    toggleAuthView(false);
    alert("已完成本機登入資訊清除。");
  }
});
$("lineLoginBtn")?.addEventListener("click", handleLineLogin);
$("authForm")?.addEventListener("submit", handleAuthSubmit);
$("updateProfileForm")?.addEventListener("submit", handleUpdateProfile);
$("bindPhoneForm")?.addEventListener("submit", handleBindPhoneSubmit);
$("skipBindPhoneBtn")?.addEventListener("click", () => closeBindPhoneModal(true));
$("closeBindPhoneModal")?.addEventListener("click", () => closeBindPhoneModal(true));
$("bindPhoneModal")?.addEventListener("click", (e) => {
  if (e.target.id === "bindPhoneModal") closeBindPhoneModal(true);
});
$("copyIdBtn")?.addEventListener("click", () => {
  if (currentSystemMember?.id) {
    navigator.clipboard.writeText(currentSystemMember.id);
    alert("會員 ID 已複製至剪貼簿！");
  }
});

document.querySelectorAll("[data-open-tab]").forEach(link => {
  link.addEventListener("click", () => openTab(link.dataset.openTab));
});
if ($("cityFilter")) renderCityFilter();
if ($("pickupCity") || $("editPickupCity")) initPickupModal();
if ($("knowledgeList")) renderStaticContent();

// 全局委託監聽：點擊任何知識卡片圖片或帶有 data-knowledge-idx 的元素直接觸發放大燈箱
document.addEventListener("click", (e) => {
  const wrap = e.target.closest(".knowledge-img-wrap");
  if (wrap && wrap.dataset.knowledgeIdx !== undefined) {
    const idx = parseInt(wrap.dataset.knowledgeIdx, 10);
    const item = knowledgeItems[idx];
    if (item) {
      openImageLightbox(item.image?.src, item.title, item.desc);
    }
  }
});

(async function init() {
  if ($("announcementList")) loadAnnouncements().catch(console.error);

  // 並行載入月曆規則與開團列表，首頁加載不再受阻塞
  if ($("daysGrid") || $("meetupList")) {
    const weekdaysPromise = $("daysGrid") ? loadAvailableWeekdays().catch(console.error) : Promise.resolve();
    refreshAll();
    weekdaysPromise.then(() => {
      if ($("daysGrid")) renderCalendar();
    });
  }

  // 統一身分同步處理 (避免 onAuthStateChange 與 getSession 重複並行呼叫造成多次資料庫查詢)
  let activeMemberPromise = null;
  async function syncUserAuth(user) {
    if (!user) {
      currentUser = null;
      currentSystemMember = null;
      toggleAuthView(false);
      return null;
    }
    sessionStorage.removeItem("user_logged_out");
    currentUser = user;
    if (!activeMemberPromise) {
      activeMemberPromise = ensureSystemMember(user).then((m) => {
        currentSystemMember = m;
        toggleAuthView(true);
        if ($("memberDashboard")) loadMemberDashboard();
        checkAndPromptBindPhone(m);
        return m;
      }).finally(() => {
        activeMemberPromise = null;
      });
    }
    return activeMemberPromise;
  }

  client.auth.onAuthStateChange((event, session) => {
    syncUserAuth(session?.user);
  });

  try {
    // 若網址 Hash 含有剛換發之 access_token 與 refresh_token，直接呼叫 setSession
    if (window.location.hash.includes("access_token")) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { data: setSessionData } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (setSessionData?.session?.user) {
          await syncUserAuth(setSessionData.session.user);
          try {
            history.replaceState(null, null, window.location.pathname + window.location.search);
          } catch (e) {}
        }
      }
    }

    const { data: { session } } = await client.auth.getSession();
    if (session?.user) {
      syncUserAuth(session.user);
    } else {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const rawError = searchParams.get("error_description") || hashParams.get("error_description") || searchParams.get("error");
      if (rawError && $("authMessage")) {
        const errorText = decodeURIComponent(rawError.replace(/\+/g, " "));
        setMessage($("authMessage"), `⚠️ LINE 驗證未完成：${errorText}`, false);
      }

      const isLineBrowser = /Line/i.test(navigator.userAgent);
      const hasAuthParams = window.location.hash.includes("access_token") || 
                            window.location.hash.includes("error") || 
                            window.location.search.includes("error");
      const userLoggedOut = sessionStorage.getItem("user_logged_out") === "true";
      
      if (isLineBrowser && !hasAuthParams && !userLoggedOut) {
        console.log("LINE in-app browser detected, performing seamless auto-login...");
        await handleLineLogin();
        return;
      }
    }
  } catch (err) {
    console.error("Auth init error:", err);
  }

  if ($("authTabLogin")) initAuthTabs();

  if (window.location.hash === "#createPickupModal") {
    setTimeout(() => {
      openCreatePickupModal(selectedDate);
      history.replaceState(null, null, " ");
    }, 400);
  }
})();
