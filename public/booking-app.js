const SUPABASE_URL = "https://vurcntmcpemioybqqrcx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Z9nUlOsBQ3cIi37lr00vcw_VdBEDo3o";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  first_time: "第一次",
  beginner: "初學",
  normal: "一般",
  advanced: "進階"
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

  if (!tokens.length) {
    console.log("這個開團目前沒有可用的推播 token");
    return;
  }

  try {
    const response = await fetch("/api/send-signup-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pushTokens: tokens,
        meetupId,
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
let selectedDate = toISODate(new Date());
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

async function loadAvailableWeekdays() {
  let query = client
    .from("booking_meetup_weekdays_view")
    .select("id,weekday,start_date,is_active,weekday_is_active,city,is_one_off,one_off_date")
    .eq("is_active", true)
    .eq("weekday_is_active", true);
  query = applyCityFilter(query);
  const { data, error } = await query;
  if (error) throw error;

  availableRules = (data || []).map((x) => ({
    id: x.id,
    weekday: x.weekday,
    start_date: x.start_date || null,
    is_one_off: !!x.is_one_off,
    one_off_date: x.one_off_date || null,
  }));

  try {
    const { data: exclData } = await client.from("meetup_exclusions").select("meetup_id, exclude_date");
    exclusions = exclData || [];
  } catch (err) {
    console.error("載入停開日期失敗", err);
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

async function loadMeetupsByDate(dateStr) {
  const weekday = dateFromISO(dateStr).getDay();
  let query = client
    .from("booking_meetup_weekdays_view")
    .select("*")
    .eq("is_active", true)
    .eq("weekday_is_active", true)
    .eq("weekday", weekday)
    .lte("start_date", dateStr);
  query = applyCityFilter(query);
  const { data, error } = await query.order("id", { ascending: false });
  if (error) throw error;

  const { data: exclRows } = await client
    .from("meetup_exclusions")
    .select("meetup_id")
    .eq("exclude_date", dateStr);
  const excludedIds = new Set((exclRows || []).map(x => String(x.meetup_id)));

  const rows = (data || [])
    .filter(m => {
      if (excludedIds.has(String(m.id))) return false;
      if (m.is_one_off && m.one_off_date !== dateStr) return false;
      return true;
    })
    .map((m) => ({
      ...m,
      push_tokens: normalizePushTokens(m.push_tokens),
      capacity_override: m.capacity_override ?? null,
      weekday_notes: m.weekday_notes ?? null,
    }));

  const ids = rows.map((x) => x.id);
  let counts = {};
  if (ids.length) {
    const { data: countRows, error: rpcError } = await client.rpc("get_meetup_counts_by_date", {
      p_reservation_date: dateStr,
      p_meetup_ids: ids
    });
    if (!rpcError) {
      counts = (countRows || []).reduce((acc, row) => {
        acc[String(row.meetup_id)] = row;
        return acc;
      }, {});
    } else {
      const { data: signups, error: signupError } = await client
        .from("signups")
        .select("meetup_id,status,people_count")
        .in("meetup_id", ids)
        .eq("reservation_date", dateStr)
        .in("status", ["confirmed", "waitlist"]);
      if (signupError) throw signupError;
      counts = (signups || []).reduce((acc, row) => {
        const key = String(row.meetup_id);
        const pCount = Number(row.people_count || 1);
        acc[key] = acc[key] || { confirmed_total_count: 0, waitlist_count: 0, member_count: 0, confirmed_signup_count: 0 };
        if (row.status === "waitlist") acc[key].waitlist_count += pCount;
        else {
          acc[key].confirmed_total_count += pCount;
          acc[key].confirmed_signup_count += pCount;
        }
        return acc;
      }, {});
    }
  }
  
  const mapped = rows.map((m) => {
    const cap = m.capacity_override ?? m.capacity ?? 0;
    const c = counts[String(m.id)] || {};
    const realConfirmed = Number(c.confirmed_total_count ?? c.confirmed_count ?? 0);
    return {
      ...m,
      member_count: Number(c.member_count || 0),
      confirmed_signup_count: Number(c.confirmed_signup_count || 0),
      confirmed_count: realConfirmed,
      display_confirmed_count: cap > 0 ? Math.min(realConfirmed, cap) : realConfirmed,
      waitlist_count: Number(c.waitlist_count || 0),
      over_capacity_count: cap > 0 ? Math.max(realConfirmed - cap, 0) : 0,
    };
  });

  // 排序邏輯：未結束的活動排前面，已結束的排後面；在此大分類下，以開始時間 start_time 由小到大排序
  return mapped.sort((a, b) => {
    const aEnded = isMeetupEnded(a, dateStr);
    const bEnded = isMeetupEnded(b, dateStr);
    
    // 1. 已結束的排最下面
    if (aEnded && !bEnded) return 1;
    if (!aEnded && bEnded) return -1;
    
    // 2. 其餘照開始時間由小到大排序
    const aTime = a.start_time || "00:00";
    const bTime = b.start_time || "00:00";
    if (aTime !== bTime) {
      return aTime.localeCompare(bTime);
    }
    
    return Number(a.id) - Number(b.id);
  });
}

async function fetchRoster(meetupId, dateStr) {
  const key = `${meetupId}-${dateStr}`;
  if (rosterCache.has(key)) return rosterCache.get(key);
  const { data, error } = await client.rpc("get_roster_with_members", {
    p_meetup_id: meetupId,
    p_reservation_date: dateStr
  });
  if (!error) {
    const rows = data || [];
    rosterCache.set(key, rows);
    return rows;
  }
  const fallback = await client
    .from("signups")
    .select("id,nickname,phone,is_beginner,skill_level,note,status,created_at")
    .eq("meetup_id", meetupId)
    .eq("reservation_date", dateStr)
    .in("status", ["confirmed", "waitlist"])
    .order("created_at", { ascending: true });
  if (fallback.error) throw fallback.error;
  const rows = (fallback.data || []).map((x) => ({ ...x, display_name: x.nickname, source: "signup" }));
  rosterCache.set(key, rows);
  return rows;
}
function clearRosterCache() { rosterCache.clear(); }

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
      refreshAll(true);
    });
  });

  const mobileBarEl = $("mobileDateBar");
  if (mobileBarEl) {
    const mobileWeekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const validDates = cells.filter(Boolean);
    mobileBarEl.innerHTML = validDates.map((dateStr) => {
      const d = dateFromISO(dateStr);
      const isPast = dateStr < today;
      const has = hasAvailableMeetupOnDate(dateStr);
      const selected = dateStr === selectedDate;
      const wkName = mobileWeekdays[d.getDay()];
      return `<button class="mobile-date-item ${selected ? "active" : ""}" data-date="${dateStr}">
        <span class="wk">週${wkName}</span>
        <span class="day">${d.getDate()}</span>
        ${has && !isPast ? `<span class="indicator-dot"></span>` : ""}
      </button>`;
    }).join("");
    
    setTimeout(() => {
      const activeItem = mobileBarEl.querySelector(".mobile-date-item.active");
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }, 80);

    mobileBarEl.querySelectorAll(".mobile-date-item").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedDate = btn.dataset.date;
        visibleMonth = selectedDate.slice(0, 7) + "-01";
        refreshAll(true);
      });
    });
  }
}

