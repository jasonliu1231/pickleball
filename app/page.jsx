"use client";

export default function Page() {
  return (
    <>
      <section id="top" className="hero">
        <div className="hero-main">
          <div className="hero-content">
            <div className="eyebrow">🏓 PICKLEBALL BOOKING</div>
            <h1>想打球，選一天就好。</h1>
            <p>歡迎來到匹克球同樂會！在下方月曆點選有標示小點的日期，即可一覽當天所有球團、時間與場地。填寫暱稱與手機即可迅速完成預約，無需繁瑣註冊。</p>
            <div className="hero-actions">
              <a className="hero-btn main" href="#booking">查看可報名日期 ➔</a>
            </div>
          </div>
        </div>
      </section>

      <div className="tab-shell">
        <div className="tab-panel active">
          <section id="booking" className="section">
            <div className="section-head">
              <div>
                <div className="section-kicker">BOOKING</div>
                <h2 className="section-title">線上預約</h2>
                <p className="section-sub">選擇日期後，就能看到當天可報名的團。</p>
              </div>
              <div className="booking-controls">
                <label className="city-filter-label">城市
                  <select id="cityFilter" className="city-filter-select" aria-label="篩選城市">
                    <option value="all">全部城市</option>
                  </select>
                </label>
                <button className="btn-secondary" id="refreshBtn">重新整理</button>
              </div>
            </div>
            <div className="booking-card">
              <div className="layout">
                <div className="calendar-card">
                  <div className="calendar-head">
                    <button className="icon-btn" id="prevMonth" aria-label="上一個月">‹</button>
                    <div className="month-title" id="monthTitle">--</div>
                    <button className="icon-btn" id="nextMonth" aria-label="下一個月">›</button>
                  </div>
                  <div className="week-row" id="weekRow"></div>
                  <div className="days-grid" id="daysGrid"></div>
                  <div className="hint"><span className="dot"></span><span>有小點的日期可以報名</span></div>
                  
                  <div className="points-card" style={{ display: "none" }}>
                    <h3 className="points-title">
                      <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                      會員點數/額度查詢
                    </h3>
                    <p className="points-desc">輸入註冊手機號碼，即可查詢剩餘可用次數與期限。</p>
                    <div className="points-row">
                      <input id="queryPointsPhone" placeholder="例如：0912345678" inputMode="numeric" maxLength={12} />
                      <button id="queryPointsBtn">查詢</button>
                    </div>
                    <p id="queryPointsResult"></p>
                  </div>
                </div>

                <div className="list-card">
                  <div className="list-head">
                    <div>
                      <h2 className="section-title" style={{ fontSize: "24px" }}>當天可報名</h2>
                      <p className="muted"><span id="selectedDateText" className="selected-date">--</span></p>
                    </div>
                  </div>
                  <div className="cards" id="meetupList"></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      <div className="modal" id="signupModal">
        <div className="modal-card">
          <div className="modal-head">
            <div>
              <h2 className="section-title" id="modalTitle" style={{ fontSize: "24px" }}>我要報名</h2>
              <p className="muted" id="modalSubtitle">--</p>
            </div>
            <button className="close-btn" id="closeModal">×</button>
          </div>
          <form className="form" id="signupForm">
            <label>暱稱
              <input id="nickname" placeholder="例如：小明" autoComplete="name" />
            </label>
            <label>手機
              <input id="phone" placeholder="0912345678" inputMode="numeric" autoComplete="tel" />
              <span className="muted" style={{ fontSize: "13px" }}>電話僅作為取消預約或會員請假識別使用，不作其他用途。</span>
            </label>
            <label>你的程度
              <select id="skillLevel">
                <option value="first_time">第一次需要教學</option>
                <option value="beginner" defaultValue="beginner">初學</option>
                <option value="normal">一般</option>
                <option value="advanced">進階</option>
              </select>
              <span className="muted" style={{ fontSize: "13px" }}>讓發起人更好安排分組。</span>
            </label>
            <label style={{ display: "none" }}>預約人數
              <select id="peopleCount" defaultValue="1">
                <option value="1">1 人</option>
              </select>
            </label>
            <label>備註，可不填
              <textarea id="note" placeholder="有想先告知的事可以寫在這裡"></textarea>
            </label>
            <button className="btn-primary" id="submitBtn" type="submit">確認報名</button>
          </form>
          <div className="message" id="formMessage"></div>
        </div>
      </div>

      <div className="modal" id="cancelModal">
        <div className="modal-card">
          <div className="modal-head">
            <div>
              <h2 className="section-title" style={{ fontSize: "24px" }}>取消預約</h2>
              <p className="muted" id="cancelSubtitle">輸入報名時的手機即可取消。當天不開放線上取消，請直接聯絡團長處理續數與名額調整。</p>
            </div>
            <button className="close-btn" id="closeCancelModal">×</button>
          </div>
          <form className="form" id="cancelForm">
            <label>報名手機
              <input id="cancelPhone" placeholder="0912345678" inputMode="numeric" autoComplete="tel" />
              <button className="btn-primary" id="queryCancelBtn" type="button" style={{ marginTop: "8px" }}>查詢預約</button>
            </label>
            <div id="cancelFormSecondStep" style={{ display: "none", marginTop: "16px" }}>
              <p id="queryResultText" style={{ fontWeight: "bold", color: "#0d9488", marginBottom: "12px", fontSize: "15px" }}></p>
              <button className="btn-danger" id="cancelSubmitBtn" type="submit" style={{ marginTop: "12px" }}>確認取消</button>
            </div>
          </form>
          <div className="message" id="cancelMessage"></div>
        </div>
      </div>
    </>
  );
}
