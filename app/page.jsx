"use client";

export default function Page() {
  return (
    <>
      {/* Slim Daily Pulse Banner (Replaces bulky Hero) */}
      <div className="daily-pulse-banner" id="dailyPulseBanner">
        <div className="pulse-content">
          <span className="pulse-icon" id="pulseIcon">🎾</span>
          <span className="pulse-text" id="pulseText">正在載入今日球團概況...</span>
        </div>
        <button className="btn-pickup-trigger" id="openCreatePickupBtn">
          <span>➕</span> 我要自揪
        </button>
      </div>

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
              <div id="modalInfoBadges" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                <span id="modalFeeBadge" style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", padding: "4px 10px", borderRadius: "8px", fontSize: "13px", fontWeight: "800" }}>
                  💰 費用：<span id="modalFeeText">--</span>
                </span>
                <span id="modalAddressBadge" style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", padding: "4px 10px", borderRadius: "8px", fontSize: "13px", fontWeight: "700" }}>
                  📍 <span id="modalAddressText">--</span>
                </span>
              </div>
              <div id="modalNotesBox" style={{ display: "none", background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "4px solid var(--accent, #10b981)", padding: "10px 12px", borderRadius: "8px", color: "#334155", fontSize: "13px", fontWeight: "600", marginTop: "10px", lineHeight: "1.5" }}>
                <strong style={{ color: "var(--accent, #10b981)", display: "block", marginBottom: "3px" }}>📝 開團備註說明：</strong>
                <span id="modalNotesText"></span>
              </div>
              <div id="ratingLimitWarning" style={{ display: "none", background: "#FEF3C7", border: "1px solid #D97706", padding: "10px 12px", borderRadius: "10px", color: "#B45309", fontSize: "13px", fontWeight: "700", marginTop: "10px", lineHeight: "1.4" }}></div>
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
            <label style={{ display: "none" }}>
              <input type="checkbox" id="isTentative" style={{ width: "18px", height: "18px", margin: 0, cursor: "pointer" }} />
              <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text)" }}>排彈性候補 (直接排備取，不佔正取名額)</span>
            </label>
            <div id="signupPasswordRow" style={{ display: "none", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px", margin: "10px 0" }}>
              <label style={{ margin: 0, color: "#92400e", fontWeight: "800", fontSize: "13.5px" }}>
                🔒 報名通關密碼 (本場次為私人密碼團)
                <input id="signupPassword" placeholder="請輸入發起人提供的通關密碼" style={{ marginTop: "6px", borderColor: "#f59e0b", background: "#ffffff" }} />
              </label>
            </div>
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
              <h2 className="section-title" style={{ fontSize: "24px" }}>預約管理</h2>
              <p className="muted" id="cancelSubtitle">輸入報名手機即可進行查詢、取消預約或確認出席轉正。</p>
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
              <label style={{ display: "none", marginBottom: "12px" }}>取消人數
                <select id="cancelPeopleCount"></select>
              </label>
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button className="btn-danger" id="cancelSubmitBtn" type="submit" style={{ flex: 1, margin: 0 }}>取消預約</button>
                <button className="btn-primary" id="guestPromoteBtn" type="button" style={{ flex: 1, margin: 0, display: "none", backgroundColor: "var(--accent)", borderColor: "var(--accent)" }}>確認出席轉正</button>
              </div>
            </div>
          </form>
          <div className="message" id="cancelMessage"></div>
        </div>
      </div>

      {/* Create Member Pickup Modal */}
      <div className="modal" id="createPickupModal">
        <div className="modal-card">
          <div className="modal-head">
            <div>
              <h2 className="section-title" style={{ fontSize: "24px" }}>發起單日自揪</h2>
              <p className="muted">自發臨時揪團，發起後系統會自動將您加入正取第 1 位！</p>
            </div>
            <button className="close-btn" id="closeCreatePickupModal">×</button>
          </div>
          <form className="form" id="createPickupForm">
            <label>活動主題
              <input id="pickupName" placeholder="例如：週六下午暢打、新手交流" required />
            </label>
            <label>活動日期
              <input id="pickupDate" type="date" required />
            </label>
            <label>開始時間
              <input id="pickupStartTime" type="time" defaultValue="14:00" required />
            </label>
            <label>結束時間
              <input id="pickupEndTime" type="time" defaultValue="16:00" required />
            </label>
            <label>活動縣市
              <select id="pickupCity" required></select>
            </label>
            <label>球場地點
              <input id="pickupAddress" placeholder="例如：南屯匹克球場 2 號場" required />
            </label>
            <label>詳細地址（選填，供導航）
              <input id="pickupStreetAddress" placeholder="例如：文心南七路 (填寫後可直接在地圖導航)" />
            </label>
            <label>人數上限
              <input id="pickupCapacity" type="number" min="2" max="32" defaultValue="4" required />
            </label>
            <label>每人費用
              <input id="pickupFee" placeholder="例如：平分80元、免費" defaultValue="場租平分" required />
            </label>
            <label>備註說明（選填）
              <textarea id="pickupNotes" placeholder="例如：自備球拍，使用 Dura 40 競賽球，歡迎友善切磋交流。"></textarea>
            </label>
            <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: "12px", padding: "14px", marginTop: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", flexDirection: "row", cursor: "pointer", margin: 0, userSelect: "none" }}>
                <input type="checkbox" id="pickupIsPrivate" style={{ width: "18px", height: "18px", margin: 0, cursor: "pointer" }} />
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>🔒 設為私人密碼團（先讓朋友報名）</span>
              </label>
              <div id="pickupPasswordWrap" style={{ display: "none", marginTop: "10px" }}>
                <label style={{ margin: 0, fontSize: "13px" }}>設定通關密碼 (例如：1234 或通關暗號)
                  <input id="pickupJoinPassword" placeholder="輸入通關密碼，朋友憑此密碼報名" style={{ marginTop: "4px" }} />
                </label>
                <p className="muted" style={{ fontSize: "12px", margin: "4px 0 0 0", color: "#64748b" }}>
                  💡 好友報名確認後，發起人可隨時在「預約管理」將密碼清空，直接轉為公開團開放大眾！
                </p>
              </div>
            </div>
            <button className="btn-primary" id="submitPickupBtn" type="submit" style={{ height: "46px", fontSize: "15px", marginTop: "12px" }}>
              確認發起揪團
            </button>
          </form>
          <div className="message" id="pickupFormMessage"></div>
        </div>
      </div>
    </>
  );
}
