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
            <div className="member-profile-card" style={{ background: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)", color: "#ffffff", flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "16px", flexWrap: "wrap" }}>
                <div className="profile-main-info" style={{ flex: 1, minWidth: "240px" }}>
                  <div className="profile-text-group" style={{ alignItems: "flex-start" }}>
                    <h3 className="profile-welcome" style={{ color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                      👋 哈囉，<span id="dashboardNickname">球友</span>
                    </h3>
                    <div className="profile-badges-row">
                      <span className="info-pill" style={{ color: "rgba(255, 255, 255, 0.95)" }}>
                        📱 <span id="dashboardPhone">未設定</span>
                      </span>
                      <span className="info-pill info-pill-id" style={{ color: "rgba(255, 255, 255, 0.95)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        🆔 ID: <span id="dashboardMemberId" style={{ maxWidth: "120px", display: "inline-block", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>--</span>
                        <button id="copyIdBtn" type="button" className="copy-btn-sleek">複製 ID</button>
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code Section */}
                <div id="memberQrContainer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.08)", padding: "12px 18px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <img id="memberQrImg" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="會員 QR Code" style={{ width: "130px", height: "130px", borderRadius: "10px", backgroundColor: "#ffffff", padding: "6px" }} />
                  <span style={{ fontSize: "11.5px", fontWeight: "800", opacity: 0.9, letterSpacing: "0.5px" }}>出示給教練/團主掃描綁定</span>
                </div>
              </div>

              {/* Bottom Actions Row: Delete Account & Logout */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: "14px", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "12px" }}>
                <button className="delete-account-btn-sleek" id="deleteAccountBtn" type="button">
                  註銷帳號
                </button>
                <button className="logout-btn-sleek" id="logoutBtn" type="button" style={{ color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.3)", backgroundColor: "rgba(255, 255, 255, 0.12)", padding: "6px 14px", fontSize: "13px" }}>
                  登出帳號
                </button>
              </div>
            </div>
            
            {/* Warning Banners */}
            <div id="phoneWarningBanner" style={{ display: "none", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "16px", padding: "14px", color: "#B45309", fontWeight: "bold", flexDirection: "row", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>📱</span>
              <span style={{ fontSize: "13.5px", flex: 1 }}>您尚未設定手機號碼！請在下方「編輯個人資料」填寫並儲存手機，以便接收 LINE 遞補通知與自動連通歷史報名紀錄。</span>
            </div>

            <div id="balanceWarningBanner" style={{ display: "none", background: "#FFF1F2", border: "1px solid #FECACA", borderRadius: "16px", padding: "14px", color: "#991B1B", fontWeight: "bold", flexDirection: "row", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>⚠️</span>
              <span style={{ fontSize: "13.5px", flex: 1 }}>您的餘額不足以支付下週的出席費用，請聯絡團長進行儲值，以免影響自動卡位權益。</span>
            </div>

            {/* Update Profile Form */}
            <div className="edit-profile-section">
              <h4 style={{ fontSize: "16px", fontWeight: "900", marginBottom: "16px" }}>✏️ 編輯個人資料</h4>
              <form id="updateProfileForm" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="modern-form-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", maxWidth: "100%" }}>
                  <div className="modern-input-group">
                    <label htmlFor="profileNickname">修改暱稱 / 姓名</label>
                    <input id="profileNickname" className="modern-text-input" placeholder="請輸入姓名或暱稱" />
                  </div>
                  <div className="modern-input-group">
                    <label htmlFor="profilePhone">修改手機號碼</label>
                    <input id="profilePhone" className="modern-text-input" placeholder="0912345678" inputMode="numeric" />
                  </div>
                  <div className="modern-input-group" style={{ gridColumn: "1 / -1" }}>
                    <label>預設程度等級</label>
                    <input type="hidden" id="profileSkillLevel" defaultValue="normal" />
                    <div className="skill-chips-row" id="skillChipsRow">
                      <button type="button" className="skill-chip-btn" data-value="first_time">第一次體驗</button>
                      <button type="button" className="skill-chip-btn" data-value="beginner">初學</button>
                      <button type="button" className="skill-chip-btn active" data-value="normal">一般</button>
                      <button type="button" className="skill-chip-btn" data-value="advanced">進階</button>
                    </div>
                  </div>
                </div>
                <button className="btn-primary" type="submit" style={{ alignSelf: "flex-start", minWidth: "120px", padding: "10px 24px", borderRadius: "12px" }}>儲存修改</button>
              </form>
              <div id="profileMessage" className="message" style={{ marginTop: "8px" }}></div>
            </div>

            {/* 4 Feature Tabs (Matching Mobile App Logic) */}
            <div className="member-tabs-nav" id="memberTabsNav">
              <button type="button" className="member-tab-btn active" data-tab="clubs" id="tabBtnClubs">
                <span className="tab-icon">🏢</span>
                <span className="tab-label">我的俱樂部</span>
                <span className="member-tab-badge" id="badgeClubsCount" style={{ display: "none" }}>0</span>
              </button>
              <button type="button" className="member-tab-btn" data-tab="bookings" id="tabBtnBookings">
                <span className="tab-icon">📅</span>
                <span className="tab-label">近期預約</span>
                <span className="member-tab-badge" id="badgeBookingsCount" style={{ display: "none" }}>0</span>
              </button>
              <button type="button" className="member-tab-btn" data-tab="pickups" id="tabBtnPickups">
                <span className="tab-icon">🏓</span>
                <span className="tab-label">我的自揪團</span>
                <span className="member-tab-badge" id="badgePickupsCount" style={{ display: "none" }}>0</span>
              </button>
              <button type="button" className="member-tab-btn" data-tab="stats" id="tabBtnStats">
                <span className="tab-icon">⚔️</span>
                <span className="tab-label">戰績與積分</span>
              </button>
            </div>

            {/* Tab 1: 我的俱樂部 */}
            <div className="member-tab-panel active" id="tabPanelClubs">
              <div className="dashboard-panel-card" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h4 className="panel-header-title" style={{ margin: 0 }}>🏢 我的俱樂部</h4>
                </div>
                <div id="balancesList" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ color: "var(--muted)", fontSize: "13px", fontStyle: "italic" }}>載入俱樂部資料中...</p>
                </div>
              </div>
            </div>

            {/* Tab 2: 近期預約 */}
            <div className="member-tab-panel" id="tabPanelBookings" style={{ display: "none" }}>
              <div className="dashboard-panel-card" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h4 className="panel-header-title" style={{ margin: 0 }}>📅 近期預約與出席狀態</h4>
                </div>
                <div id="userBookingsList" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ color: "var(--muted)", fontSize: "13px", fontStyle: "italic" }}>載入預約紀錄中...</p>
                </div>
              </div>
            </div>

            {/* Tab 3: 我的自揪團 */}
            <div className="member-tab-panel" id="tabPanelPickups" style={{ display: "none" }}>
              <div className="dashboard-panel-card" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                  <h4 className="panel-header-title" style={{ margin: 0 }}>🏓 我發起的自揪團</h4>
                  <a href="/#createPickupModal" id="memberCenterCreatePickupBtn" className="btn-secondary" style={{ fontSize: "13px", padding: "6px 14px", textDecoration: "none", borderRadius: "10px", fontWeight: "800", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    ➕ 發起新揪團
                  </a>
                </div>
                <div id="myPickupsList" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ color: "var(--muted)", fontSize: "13px", fontStyle: "italic" }}>載入自揪活動中...</p>
                </div>
              </div>
            </div>

            {/* Tab 4: 戰績與積分 */}
            <div className="member-tab-panel" id="tabPanelStats" style={{ display: "none" }}>
              <div className="dashboard-panel-card" style={{ width: "100%", marginBottom: "20px" }}>
                <h4 className="panel-header-title">📈 我的戰力積分走勢</h4>
                <div className="profile-tip-banner" id="ratingInfoBanner" style={{ display: "flex", background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.18)", color: "#9A3412", marginBottom: "16px" }}>
                  <span style={{ fontSize: "16px" }}>🏆</span>
                  <span><strong>戰力評級提示</strong>：戰力分數以 1000 為起步（等同 DUPR 2.0），會依對戰成績與分差自動結算。本轉換分數僅供俱樂部內部對戰分場參考，非 DUPR 官方正式認證。</span>
                </div>
                <div id="eloChartContainer" style={{ minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#f8fafc", borderRadius: "16px", padding: "16px", border: "1px solid #e2e8f0", position: "relative" }}>
                  <p style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "13.5px" }}>載入對戰數據中...</p>
                </div>
              </div>

              <div className="dashboard-panel-card" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                  <h4 className="panel-header-title" style={{ margin: 0 }}>⚔️ 近期對戰戰績紀錄</h4>
                  <span id="matchStatsSummary" style={{ fontSize: "13px", fontWeight: "800", color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "3px 12px", borderRadius: "100px" }}>0 場 ｜ 0勝 0敗 (勝率 0%)</span>
                </div>
                <div id="matchHistoryList" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ color: "var(--muted)", fontSize: "13px", fontStyle: "italic" }}>目前尚無任何積分對戰紀錄</p>
                </div>
              </div>
            </div>

            <div className="profile-tip-banner" style={{ marginTop: "10px" }}>
              <span style={{ fontSize: "16px" }}>💡</span>
              <span><strong>系統關聯提示</strong>：將您的「系統 ID」提供給球館或團主，即可在後台進行儲值與卡位扣點！若需要接收即時通知與遞補提醒，請 <a href="https://line.me/R/ti/p/%40657kasvh" target="_blank" rel="noopener noreferrer" style={{ color: "#06C755", fontWeight: "900", textDecoration: "underline" }}>點此加入 LINE 官方好友</a>。</span>
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

          {/* Edit Member Pickup Modal */}
          <div className="modal" id="editPickupModal">
            <div className="modal-card" style={{ maxWidth: "520px" }}>
              <div className="modal-head">
                <div>
                  <h2 className="section-title" style={{ fontSize: "22px" }}>✏️ 編輯自揪活動</h2>
                  <p className="muted">修改此場自揪活動的時間、地點或名額設定。</p>
                </div>
                <button className="close-btn" id="closeEditPickupModal">×</button>
              </div>
              <form className="form" id="editPickupForm">
                <input type="hidden" id="editPickupId" />
                <label>活動主題
                  <input id="editPickupName" placeholder="例如：週六下午暢打、新手交流" required />
                </label>
                <label>活動日期
                  <input id="editPickupDate" type="date" disabled style={{ background: "#f1f5f9", cursor: "not-allowed" }} />
                </label>
                <label>開始時間
                  <input id="editPickupStartTime" type="time" required />
                </label>
                <label>結束時間
                  <input id="editPickupEndTime" type="time" required />
                </label>
                <label>活動縣市
                  <select id="editPickupCity" required></select>
                </label>
                <label>球場地點
                  <input id="editPickupAddress" placeholder="例如：南屯匹克球場 2 號場" required />
                </label>
                <label>詳細地址（選填，供導航）
                  <input id="editPickupStreetAddress" placeholder="例如：文心南七路" />
                </label>
                <label>人數上限
                  <input id="editPickupCapacity" type="number" min="2" max="32" required />
                </label>
                <label>每人費用
                  <input id="editPickupFee" placeholder="例如：場租平分、免費" required />
                </label>
                <label>備註說明（選填）
                  <textarea id="editPickupNotes" placeholder="例如：自備球拍，使用 Dura 40 競賽球"></textarea>
                </label>
                <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: "12px", padding: "14px", marginTop: "8px" }}>
                  <label style={{ margin: 0, fontWeight: "800", color: "#0f172a" }}>
                    🔒 私人團報名密碼設定
                    <input id="editPickupJoinPassword" placeholder="留空即為完全公開團；輸入密碼則為私人團" style={{ marginTop: "6px" }} />
                  </label>
                  <p className="muted" style={{ fontSize: "12px", margin: "6px 0 0 0", color: "#64748b", lineHeight: "18px" }}>
                    💡 <strong>好友都報名完了？</strong> 只要將上方密碼<strong>全部清空</strong>並點擊儲存，活動便會立即開放給所有球友自由報名！
                  </p>
                </div>
                <button className="btn-primary" id="savePickupBtn" type="submit" style={{ height: "46px", fontSize: "15px", marginTop: "12px" }}>
                  儲存修改
                </button>
              </form>
              <div className="message" id="editPickupMessage"></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
