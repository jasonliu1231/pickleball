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
              <div className="profile-main-info">
                <div className="profile-avatar-circle" id="dashboardAvatar" style={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.15)" }}>球</div>
                <div className="profile-text-group" style={{ alignItems: "flex-start" }}>
                  <h3 className="profile-welcome" style={{ color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                    👋 哈囉，<span id="dashboardNickname">球友</span>
                  </h3>
                  <div className="profile-badges-row">
                    <span className="info-pill" style={{ color: "rgba(255, 255, 255, 0.95)" }}>
                      📱 <span id="dashboardPhone">未設定</span>
                    </span>
                    <span className="info-pill info-pill-id" style={{ color: "rgba(255, 255, 255, 0.95)" }}>
                      🆔 ID: <span id="dashboardMemberId">--</span>
                      <button id="copyIdBtn" type="button" className="copy-btn-sleek">複製 ID</button>
                    </span>
                  </div>
                </div>
              </div>
              <button className="logout-btn-sleek" id="logoutBtn" type="button" style={{ color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.3)", backgroundColor: "rgba(255, 255, 255, 0.12)" }}>登出帳號</button>
            </div>
            
            <div className="profile-tip-banner">
              <span style={{ fontSize: "16px" }}>💡</span>
              <span><strong>系統關聯提示</strong>：將您的「系統 ID」提供給球館或團主，即可在後台進行儲值與卡位扣點！</span>
            </div>
            
            <div className="line-friend-card" style={{ background: "rgba(6, 199, 85, 0.06)", border: "1px solid rgba(6, 199, 85, 0.25)", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <span style={{ fontSize: "20px", marginTop: "2px" }}>💬</span>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "900", color: "#047857" }}>加入 LINE 官方好友，啟用即時通知</h4>
                  <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--sub)", lineHeight: "1.6" }}>
                    <strong>加入好友後，您將享有以下專屬服務：</strong><br/>
                    🔔 <strong>儲值扣點、簽到扣款</strong> 即時收到 LINE 提醒通知<br/>
                    🎉 <strong>備取排上正取</strong> 時自動發送 LINE 通知<br/>
                    📊 手機聊天室一鍵 <strong>查詢儲值餘額與使用紀錄</strong>
                  </p>
                  <p style={{ margin: "8px 0 0 0", fontSize: "12.5px", color: "#dc2626", fontWeight: "bold" }}>
                    ⚠️ 提醒：請務必在下方「編輯個人資料」填寫並【 儲存手機號碼 】，否則系統將無法為您發送 LINE 即時通知！
                  </p>
                </div>
              </div>
              <a href="https://line.me/R/ti/p/%40657kasvh" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ background: "#06C755", color: "#fff", borderColor: "#06C755", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", borderRadius: "12px", fontSize: "14px", fontWeight: "800", textAlign: "center" }}>
                ➕ 立即加入 LINE 官方好友
              </a>
            </div>
            
            {/* Warning Banner */}
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
            
            {/* Update Profile Form */}
            <div className="edit-profile-section">
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
