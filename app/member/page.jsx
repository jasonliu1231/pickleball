"use client";

export default function MemberPage() {
  return (
    <div className="tab-shell">
      <div className="tab-panel active">
        <section className="section">
          <div className="section-head">
            <div>
              <div className="section-kicker">MEMBER CENTER</div>
              <h2 className="section-title">個人中心</h2>
              <p className="section-sub" id="memberCenterSub">註冊或登入會員，享有 1 鍵快速預約、跨場儲值餘額與交易紀錄查詢。</p>
            </div>
          </div>
          
          {/* Loading Container (Shown during session check) */}
          <div id="memberLoading" className="booking-card" style={{ maxWidth: "480px", margin: "0 auto", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "240px" }}>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes pulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
            `}</style>
            <svg viewBox="0 0 50 50" style={{ width: "40px", height: "40px", animation: "spin 1s linear infinite" }}>
              <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeDasharray="80, 200" strokeDashoffset="0"></circle>
            </svg>
            <span style={{ fontSize: "14px", color: "var(--sub)", fontWeight: "700", animation: "pulse 1.5s ease-in-out infinite", letterSpacing: "0.5px" }}>會員登入驗證中，請稍候...</span>
          </div>

          {/* Auth Form (Hidden if logged in) */}
          <div id="authContainer" className="booking-card" style={{ maxWidth: "480px", margin: "0 auto", padding: "24px", display: "none" }}>
            <div className="auth-tabs" style={{ display: "flex", borderBottom: "2px solid var(--line)", marginBottom: "20px" }}>
              <button id="authTabLogin" className="auth-tab-btn active" style={{ flex: 1, padding: "12px", fontWeight: "800", background: "none", border: "none", cursor: "pointer", color: "var(--accent)", borderBottom: "2px solid var(--accent)" }}>登入</button>
              <button id="authTabRegister" className="auth-tab-btn" style={{ flex: 1, padding: "12px", fontWeight: "800", background: "none", border: "none", cursor: "pointer", color: "var(--sub)" }}>註冊</button>
            </div>
            
            <form id="authForm" className="form">
              <div id="registerFields" style={{ display: "none", gap: "12px", flexDirection: "column" }}>
                <label>姓名/暱稱
                  <input id="authNickname" placeholder="例如：小明" />
                </label>
                <label>手機號碼
                  <input id="authPhone" placeholder="0912345678" inputMode="numeric" />
                </label>
              </div>
              <label style={{ marginTop: "10px" }}>電子信箱
                <input id="authEmail" type="email" placeholder="example@email.com" autoComplete="email" />
              </label>
              <label>密碼
                <input id="authPassword" type="password" placeholder="請輸入密碼 (至少 6 位)" autoComplete="current-password" />
              </label>
              
              <button className="btn-primary" id="authSubmitBtn" type="submit" style={{ marginTop: "12px", width: "100%" }}>確認</button>
              
              <div style={{ textAlign: "center", margin: "16px 0", color: "var(--muted)", fontSize: "13px" }}>或使用快速登入</div>
              
              <button className="btn-secondary" id="lineLoginBtn" type="button" style={{ width: "100%", background: "#06C755", color: "#fff", borderColor: "#06C755", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <span style={{ fontWeight: "900", fontSize: "16px" }}>LINE</span> LINE 快速登入 (免費)
              </button>
            </form>
            <div id="authMessage" className="message" style={{ marginTop: "12px" }}></div>
          </div>
          
          {/* Member Dashboard (Hidden if logged out) */}
          <div id="memberDashboard" style={{ display: "none", flexDirection: "column", gap: "20px" }}>
            {/* Profile Summary Card */}
            <div className="member-profile-card" style={{ background: "linear-gradient(135deg, #064e3b 0%, #15803d 50%, #166534 100%)", color: "#ffffff" }}>
              <div className="profile-main-info" style={{ flex: 1 }}>
                <div className="profile-text-group" style={{ alignItems: "flex-start" }}>
                  <h3 className="profile-welcome" style={{ color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                    👋 哈囉，<span id="dashboardNickname">球友</span>
                  </h3>
                  <div className="profile-badges-row">
                    <span className="info-pill" style={{ color: "rgba(255, 255, 255, 0.95)" }}>
                      📱 <span id="dashboardPhone">未設定</span>
                    </span>
                    <span className="info-pill" id="dashboardRatingPill" style={{ color: "#FEF3C7", background: "rgba(245, 158, 11, 0.22)", borderColor: "rgba(245, 158, 11, 0.35)", borderWidth: "1px", borderStyle: "solid", display: "none" }}>
                      🏆 戰力: <span id="dashboardRating">1000</span> (等同 DUPR <span id="dashboardDupr">2.00</span>)
                    </span>
                    <span className="info-pill info-pill-id" style={{ color: "rgba(255, 255, 255, 0.95)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      🆔 ID: <span id="dashboardMemberId" style={{ maxWidth: "120px", display: "inline-block", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>--</span>
                      <button id="copyIdBtn" type="button" className="copy-btn-sleek">複製 ID</button>
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div id="memberQrContainer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.08)", padding: "14px 20px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.15)", alignSelf: "center" }}>
                <img id="memberQrImg" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="會員 QR Code" style={{ width: "150px", height: "150px", borderRadius: "12px", backgroundColor: "#ffffff", padding: "6px" }} />
                <span style={{ fontSize: "12px", fontWeight: "800", opacity: 0.9, letterSpacing: "0.5px" }}>出示給教練/團主掃描綁定</span>
              </div>

              <button className="logout-btn-sleek" id="logoutBtn" type="button" style={{ color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.3)", backgroundColor: "rgba(255, 255, 255, 0.12)" }}>登出帳號</button>
            </div>
            
            {/* Update Profile Form */}
            <div className="edit-profile-section" style={{ marginTop: "16px" }}>
              <h4 style={{ fontSize: "16px", fontWeight: "900", marginBottom: "16px" }}>✏️ 編輯個人資料</h4>
              <form id="updateProfileForm" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="modern-form-row">
                  <div className="modern-input-group">
                    <label htmlFor="profileNickname">修改暱稱 / 姓名</label>
                    <input id="profileNickname" className="modern-text-input" placeholder="請輸入姓名或暱稱" />
                  </div>
                  <div className="modern-input-group">
                    <label htmlFor="profilePhone">修改手機號碼</label>
                    <input id="profilePhone" className="modern-text-input" placeholder="0912345678" inputMode="numeric" />
                  </div>
                </div>
                <button className="btn-primary" type="submit" style={{ alignSelf: "flex-start", minWidth: "120px", padding: "10px 24px", borderRadius: "12px" }}>儲存修改</button>
              </form>
              <div id="profileMessage" className="message" style={{ marginTop: "8px" }}></div>
            </div>

            <div className="profile-tip-banner" style={{ marginTop: "16px" }}>
              <span style={{ fontSize: "16px" }}>💡</span>
              <span><strong>系統關聯提示</strong>：將您的「系統 ID」提供給球館或團主，即可在後台進行儲值與卡位扣點！若需要接收即時通知與遞補提醒，請 <a href="https://line.me/R/ti/p/%40657kasvh" target="_blank" rel="noopener noreferrer" style={{ color: "#06C755", fontWeight: "900", textDecoration: "underline" }}>點此加入 LINE 官方好友</a>。</span>
            </div>
            
            {/* Warning Banner */}
            <div id="phoneWarningBanner" style={{ display: "none", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "16px", padding: "14px", color: "#B45309", fontWeight: "bold", flexDirection: "row", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>📱</span>
              <span style={{ fontSize: "13.5px", flex: 1 }}>您尚未設定手機號碼！請在下方「編輯個人資料」填寫並儲存手機，以便接收 LINE 遞補通知與自動填寫報名。</span>
            </div>

            <div id="balanceWarningBanner" style={{ display: "none", background: "#FFF1F2", border: "1px solid #FECACA", borderRadius: "16px", padding: "14px", color: "#991B1B", fontWeight: "bold", flexDirection: "row", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>⚠️</span>
              <span style={{ fontSize: "13.5px", flex: 1 }}>您的餘額不足以支付下週的出席費用，請聯絡團長進行儲值，以免影響自動卡位權益。</span>
            </div>

            <div className="dashboard-grid-premium">
              {/* Left: Wallet Balances */}
              <div className="dashboard-panel-card">
                <h4 className="panel-header-title">
                  🪙 我的俱樂部儲值餘額
                </h4>
                <div id="balancesList" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ color: "var(--muted)", fontSize: "13px", fontStyle: "italic" }}>查無任何球場或俱樂部的儲值資料</p>
                </div>
              </div>

              {/* Right: Upcoming Bookings */}
              <div className="dashboard-panel-card">
                <h4 className="panel-header-title">
                  📅 近期預約與出席狀態
                </h4>
                <div id="userBookingsList" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ color: "var(--muted)", fontSize: "13px", fontStyle: "italic" }}>目前無任何預約紀錄</p>
                </div>
              </div>
            </div>

            {/* ELO Rating Chart & Match History Section */}
            <div id="eloHistorySection" style={{ display: "none", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
              <div className="dashboard-panel-card" style={{ width: "100%" }}>
                <h4 className="panel-header-title">
                  📈 我的戰力積分走勢
                </h4>
                <div className="profile-tip-banner" id="ratingInfoBanner" style={{ display: "none", background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.18)", color: "#9A3412", marginBottom: "16px" }}>
                  <span style={{ fontSize: "16px" }}>🏆</span>
                  <span><strong>戰力評級提示</strong>：戰力分數以 1000 為起步（等同 DUPR 2.0），會依對戰成績與分差自動結算。本轉換分數僅供俱樂部內部對戰分場參考，非 DUPR 官方正式認證。</span>
                </div>
                <div id="eloChartContainer" style={{ minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#f8fafc", borderRadius: "16px", padding: "16px", border: "1px solid #e2e8f0", position: "relative" }}>
                  <p style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "13.5px" }}>載入對戰數據中...</p>
                </div>
              </div>

              <div className="dashboard-panel-card" style={{ width: "100%" }}>
                <h4 className="panel-header-title">
                  ⚔️ 近期對戰戰績紀錄
                </h4>
                <div id="matchHistoryList" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ color: "var(--muted)", fontSize: "13px", fontStyle: "italic" }}>目前尚無任何積分對戰紀錄</p>
                </div>
              </div>
            </div>
            </div>

          <div className="modal" id="transactionModal">
            <div className="modal-card" style={{ maxWidth: "520px" }}>
              <div className="modal-head">
                <div>
                  <h2 className="section-title" id="transactionModalTitle" style={{ fontSize: "20px" }}>交易明細紀錄</h2>
                  <p className="muted" style={{ fontSize: "13px" }}>查看您在此俱樂部的儲值、簽到扣款與退款明細。</p>
                </div>
                <button className="close-btn" id="closeTransactionModal">×</button>
              </div>
              <div style={{ maxHeight: "380px", overflowY: "auto", marginTop: "12px" }} id="transactionListContainer">
                <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>載入中...</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