function renderMeetups(meetups) {
  const dateEl = $("selectedDateText");
  const listEl = $("meetupList");
  if (!listEl) return;
  if (dateEl) dateEl.textContent = formatDate(selectedDate);

  if (!meetups.length) {
    listEl.innerHTML = `<p class="empty">這天目前沒有開放報名，請換一天看看。</p>`;
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
    let isBookingClosed = closeDateTime && now > closeDateTime;
    
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

    const showQuickSignup = currentSystemMember && currentSystemMember.phone && currentSystemMember.nickname && !isBookingNotOpen && !isBookingClosed && !btnDisabledAttr;
    const quickSignupBtnHtml = showQuickSignup 
      ? `<button class="btn-secondary quick-signup-btn" style="background:#f0fdf4;border:1px solid #15803d;color:#15803d;font-weight:900" title="使用您的個人資料一鍵快速預約">⚡ 一鍵預約</button>`
      : "";

    return `<article class="meetup-card" data-meetup-id="${m.id}" 
      ${isBookingNotOpen ? `data-open-time="${openDateTime.getTime()}"` : ""}
      data-is-full="${full}"
      data-capacity="${cap}"
      data-slots-left="${left}">
      <div class="meetup-top">
        <div>
          <h3 class="meetup-title">${escapeHtml(m.name || "未命名活動")}</h3>
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
        <div class="info"><strong>發起人</strong>${escapeHtml(m.organizer_name || "未設定")}</div>
        <div class="info"><strong>時間</strong>${timeText(m.start_time, m.end_time)}</div>
        <div class="info"><strong>費用</strong>${escapeHtml(m.fee || "現場公告")}</div>
        <div class="info"><strong>人數</strong>${cap > 0 ? `${displayConfirmed}/${cap} 人` : `${realConfirmed} 人`}</div>
        ${waitlistCount > 0 ? `<div class="info"><strong>備取</strong>${waitlistCount} 人</div>` : ""}
        ${m.coach ? `<div class="info"><strong>教練</strong>${escapeHtml(m.coach)}</div>` : ""}
      </div>
      ${m.notes ? `<p class="note">${escapeHtml(m.notes)}</p>` : ""}
      <div class="actions">
        <button class="btn-primary signup-btn" ${btnDisabledAttr}>${primaryBtnText}</button>
        ${quickSignupBtnHtml}
        <button class="btn-secondary roster-btn">查看名單</button>
        <button class="btn-ghost cancel-btn">預約管理</button>
      </div>
      <div class="roster" id="roster-${m.id}"></div>
    </article>`;
  }).join("");

  document.querySelectorAll(".meetup-card").forEach((card) => {
    const id = String(card.dataset.meetupId);
    const meetup = meetups.find((x) => String(x.id) === id);
    card.querySelector(".signup-btn")?.addEventListener("click", () => openSignup(meetup));
    card.querySelector(".cancel-btn")?.addEventListener("click", () => openCancel(meetup));
    card.querySelector(".roster-btn")?.addEventListener("click", () => toggleRoster(meetup));
    card.querySelector(".quick-signup-btn")?.addEventListener("click", (e) => handleQuickSignup(meetup, e.currentTarget));
  });

  if (document.querySelector(".meetup-card[data-open-time]")) {
    startCountdownTicker();
  }
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

