"use client";

import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    let cancelled = false;

    function loadBookingScript() {
      if (cancelled) return;
      if (!window.supabase) {
        setTimeout(loadBookingScript, 80);
        return;
      }
      if (document.getElementById("booking-runtime-script")) return;
      const script = document.createElement("script");
      script.id = "booking-runtime-script";
      script.src = "/booking-app.js";
      script.async = false;
      document.body.appendChild(script);
    }

    loadBookingScript();

    return () => {
      cancelled = true;
      const oldScript = document.getElementById("booking-runtime-script");
      if (oldScript) oldScript.remove();
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: `<main class="page">
    <header class="topbar">
      <a class="brand" href="#top" aria-label="回到首頁">
        <span class="logo">🏓</span>
        <span>匹克球同樂會</span>
      </a>
      <nav class="nav" aria-label="主要選單">
        <a href="#main-tabs" data-open-tab="noticePanel">公告</a>
        <a href="#main-tabs" data-open-tab="knowledgePanel">小知識</a>
        <a href="#main-tabs" class="primary-link" data-open-tab="bookingPanel">立即預約</a>
      </nav>
    </header>

    <section id="top" class="hero">
      <div class="hero-main">
        <div class="hero-content">
          <div class="eyebrow">🏓 PICKLEBALL BOOKING</div>
          <h1>想打球，選一天就好。</h1>
          <p>歡迎來到匹克球同樂會！在下方月曆點選有標示小點的日期，即可一覽當天所有球團、時間與場地。填寫暱稱與手機即可迅速完成預約，無需繁瑣註冊。</p>
          <div class="hero-actions">
            <a class="hero-btn main" href="#main-tabs" data-open-tab="bookingPanel">查看可報名日期</a>
            <a class="hero-btn sub" href="#main-tabs" data-open-tab="noticePanel">閱讀最新公告</a>
          </div>
        </div>
      </div>
    </section>

    <section class="tab-shell" id="main-tabs">
      <div class="tabs" role="tablist" aria-label="網站分頁">
        <button class="tab-btn active" data-tab="bookingPanel" type="button">📅 線上預約</button>
        <button class="tab-btn" data-tab="noticePanel" type="button">📢 公告</button>
        <button class="tab-btn" data-tab="knowledgePanel" type="button">🏓 小知識</button>
        <button class="tab-btn" data-tab="faqPanel" type="button">❓ 常見問題</button>
      </div>

      <section id="bookingPanel" class="tab-panel active">
        <section id="booking" class="section">
          <div class="section-head">
            <div>
              <div class="section-kicker">BOOKING</div>
              <h2 class="section-title">線上預約</h2>
              <p class="section-sub">選擇日期後，就能看到當天可報名的團。</p>
            </div>
            <div class="booking-controls">
              <label class="city-filter-label">城市
                <select id="cityFilter" class="city-filter-select" aria-label="篩選城市">
                  <option value="all">全部城市</option>
                </select>
              </label>
              <button class="btn-secondary" id="refreshBtn">重新整理</button>
            </div>
          </div>
          <div class="booking-card">
            <div class="layout">
              <div class="calendar-card">
                <div class="calendar-head">
                  <button class="icon-btn" id="prevMonth" aria-label="上一個月">‹</button>
                  <div class="month-title" id="monthTitle">--</div>
                  <button class="icon-btn" id="nextMonth" aria-label="下一個月">›</button>
                </div>
                <div class="week-row" id="weekRow"></div>
                <div class="days-grid" id="daysGrid"></div>
                <div class="hint"><span class="dot"></span><span>有小點的日期可以報名</span></div>
                
                <div class="points-card" style="display: none;">
                  <h3 class="points-title">
                    <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                    會員點數/額度查詢
                  </h3>
                  <p class="points-desc">輸入註冊手機號碼，即可查詢剩餘可用次數與期限。</p>
                  <div class="points-row">
                    <input id="queryPointsPhone" placeholder="例如：0912345678" inputmode="numeric" maxLength="12" />
                    <button id="queryPointsBtn">查詢</button>
                  </div>
                  <p id="queryPointsResult"></p>
                </div>
              </div>

              <div class="list-card">
                <div class="list-head">
                  <div>
                    <h2 class="section-title" style="font-size:24px">當天可報名</h2>
                    <p class="muted"><span id="selectedDateText" class="selected-date">--</span></p>
                  </div>
                </div>
                <div class="cards" id="meetupList"></div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section id="noticePanel" class="tab-panel">
        <section id="notice" class="section">
          <div class="section-head">
            <div>
              <div class="section-kicker">NOTICE</div>
              <h2 class="section-title">公告與提醒</h2>
              <p class="section-sub">這裡會放最新活動提醒、雨天規則與新手須知。</p>
            </div>
          </div>
          <div class="notice-grid" id="announcementList"></div>
        </section>
      </section>

      <section id="knowledgePanel" class="tab-panel">
        <section id="tips" class="section">
          <div class="section-head">
            <div>
              <div class="section-kicker">BEGINNER GUIDE</div>
              <h2 class="section-title">匹克球小知識</h2>
              <p class="section-sub">把 App 裡的小知識整理成卡片，第一次參加也能先快速了解。</p>
            </div>
          </div>
          <div class="knowledge-grid" id="knowledgeList"></div>
        </section>
      </section>

      <section id="faqPanel" class="tab-panel">
        <section class="section">
          <div class="section-head">
            <div>
              <div class="section-kicker">FAQ</div>
              <h2 class="section-title">常見問題</h2>
            </div>
          </div>
          <div class="faq">
            <article class="tip-card"><h3>報名後可以取消嗎？</h3><p>可以。到該日期的團體卡片點「取消預約」，輸入報名手機即可取消；當天不開放線上取消，請直接聯絡團長處理續數與名額調整。</p></article>
            <article class="tip-card"><h3>我沒有打過可以參加嗎？</h3><p>可以。報名時勾選新手，現場會依活動狀況協助安排。</p></article>
            <article class="tip-card"><h3>看不到可報名日期？</h3><p>代表目前尚未開放該月份場次，請換月份查看或留意公告。</p></article>
          </div>
        </section>
      </section>
    </section>

    <footer class="footer">匹克球同樂會｜線上預約系統</footer>
  </main>

  <div class="modal" id="signupModal">
    <div class="modal-card">
      <div class="modal-head">
        <div>
          <h2 class="section-title" id="modalTitle" style="font-size:24px">我要報名</h2>
          <p class="muted" id="modalSubtitle">--</p>
        </div>
        <button class="close-btn" id="closeModal">×</button>
      </div>
      <form class="form" id="signupForm">
        <label>暱稱
          <input id="nickname" placeholder="例如：小明" autocomplete="name" />
        </label>
        <label>手機
          <input id="phone" placeholder="0912345678" inputmode="numeric" autocomplete="tel" />
          <span class="muted" style="font-size:13px;">電話僅作為取消預約或會員請假識別使用，不作其他用途。</span>
        </label>
        <label>你的程度
          <select id="skillLevel">
            <option value="first_time">第一次需要教學</option>
            <option value="beginner" selected>初學</option>
            <option value="normal">一般</option>
            <option value="advanced">進階</option>
          </select>
          <span class="muted" style="font-size:13px;">讓發起人更好安排分組。</span>
        </label>
        <label style="display: none;">預約人數
          <select id="peopleCount">
            <option value="1" selected>1 人</option>
            <option value="2">2 人</option>
            <option value="3">3 人</option>
            <option value="4">4 人</option>
            <option value="5">5 人</option>
          </select>
          <span class="muted" style="font-size:13px;">包含自己。若有多人請在此選擇，不需重複報名。</span>
        </label>
        <label>備註，可不填
          <textarea id="note" placeholder="有想先告知的事可以寫在這裡"></textarea>
        </label>
        <button class="btn-primary" id="submitBtn" type="submit">確認報名</button>
      </form>
      <div class="message" id="formMessage"></div>
    </div>
  </div>

  <div class="modal" id="cancelModal">
    <div class="modal-card">
      <div class="modal-head">
        <div>
          <h2 class="section-title" style="font-size:24px">取消預約</h2>
          <p class="muted" id="cancelSubtitle">輸入報名時的手機即可取消。當天不開放線上取消，請直接聯絡團長處理續數與名額調整。</p>
        </div>
        <button class="close-btn" id="closeCancelModal">×</button>
      </div>
      <form class="form" id="cancelForm">
        <label>報名手機
          <input id="cancelPhone" placeholder="0912345678" inputmode="numeric" autocomplete="tel" />
          <button class="btn-primary" id="queryCancelBtn" type="button" style="margin-top: 8px;">查詢預約</button>
        </label>
        <div id="cancelFormSecondStep" style="display: none; margin-top: 16px;">
          <p id="queryResultText" style="font-weight: bold; color: #0d9488; margin-bottom: 12px; font-size: 15px;"></p>
          <label style="display: none;">取消人數
            <select id="cancelPeopleCount">
              <option value="1" selected>1 人</option>
            </select>
            <span class="muted" style="font-size:13px;">如果有多人報名且只想取消部分人數，請選擇要取消的人數。</span>
          </label>
          <button class="btn-danger" id="cancelSubmitBtn" type="submit" style="margin-top: 12px;">確認取消</button>
        </div>
      </form>
      <div class="message" id="cancelMessage"></div>
    </div>
  </div>` }} />;
}
