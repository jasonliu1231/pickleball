const SUPABASE_URL = "https://vurcntmcpemioybqqrcx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Z9nUlOsBQ3cIi37lr00vcw_VdBEDo3o";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

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
  // 從 booking_meetup_weekdays_view 讀取可顯示的固定開團規則。
  // View 會同時帶出團體、發起人與推播 token。
  let query = client
    .from("booking_meetup_weekdays_view")
    .select("id,weekday,start_date,is_active,weekday_is_active,city")
    .eq("is_active", true)
    .eq("weekday_is_active", true);
  query = applyCityFilter(query);
  const { data, error } = await query;
  if (error) throw error;

  availableRules = (data || []).map((x) => ({
    weekday: x.weekday,
    start_date: x.start_date || null,
  }));
}

function hasAvailableMeetupOnDate(dateStr) {
  const weekday = dateFromISO(dateStr).getDay();
  return availableRules.some((rule) => {
    if (Number(rule.weekday) !== weekday) return false;
    if (!rule.start_date) return true;
    return dateStr >= rule.start_date;
  });
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

  const rows = (data || []).map((m) => ({
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
  return rows.map((m) => {
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
  $("monthTitle").textContent = monthTitle(visibleMonth);
  $("weekRow").innerHTML = weekdays.map(w => `<div>${w}</div>`).join("");
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
  $("daysGrid").innerHTML = cells.map((dateStr) => {
    if (!dateStr) return `<button class="day empty" tabindex="-1"></button>`;
    const d = dateFromISO(dateStr);
    const isPast = dateStr < today;
    const has = hasAvailableMeetupOnDate(dateStr);
    const selected = dateStr === selectedDate;
    return `<button class="day ${isPast ? "past" : ""} ${has && !isPast ? "available" : ""} ${selected ? "selected" : ""}" data-date="${dateStr}">
      <span>${d.getDate()}</span>${has && !isPast ? `<span class="dot"></span>` : ""}
    </button>`;
  }).join("");
  document.querySelectorAll(".day[data-date]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedDate = btn.dataset.date;
      visibleMonth = selectedDate.slice(0, 7) + "-01";
      refreshAll(false);
    });
  });
}

function renderMeetups(meetups) {
  $("selectedDateText").textContent = formatDate(selectedDate);
  if (!meetups.length) {
    $("meetupList").innerHTML = `<p class="empty">這天目前沒有開放報名，請換一天看看。</p>`;
    return;
  }
  $("meetupList").innerHTML = meetups.map((m) => {
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
    return `<article class="meetup-card" data-meetup-id="${m.id}">
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
        <span class="badge ${full ? "full" : ""}">${full ? "可備取" : cap > 0 ? `剩 ${left}` : "可報名"}</span>
      </div>
      <div class="info-grid">
        <div class="info"><strong>發起人</strong>${escapeHtml(m.organizer_name || "未設定")}</div>
        <div class="info"><strong>城市</strong>${escapeHtml(m.city || "未設定")}</div>
        <div class="info"><strong>日期</strong>${shortDate(selectedDate)}</div>
        <div class="info"><strong>時間</strong>${timeText(m.start_time, m.end_time)}</div>
        <div class="info"><strong>費用</strong>${escapeHtml(m.fee || "現場公告")}</div>
        <div class="info"><strong>人數</strong>${cap > 0 ? `${displayConfirmed}/${cap} 人` : `${realConfirmed} 人`}</div>
        <div class="info"><strong>備取</strong>${waitlistCount} 人</div>
        ${memberCount ? `<div class="info"><strong>會員</strong>${memberCount} 人</div>` : ""}
      </div>
      ${m.notes ? `<p class="note">${escapeHtml(m.notes)}</p>` : ""}
      <div class="actions">
        <button class="btn-primary signup-btn">${full ? "加入備取" : "我要報名"}</button>
        <button class="btn-secondary roster-btn">查看名單</button>
        <button class="btn-ghost cancel-btn">取消預約</button>
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
  });
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
  
  const peopleCountLabel = $("peopleCount")?.closest("label");
  if (peopleCountLabel) {
    peopleCountLabel.style.display = meetup.allow_multiple_people ? "grid" : "none";
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
  const baseText = `${meetup.name || "活動"}｜${formatDate(selectedDate)}｜一般報名者會取消預約，固定會員會登記請假。`;
  $("cancelSubtitle").textContent = isTodayDate(selectedDate)
    ? `${baseText}｜提醒：${sameDayCancelMessage()}`
    : baseText;
  $("queryCancelBtn").disabled = isTodayDate(selectedDate);
  $("cancelSubmitBtn").disabled = isTodayDate(selectedDate);
  $("cancelSubmitBtn").textContent = isTodayDate(selectedDate) ? "當天不可線上取消" : "確認取消";
  if (isTodayDate(selectedDate)) setMessage($("cancelMessage"), sameDayCancelMessage(), false);
  $("cancelModal").classList.add("show");
}
function closeCancel() { $("cancelModal").classList.remove("show"); currentMeetup = null; }

async function handleQueryCancel() {
  if (!currentMeetup) return;
  if (isTodayDate(selectedDate)) return setMessage($("cancelMessage"), sameDayCancelMessage(), false);
  const phone = cleanPhone($("cancelPhone").value);
  if (!validatePhone(phone)) return setMessage($("cancelMessage"), "請輸入正確手機號碼，例如 0912345678。", false);

  clearMessage($("cancelMessage"));
  $("queryCancelBtn").disabled = true;
  $("queryCancelBtn").textContent = "查詢中...";
  try {
    const { data, error } = await client
      .from("signups")
      .select("id, nickname, people_count, status")
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
    select.innerHTML = "";
    const count = Number(data.people_count || 1);
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

    const statusText = data.status === "waitlist" ? "備取" : "正取";
    $("queryResultText").textContent = `查得預約：${data.nickname || "球友"} (${statusText} ${count}人)`;
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
  const peopleCount = parseInt($("peopleCount").value) || 1;
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
      p_people_count: peopleCount
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.ok === false) return setMessage($("formMessage"), result.message || "無法完成報名。", false);
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

async function handleCancel(e) {
  e.preventDefault();
  if (!currentMeetup) return;
  if (isTodayDate(selectedDate)) return setMessage($("cancelMessage"), sameDayCancelMessage(), false);
  const phone = cleanPhone($("cancelPhone").value);
  const cancelPeopleCount = parseInt($("cancelPeopleCount").value) || 1;
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
  renderCalendar();
  $("selectedDateText").textContent = formatDate(selectedDate);
  if (showLoading) $("meetupList").innerHTML = `<p class="empty">讀取中...</p>`;
  try {
    const meetups = await loadMeetupsByDate(selectedDate);
    renderCalendar();
    renderMeetups(meetups);
  } catch (e) {
    $("meetupList").innerHTML = `<p class="empty">資料讀取失敗，請稍後再試。</p>`;
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
        <p class="muted">${escapeHtml(item.content)}</p>
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
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
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

$("prevMonth").addEventListener("click", () => { visibleMonth = addMonths(visibleMonth, -1); renderCalendar(); });
$("nextMonth").addEventListener("click", () => { visibleMonth = addMonths(visibleMonth, 1); renderCalendar(); });
$("refreshBtn").addEventListener("click", async () => { clearRosterCache(); await loadAvailableWeekdays(); refreshAll(); });
$("cityFilter")?.addEventListener("change", async (e) => {
  selectedCity = e.target.value || "all";
  clearRosterCache();
  await loadAvailableWeekdays();
  refreshAll();
});
$("closeModal").addEventListener("click", closeSignup);
$("closeCancelModal").addEventListener("click", closeCancel);
$("signupModal").addEventListener("click", (e) => { if (e.target.id === "signupModal") closeSignup(); });
$("cancelModal").addEventListener("click", (e) => { if (e.target.id === "cancelModal") closeCancel(); });
$("signupForm").addEventListener("submit", handleSignup);
$("cancelForm").addEventListener("submit", handleCancel);
$("queryCancelBtn").addEventListener("click", handleQueryCancel);
$("queryPointsBtn")?.addEventListener("click", handleQueryPoints);


document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => openTab(btn.dataset.tab)));
document.querySelectorAll("[data-open-tab]").forEach(link => {
  link.addEventListener("click", () => openTab(link.dataset.openTab));
});
renderCityFilter();
renderStaticContent();

(async function init() {
  await loadAnnouncements();
  try { await loadAvailableWeekdays(); } catch (e) { console.error(e); }
  refreshAll();
})();