function openSignup(meetup) {
  currentMeetup = meetup;
  clearMessage($("formMessage"));
  $("signupForm").reset();
  $("modalTitle").textContent = meetup.name || "我要報名";
  $("modalSubtitle").textContent = `${formatDate(selectedDate)}｜${timeText(meetup.start_time, meetup.end_time)}`;
  
  if (currentSystemMember) {
    $("nickname").value = currentSystemMember.nickname || "";
    $("phone").value = currentSystemMember.phone || "";
  }
  $("nickname").readOnly = false;
  $("phone").readOnly = false;
  
  const peopleCountLabel = $("peopleCount")?.closest("label");
  if (peopleCountLabel) {
    peopleCountLabel.style.display = "none";
  }
  
  $("signupModal").classList.add("show");
}
function closeSignup() { $("signupModal").classList.remove("show"); currentMeetup = null; }
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
  $("cancelModal").classList.add("show");
}
function closeCancel() { $("cancelModal").classList.remove("show"); currentMeetup = null; }

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
    const { data, error } = await client
      .from("signups")
      .select("id, nickname, people_count, status, is_tentative")
      .eq("meetup_id", currentMeetup.id)
      .eq("reservation_date", selectedDate)
      .eq("phone", phone)
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

    const statusText = data.status === "waitlist" ? (data.is_tentative ? "彈性候補" : "備取") : "正取";
    $("queryResultText").textContent = `查得預約：${data.nickname || "球友"} (${statusText} ${count}人)`;
    
    const promoteBtn = $("guestPromoteBtn");
    if (promoteBtn) {
      if (data.status === "waitlist" && data.is_tentative) {
        promoteBtn.style.display = "block";
        promoteBtn.onclick = () => promoteTentativeGuest(data.id);
      } else {
        promoteBtn.style.display = "none";
      }
    }
    
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
  const isTentative = $("isTentative") ? $("isTentative").checked : false;
  if (!nickname) return setMessage($("formMessage"), "請填寫暱稱。", false);
  if (!validatePhone(phone)) return setMessage($("formMessage"), "請輸入正確手機號碼，例如 0912345678。", false);
  $("submitBtn").disabled = true;
  $("submitBtn").textContent = "送出中...";
  try {
    const { data, error } = await client.rpc("signup_basic_date", {
      p_meetup_id: currentMeetup.id,
      p_reservation_date: selectedDate,
      p_nickname: nickname,
      p_phone: phone,
      p_is_beginner: isBeginner,
      p_skill_level: skillLevel,
      p_note: note || null,
      p_people_count: peopleCount,
      p_is_tentative: isTentative
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.ok === false) return setMessage($("formMessage"), result.message || "無法完成報名。", false);

    // 如果球友已登入，且個人資料中的手機號碼為空，我們在報名成功時自動幫他更新個人資料！
    if (currentUser && currentSystemMember && !currentSystemMember.phone && phone) {
      try {
        const { data: updatedMember } = await client
          .from("system_members")
          .update({ phone: phone, nickname: nickname })
          .eq("id", currentUser.id)
          .select()
          .single();
        if (updatedMember) {
          currentSystemMember = updatedMember;
          if ($("profilePhone")) $("profilePhone").value = phone;
          if ($("profileNickname")) $("profileNickname").value = nickname;
        }
      } catch (profileErr) {
        console.error("Failed to auto-update profile phone:", profileErr);
      }
    }

    const status = result?.signup_status || result?.status;
    setMessage($("formMessage"), status === "waitlist" ? "目前正取已滿，已幫你加入備取。" : "報名成功，你目前為正取。", true);
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
  if (!currentSystemMember || !currentSystemMember.phone || !currentSystemMember.nickname) return;
  if (!confirm(`確定要以帳號「${currentSystemMember.nickname} (${currentSystemMember.phone})」一鍵快速預約「${meetup.name}」嗎？`)) return;
  
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = "⏳ 傳送中...";
  
  try {
    const { data, error } = await client.rpc("signup_basic_date", {
      p_meetup_id: meetup.id,
      p_reservation_date: selectedDate,
      p_nickname: currentSystemMember.nickname,
      p_phone: cleanPhone(currentSystemMember.phone),
      p_is_beginner: false,
      p_skill_level: "normal",
      p_note: null,
      p_people_count: 1,
      p_is_tentative: false
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.ok === false) {
      alert(result.message || "無法完成預約。");
    } else {
      const status = result?.signup_status || result?.status;
      const msg = status === "waitlist" ? "正取已滿，已幫您排入備取！" : "恭喜！您已成功預約正取！";
      alert(msg);
      notifyNewSignup({ meetup, meetupId: meetup.id, reservationDate: selectedDate, nickname: currentSystemMember.nickname, skillLevel: "normal" });
      clearRosterCache();
      await refreshMeetupListOnly();
    }
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
    const { data, error } = await client.rpc("cancel_signup_by_phone", {
      p_meetup_id: currentMeetup.id,
      p_reservation_date: selectedDate,
      p_phone: phone,
      p_cancel_people_count: cancelPeopleCount
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.ok === false) return setMessage($("cancelMessage"), result.message || "找不到這筆預約。", false);
    const actionType = result?.action_type;
    const successMessage = actionType === "member_absence_created"
      ? "已完成會員請假，當天不會列入名單，名額已釋出。"
      : actionType === "member_already_absent"
        ? "你已經完成請假，當天不會列入名單。"
        : (result?.message || "已取消預約，名額已釋出。");
    setMessage($("cancelMessage"), successMessage, true);
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
  const meetups = await loadMeetupsByDate(selectedDate);
  renderMeetups(meetups);
}
async function refreshAll(showLoading = true) {
  if (!$("daysGrid") && !$("meetupList")) return;
  renderCalendar();
  const dateEl = $("selectedDateText");
  if (dateEl) dateEl.textContent = formatDate(selectedDate);
  
  const meetupEl = $("meetupList");
  if (meetupEl && showLoading) {
    meetupEl.innerHTML = `
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      </style>
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; gap: 16px; width: 100%; min-height: 200px;">
        <svg viewBox="0 0 50 50" style="width: 40px; height: 40px; animation: spin 1s linear infinite;">
          <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="80, 200" stroke-dashoffset="0"></circle>
        </svg>
        <span style="font-size: 14px; color: var(--sub); font-weight: 700; animation: pulse 1.5s ease-in-out infinite; letter-spacing: 0.5px;">正在讀取預約場次資料...</span>
      </div>
    `;
  }
  try {
    const meetups = await loadMeetupsByDate(selectedDate);
    renderCalendar();
    renderMeetups(meetups);
  } catch (e) {
    if (meetupEl) {
      meetupEl.innerHTML = `<p class="empty">資料讀取失敗，請稍後再試。</p>`;
    }
    console.error(e);
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

function renderStaticContent() {
  renderAnnouncements();
  const know = $("knowledgeList");
  if (know) {
    know.innerHTML = knowledgeItems.map((item) => `
      <article class="knowledge-card">
        <img class="knowledge-img" src="${escapeHtml(item.image?.src || "")}" alt="${escapeHtml(item.image?.alt || item.title)}" loading="lazy" />
        <div class="knowledge-body">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="muted">${escapeHtml(item.desc)}</p>
          <div class="tag-row">${(item.tags || []).map(tag => `<span class="mini-tag">${escapeHtml(tag.k)}｜${escapeHtml(tag.v)}</span>`).join("")}</div>
        </div>
      </article>`).join("");
  }
}

function openTab(tabId) {
  document.querySelectorAll(".nav a").forEach(link => {
    link.classList.toggle("active", link.dataset.openTab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === tabId));
}

async function handleQueryPoints() {
  const phInput = $("queryPointsPhone");
  const resultP = $("queryPointsResult");
  if (!phInput || !resultP) return;

  const phoneVal = phInput.value.trim().replace(/\D/g, "");
  if (!phoneVal) {
    alert("請輸入手機號碼");
    return;
  }
  if (!/^09\d{8}$/.test(phoneVal)) {
    alert("手機號碼格式不正確，例：0912345678");
    return;
  }

  try {
    resultP.style.display = "block";
    resultP.style.color = "#475569";
    resultP.textContent = "查詢中...";

    const { data, error } = await client
      .from("members")
      .select("name, remaining_times, end_date, status")
      .eq("status", "active")
      .eq("phone", phoneVal);

    if (error) throw error;

    if (!data || data.length === 0) {
      resultP.style.color = "#dc2626";
      resultP.textContent = "查無此會員或該會員已停用。";
      return;
    }

    const resultsText = data.map(m => {
      const expText = m.end_date ? m.end_date : "無期限";
      return `${m.name}：剩餘 ${m.remaining_times} 次 (期限: ${expText})`;
    }).join(" ｜ ");
    resultP.style.color = "#15803d";
    resultP.textContent = `查得餘額 ➔ ${resultsText}`;
  } catch (e) {
    resultP.style.color = "#dc2626";
    resultP.textContent = `查詢失敗：${e.message || String(e)}`;
  }
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
  const { data, error } = await client
    .from("system_members")
    .select("id, nickname, phone, line_user_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error loading system member:", error);
    return null;
  }

  const defaultName = user.user_metadata?.full_name || user.user_metadata?.name || user.raw_user_meta_data?.name || user.user_metadata?.nickname || user.email?.split("@")[0] || "球友";
  
  let lineUserId = null;
  const metaSub = user.raw_user_meta_data?.sub || user.user_metadata?.sub;
  if (metaSub && typeof metaSub === "string" && metaSub.startsWith("U") && metaSub.length === 33) {
    lineUserId = metaSub;
  }
  
  if (!lineUserId) {
    const identId = user.identities?.[0]?.identity_id;
    if (identId && typeof identId === "string" && identId.startsWith("U") && identId.length === 33) {
      lineUserId = identId;
    }
  }
  
  if (!lineUserId) {
    console.log("Could not find standard LINE User ID starting with U. Falling back.");
    lineUserId = user.raw_user_meta_data?.sub || user.user_metadata?.sub || user.identities?.[0]?.identity_id || null;
  }

  if (!data) {
    const defaultPhone = user.user_metadata?.phone || "";
    const { data: inserted, error: insertError } = await client
      .from("system_members")
      .insert({ id: user.id, nickname: defaultName, phone: defaultPhone, line_user_id: lineUserId })
      .select()
      .single();
    if (insertError) {
      console.error("Error creating system member record:", insertError);
      return null;
    }
    return inserted;
  } else {
    // 預防防禦：若資料庫內仍為預設的「球友」或無有效 LINE ID (以 U 開頭)，在登入時自動同步更新
    const hasValidLineId = data.line_user_id && typeof data.line_user_id === "string" && data.line_user_id.startsWith("U") && data.line_user_id.length === 33;
    if ((data.nickname === "球友" && defaultName !== "球友") || !hasValidLineId) {
      const { data: updated } = await client
        .from("system_members")
        .update({ 
          nickname: data.nickname === "球友" ? defaultName : data.nickname, 
          line_user_id: lineUserId 
        })
        .eq("id", user.id)
        .select()
        .single();
      if (updated) return updated;
    }
  }
  return data;
}

async function loadMemberDashboard() {
  if (!currentUser || !currentSystemMember) return;
  
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

  const cleanPh = cleanPhone(currentSystemMember.phone);
  let clubMembers = [];
  
  // Query by system_member_id, or phone (if present)
  let filterStr = `system_member_id.eq.${currentSystemMember.id}`;
  if (cleanPh) {
    filterStr = `phone.eq.${cleanPh},${filterStr}`;
  }

  let { data: rows, error } = await client
    .from("members")
    .select("id, balance, remaining_times, status, organizer_id, payer_member_id, organizers(id, name), member_meetup_subscriptions(meetup_id, meetups(id, name, member_price))")
    .or(filterStr);

  if (error) {
    const fallbackResult = await client
      .from("members")
      .select("id, balance, remaining_times, status, organizer_id, payer_member_id, organizers(id, name), meetups(id, name, member_price, organizer_id, organizers(id, name))")
      .or(filterStr);
    if (!fallbackResult.error && fallbackResult.data) {
      clubMembers = fallbackResult.data;
    }
  } else if (rows) {
    clubMembers = rows;
  }

  const balancesList = $("balancesList");
  if (balancesList) {
    balancesList.innerHTML = "";
    
    let lowBalanceDetected = false;

    if (clubMembers.length === 0) {
      balancesList.innerHTML = `<p style="color: var(--muted); font-size: 13.5px; font-style: italic;">尚未加入任何俱樂部或無儲值資料</p>`;
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

        const div = document.createElement("div");
        div.className = `wallet-item-card ${isActive ? 'active-wallet' : 'inactive-wallet'}`;

        div.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
              <span style="font-weight: 800; font-size: 15px; color: ${isActive ? 'var(--text)' : 'var(--muted)'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(clubName)}</span>
              ${isActive ? '' : '<span style="background: #E2E8F0; color: #64748B; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; flex-shrink: 0;">已停用</span>'}
            </div>
            <div style="flex-shrink: 0; text-align: right;">
              <span style="font-size: 13px; color: var(--muted); font-weight: 700;">餘額: </span>
              <span class="wallet-item-balance ${isLow ? 'insufficient' : ''}" style="font-weight: 850; font-size: 15.5px;">${balanceVal}</span>
              <span style="font-size: 13px; color: var(--muted); font-weight: 700;"> 點</span>
            </div>
          </div>
          ${isLow ? `
            <div style="color: var(--danger); font-size: 12px; font-weight: 700; background: rgba(239, 68, 68, 0.05); padding: 8px; border-radius: 8px; text-align: center; margin-top: 2px;">
              ⚠️ 餘額不足以支付下週預約，請儘速儲值
            </div>
          ` : ''}
          <button type="button" class="btn-secondary" style="width: 100%; margin-top: 8px; font-size: 12.5px; border-radius: 10px; height: 38px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; cursor: pointer;" onclick="showTransactions('${m.id}', '${escapeHtml(clubName)}', '${m.payer_member_id || ''}')">
            明細
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
    if (cleanPh) {
      const { data: signups, error: signupsError } = await client
        .from("signups")
        .select("id, status, reservation_date, arrived_count, meetup_id, is_tentative, meetups(id, name, start_time, end_time, address)")
        .eq("phone", currentSystemMember.phone)
        .gte("reservation_date", toISODate(new Date()))
        .neq("status", "cancelled")
        .order("reservation_date", { ascending: true });

      upcomingList.innerHTML = "";
      if (!signupsError && signups && signups.length > 0) {
        signups.forEach(s => {
          const dateStr = s.reservation_date;
          const meetupName = s.meetups?.name || "匹克球活動";
          const timeStr = s.meetups?.start_time ? s.meetups.start_time.slice(0, 5) : "";
          const statusLabel = s.status === 'confirmed' ? '✓ 正取' : (s.is_tentative ? '⏳ 彈性候補' : '⏳ 備取');
          const arrivedLabel = s.arrived_count > 0 ? ' (已簽到已扣點)' : '';

          const div = document.createElement("div");
          div.className = "booking-item-card";
          
          const badgeClass = s.status === 'confirmed' ? 'confirmed' : 'pending';
          const blockCheck = isCancelBlocked(s.meetups, dateStr);
          
          if (s.status === 'waitlist' && s.is_tentative) {
            div.style.flexDirection = "column";
            div.style.alignItems = "stretch";
            
            let actionButtonsHtml = "";
            if (!blockCheck.blocked && s.arrived_count === 0) {
              actionButtonsHtml += `
                <button type="button" class="btn-ghost" style="font-size: 12.5px; font-weight: 800; height: 32px; padding: 0 12px; border-radius: 8px; cursor: pointer; color: var(--red); border: 1px solid var(--red); background: transparent; transition: all 0.2s ease; margin-right: 8px;" onclick="cancelMemberDashboardSignup('${s.id}', '${escapeHtml(meetupName)}')">
                  取消預約
                </button>
              `;
            }
            actionButtonsHtml += `
              <button type="button" class="btn-secondary" style="font-size: 12.5px; font-weight: 800; height: 32px; padding: 0 12px; border-radius: 8px; cursor: pointer; background: var(--surface); border: 1px solid var(--accent); color: var(--accent); transition: all 0.2s ease;" onclick="promoteTentative('${s.id}')">
                確認出席轉正 ➔
              </button>
            `;
            
            div.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div>
                  <span style="font-weight: 800; font-size: 14.5px; color: var(--text);">${escapeHtml(dateStr)} ${timeStr}</span>
                  <p style="font-size: 12.5px; color: var(--muted); margin-top: 4px; font-weight: 600;">
                    ${escapeHtml(meetupName)}${arrivedLabel ? ' <span style="color: var(--primary); font-weight: 800; font-size: 11.5px;">(已簽到已扣點)</span>' : ''}
                  </p>
                </div>
                <span class="status-badge pending">⏳ 彈性候補</span>
              </div>
              <div style="width: 100%; margin-top: 10px; border-top: 1px dashed var(--line); padding-top: 8px; display: flex; justify-content: flex-end;">
                ${actionButtonsHtml}
              </div>
            `;
          } else {
            let cancelBtnHtml = "";
            if (!blockCheck.blocked && s.arrived_count === 0) {
              cancelBtnHtml = `
                <div style="width: 100%; margin-top: 10px; border-top: 1px dashed var(--line); padding-top: 8px; display: flex; justify-content: flex-end;">
                  <button type="button" class="btn-ghost" style="font-size: 12.5px; font-weight: 800; height: 32px; padding: 0 12px; border-radius: 8px; cursor: pointer; color: var(--red); border: 1px solid var(--red); background: transparent; transition: all 0.2s ease;" onclick="cancelMemberDashboardSignup('${s.id}', '${escapeHtml(meetupName)}')">
                    取消預約
                  </button>
                </div>
              `;
              div.style.flexDirection = "column";
              div.style.alignItems = "stretch";
            }
            
            div.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div>
                  <span style="font-weight: 800; font-size: 14.5px; color: var(--text);">${escapeHtml(dateStr)} ${timeStr}</span>
                  <p style="font-size: 12.5px; color: var(--muted); margin-top: 4px; font-weight: 600;">
                    ${escapeHtml(meetupName)}${arrivedLabel ? ' <span style="color: var(--primary); font-weight: 800; font-size: 11.5px;">(已簽到已扣點)</span>' : ''}
                  </p>
                </div>
                <span class="status-badge ${badgeClass}">${statusLabel}</span>
              </div>
              ${cancelBtnHtml}
            `;
          }
          upcomingList.appendChild(div);
        });
      } else {
        upcomingList.innerHTML = `<p style="color: var(--muted); font-size: 13.5px; font-style: italic;">近期無任何預約紀錄</p>`;
      }
    } else {
      upcomingList.innerHTML = `<p style="color: var(--muted); font-size: 13.5px; font-style: italic;">請在下方編輯設定手機號碼以讀取您的預約紀錄</p>`;
    }
  }
}

window.cancelMemberDashboardSignup = async function(signupId, meetupName) {
  if (!confirm(`確定要取消「${meetupName}」的預約嗎？`)) return;
  try {
    const { data: signup, error: getError } = await client
      .from("signups")
      .select("meetup_id, reservation_date, phone")
      .eq("id", parseInt(signupId))
      .single();
    if (getError) throw getError;

    const { data, error } = await client.rpc("cancel_signup_by_phone", {
      p_meetup_id: signup.meetup_id,
      p_reservation_date: signup.reservation_date,
      p_phone: signup.phone,
      p_cancel_people_count: 999
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.ok === false) {
      alert(result.message || "取消失敗。");
    } else {
      const actionType = result?.action_type;
      const successMessage = actionType === "member_absence_created"
        ? "已完成會員請假，當天不會列入名單，名額已釋出。"
        : (result?.message || "已成功取消預約！");
      alert(successMessage);
      if (typeof loadMemberDashboard === "function") {
        await loadMemberDashboard();
      }
      await refreshAll(true);
    }
  } catch (err) {
    alert("取消失敗：" + (err.message || String(err)));
  }
};

window.promoteTentative = async function(signupId) {
  if (!confirm("確定要將此預約轉為正式席位嗎？")) return;
  try {
    const { data, error } = await client.rpc("promote_tentative_signup", {
      p_signup_id: parseInt(signupId)
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.ok === false) {
      alert(result.message || "無法手動轉正。");
    } else {
      alert(result?.message || "已成功轉為正式正取席位！");
      if (typeof loadMemberDashboard === "function") {
        await loadMemberDashboard();
      }
      await refreshAll(true);
    }
  } catch (err) {
    alert("操作失敗：" + (err.message || String(err)));
  }
};

window.promoteTentativeGuest = async function(signupId) {
  if (!confirm("確定要將此預約轉為正式席位嗎？")) return;
  try {
    const { data, error } = await client.rpc("promote_tentative_signup", {
      p_signup_id: parseInt(signupId)
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.ok === false) {
      alert(result.message || "無法手動轉正。");
    } else {
      alert(result?.message || "已成功轉為正式正取席位！");
      $("cancelFormSecondStep").style.display = "none";
      $("queryResultText").textContent = "";
      if (typeof loadMemberDashboard === "function") {
        await loadMemberDashboard();
      }
      await refreshAll(true);
    }
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
  $("transactionModal").classList.add("show");

  const targetId = payerMemberId && payerMemberId !== 'null' ? payerMemberId : memberId;

  try {
    const { data, error } = await client
      .from("wallet_transactions")
      .select("id, amount, type, reservation_date, notes, created_at")
      .eq("member_id", targetId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p style="color: var(--muted); text-align: center; padding: 20px;">尚無任何交易與扣點明細紀錄</p>`;
      return;
    }

    container.innerHTML = data.map(t => {
      const typeLabel = t.type === 'topup' ? '儲值' : (t.type === 'checkin' ? '出席扣款' : '取消退款');
      const amountColor = t.amount >= 0 ? '#16A34A' : '#EF4444';
      const amountLabel = t.amount >= 0 ? `+${t.amount} 點` : `-${Math.abs(t.amount)} 點`;
      const dateText = t.reservation_date ? ` (${t.reservation_date})` : '';
      const notesText = t.notes ? `<p style="font-size: 11px; color: var(--muted); margin-top: 2px;">${escapeHtml(t.notes)}</p>` : '';
      const timeStr = new Date(t.created_at).toLocaleString();

      return `
        <div style="border-bottom: 1px solid var(--line); padding: 12px 6px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-weight: 800; font-size: 13.5px; color: var(--text);">${typeLabel}${dateText}</span>
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

async function handleUpdateProfile(e) {
  e.preventDefault();
  if (!currentUser || !currentSystemMember) return;
  const nickname = $("profileNickname").value.trim();
  const phone = cleanPhone($("profilePhone").value);
  const msgEl = $("profileMessage");
  if (!nickname) return setMessage(msgEl, "請填寫姓名或暱稱", false);
  if (phone && !validatePhone(phone)) return setMessage(msgEl, "手機格式不正確", false);

  try {
    setMessage(msgEl, "更新中...", true);
    const { data, error } = await client
      .from("system_members")
      .update({ nickname, phone, created_at: new Date().toISOString() })
      .eq("id", currentUser.id)
      .select()
      .single();

    if (error) throw error;
    currentSystemMember = data;

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
  const loadingContainer = $("memberLoading");
  const authContainer = $("authContainer");
  if (authContainer) authContainer.style.display = "none";
  if (loadingContainer) {
    loadingContainer.style.display = "flex";
    const textEl = loadingContainer.querySelector("span");
    if (textEl) textEl.textContent = "正在跳轉至 LINE 登入頁面...";
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'custom:line',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
      queryParams: {
        bot_prompt: 'aggressive'
      }
    }
  });
  if (error) {
    alert("LINE 登入啟動失敗：" + error.message);
    toggleAuthView(false);
  }
}

function toggleAuthView(isLoggedIn) {
  const loadingContainer = $("memberLoading");
  const authContainer = $("authContainer");
  const memberDashboard = $("memberDashboard");
  
  if (loadingContainer) loadingContainer.style.display = "none";
  
  const welcomeEl = $("headerWelcome");
  if (welcomeEl) {
    if (isLoggedIn) {
      const name = currentSystemMember?.nickname || currentUser?.email || "球友";
      let phoneWarningHtml = "";
      if (!currentSystemMember?.phone) {
        phoneWarningHtml = `<span style="background-color:#FFFBEB;color:#D97706;font-size:11.5px;font-weight:900;padding:2px 8px;border-radius:999px;margin-left:6px;border:1px solid #FDE68A;display:inline-flex;align-items:center;gap:3px;vertical-align:middle;">⚠️ 設定手機</span>`;
      }
      welcomeEl.innerHTML = `👋 您好，<span style="color:#15803d;margin-left:2px">${name}</span>！${phoneWarningHtml}`;
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
$("closeTransactionModal")?.addEventListener("click", () => $("transactionModal")?.classList.remove("show"));
$("transactionModal")?.addEventListener("click", (e) => { if (e.target.id === "transactionModal") $("transactionModal")?.classList.remove("show"); });
$("signupModal")?.addEventListener("click", (e) => { if (e.target.id === "signupModal") closeSignup(); });
$("cancelModal")?.addEventListener("click", (e) => { if (e.target.id === "cancelModal") closeCancel(); });
$("signupForm")?.addEventListener("submit", handleSignup);
$("cancelForm")?.addEventListener("submit", handleCancel);
$("queryCancelBtn")?.addEventListener("click", handleQueryCancel);
$("queryPointsBtn")?.addEventListener("click", handleQueryPoints);
$("logoutBtn")?.addEventListener("click", async () => { sessionStorage.setItem("user_logged_out", "true"); await client.auth.signOut(); currentUser = null; currentSystemMember = null; toggleAuthView(false); });
$("lineLoginBtn")?.addEventListener("click", handleLineLogin);
$("authForm")?.addEventListener("submit", handleAuthSubmit);
$("updateProfileForm")?.addEventListener("submit", handleUpdateProfile);
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
if ($("knowledgeList")) renderStaticContent();

(async function init() {
  if ($("announcementList")) await loadAnnouncements();
  try { if ($("daysGrid")) await loadAvailableWeekdays(); } catch (e) { console.error(e); }

  client.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      sessionStorage.removeItem("user_logged_out");
      currentUser = session.user;
      currentSystemMember = await ensureSystemMember(currentUser);
      toggleAuthView(true);
      if ($("memberDashboard")) loadMemberDashboard();
    } else {
      currentUser = null;
      currentSystemMember = null;
      toggleAuthView(false);
    }
  });

  const { data: { session } } = await client.auth.getSession();
  if (session?.user) {
    sessionStorage.removeItem("user_logged_out");
    currentUser = session.user;
    currentSystemMember = await ensureSystemMember(currentUser);
    toggleAuthView(true);
    if ($("memberDashboard")) loadMemberDashboard();
  } else {
    // If inside LINE in-app browser, not logged out manually, and not currently returning from auth redirect
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

  if ($("authTabLogin")) initAuthTabs();
  refreshAll();
})();
