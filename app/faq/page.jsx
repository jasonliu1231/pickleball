"use client";

import { useState } from "react";

export default function FaqPage() {
  const [activeImage, setActiveImage] = useState(null);

  const handleImageClick = (src) => {
    setActiveImage(src);
  };

  return (
    <div className="tab-shell">
      <div className="tab-panel active">
        <section className="section">
          <div className="section-head">
            <div>
              <div className="section-kicker">FAQ</div>
              <h2 className="section-title">常見問題</h2>
            </div>
          </div>
          <div className="faq">
            {/* 官方 LINE 功能與指南 */}
            <article className="tip-card" style={{ gridColumn: "1 / -1", marginBottom: "8px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "20px", borderBottom: "2px solid var(--accent)", paddingBottom: "8px", display: "inline-block" }}>
                💬 LINE 官方帳號功能指南
              </h3>
              
              <div className="guide-steps" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>功能 1</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>即時異動通知</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "54px" }}>儲值或簽到扣點時，LINE 會即時推播通知明細卡片</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
                    <div>
                      <img src="/s1.png" alt="扣點通知" onClick={() => handleImageClick("/s1.png")} style={{ width: "100%", borderRadius: "8px", border: "1px solid var(--line)", cursor: "zoom-in" }} />
                      <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", display: "block", fontWeight: "700" }}>扣點通知</span>
                    </div>
                    <div>
                      <img src="/s4.png" alt="儲值通知" onClick={() => handleImageClick("/s4.png")} style={{ width: "100%", borderRadius: "8px", border: "1px solid var(--line)", cursor: "zoom-in" }} />
                      <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", display: "block", fontWeight: "700" }}>儲值通知</span>
                    </div>
                  </div>
                </div>
                
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>功能 2</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>一鍵餘額查詢</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "54px" }}>點選聊天室選單的「查詢餘額」，即可看見名下所有團主的剩餘點數</p>
                  <img src="/s2.png" alt="一鍵餘額查詢" onClick={() => handleImageClick("/s2.png")} style={{ width: "100%", borderRadius: "8px", border: "1px solid var(--line)", cursor: "zoom-in" }} />
                </div>
                
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>功能 3</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>使用紀錄調閱</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "54px" }}>點選聊天室選單的「使用紀錄」，秒查最近 10 筆儲值與扣款歷史</p>
                  <img src="/s3.png" alt="使用紀錄調閱" onClick={() => handleImageClick("/s3.png")} style={{ width: "100%", borderRadius: "8px", border: "1px solid var(--line)", cursor: "zoom-in" }} />
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
                <a href="https://line.me/R/ti/p/%40657kasvh" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#06C755", color: "#fff", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: "800", textDecoration: "none" }}>
                  ➕ 點我加入官方 LINE 好友（啟用即時推播與查詢）
                </a>
              </div>
            </article>

            <article className="tip-card" style={{ gridColumn: "1 / -1", marginBottom: "8px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "20px", borderBottom: "2px solid var(--accent)", paddingBottom: "8px", display: "inline-block" }}>
                📖 線上預約與取消預約操作指南
              </h3>
              
              <div className="guide-steps" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>步驟 1</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>選擇預約日期</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "36px" }}>在日曆上點選有綠點的日期</p>
                  <img src="/step1_calendar.png" alt="步驟1" onClick={() => handleImageClick("/step1_calendar.png")} style={{ width: "100%", maxWidth: "160px", borderRadius: "8px", border: "1px solid var(--line)", cursor: "zoom-in" }} />
                </div>
                
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>步驟 2</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>點選我要報名</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "36px" }}>點擊場次卡片中的綠色按鈕</p>
                  <img src="/step2_cards.png" alt="步驟2" onClick={() => handleImageClick("/step2_cards.png")} style={{ width: "100%", maxWidth: "160px", borderRadius: "8px", border: "1px solid var(--line)", cursor: "zoom-in" }} />
                </div>
                
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>步驟 3</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>填寫資料送出</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "36px" }}>填妥暱稱與手機號碼並確認報名</p>
                  <img src="/step3_form.png" alt="步驟3" onClick={() => handleImageClick("/step3_form.png")} style={{ width: "100%", maxWidth: "160px", borderRadius: "8px", border: "1px solid var(--line)", cursor: "zoom-in" }} />
                </div>
                
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>步驟 4</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>報名成功</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "36px" }}>顯示報名成功且目前為正/備取</p>
                  <img src="/step4_success.png" alt="步驟4" onClick={() => handleImageClick("/step4_success.png")} style={{ width: "100%", maxWidth: "160px", borderRadius: "8px", border: "1px solid var(--line)", cursor: "zoom-in" }} />
                </div>
              </div>
              
              <div style={{ marginTop: "24px", borderTop: "1px dashed var(--line)", paddingTop: "20px" }}>
                <h4 style={{ fontSize: "15px", fontWeight: "800", color: "#DC2626", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  🛑 如何取消預約？
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: "240px", fontSize: "13.5px", color: "var(--sub)", lineHeight: "22px" }}>
                    <p style={{ marginBottom: "8px" }}>若您報名後臨時不克前來，請點選卡片中的<strong>「取消預約」</strong>，並照以下步驟：</p>
                    <ol style={{ marginLeft: "20px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <li>在 <strong>報名手機</strong> 欄位輸入您報名時留存的手機。</li>
                      <li>點選 <strong>查詢預約</strong>。</li>
                      <li>確認下方查出的名字無誤後，點擊 <strong>確認取消</strong> 即退登成功。</li>
                    </ol>
                    <p style={{ background: "#FFF1F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px", color: "#991B1B", fontSize: "12.5px", fontWeight: "800" }}>
                      💡 貼心提醒：當您取消成功後，系統會自動將釋出的名額，按排隊時間順序自動遞補給下一位備取球友！
                    </p>
                  </div>
                  <div style={{ width: "100%", maxWidth: "160px", alignSelf: "center" }}>
                    <img src="/step5_cancel.png" alt="步驟5" onClick={() => handleImageClick("/step5_cancel.png")} style={{ width: "100%", borderRadius: "8px", border: "1px solid var(--line)", cursor: "zoom-in" }} />
                  </div>
                </div>
              </div>
            </article>

            <article className="tip-card" style={{ gridColumn: "1 / -1", marginBottom: "8px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", marginBottom: "8px" }}>
                👥 可以幫家人或朋友報名，並從我的儲值卡扣點嗎？
              </h3>
              <p style={{ fontSize: "13.5px", color: "var(--sub)", lineHeight: "22px" }}>
                可以！系統支援<strong>「扣款主帳號（子母帳號共用額度）」</strong>功能。
                請您的家人或親友先登入預約網站註冊，並將他們個人中心最上方的<strong>「系統 ID」</strong>複製提供給教練。
                教練在後台將他們的帳戶設為「由您統一扣款」後，他們預約出席時，就會自動從您的點數餘額中扣點囉！
              </p>
            </article>

            <article className="tip-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
                🎾 我沒有打過可以參加嗎？
              </h3>
              <div style={{ fontSize: "13px", color: "var(--sub)", lineHeight: "20px" }}>
                <p style={{ fontWeight: "700", color: "var(--accent)", marginBottom: "6px" }}>當然可以！我們非常歡迎新手加入！</p>
                <ul style={{ marginLeft: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <li>🙋‍♂️ <strong>報名勾選新手</strong>：報名時請勾選「新手」，現場安排時教練會特別留意。</li>
                  <li>🤝 <strong>新手友善環境</strong>：現場有教練與友善球友，會熱心指導持拍與計分規則。</li>
                  <li>🏓 <strong>免自備球拍</strong>：球館現場提供球拍租借與借用，您只需著運動服鞋即可前來！</li>
                </ul>
              </div>
            </article>

            <article className="tip-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
                📅 看不到可報名日期？
              </h3>
              <div style={{ fontSize: "13px", color: "var(--sub)", lineHeight: "20px" }}>
                <p style={{ fontWeight: "700", color: "#d97706", marginBottom: "6px" }}>如果日曆上沒有綠色圓點，請確認以下狀況：</p>
                <ul style={{ marginLeft: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <li>🔄 <strong>切換月份查看</strong>：可點選日曆左右箭頭，切換至下一個月份看是否有開放場次。</li>
                  <li>📢 <strong>開團發佈時間</strong>：每週場次均有固定發佈時間，請留意群組最新公告。</li>
                  <li>🔒 <strong>額滿截止隱藏</strong>：若當月所有場次皆已額滿且截止預約，日曆綠點也會自動隱藏。</li>
                </ul>
              </div>
            </article>
          </div>
        </section>
      </div>

      {/* 圖片點選放大遮罩 Modal */}
      {activeImage && (
        <div 
          onClick={() => setActiveImage(null)} 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            cursor: "zoom-out"
          }}
        >
          <img 
            src={activeImage} 
            alt="放大視圖" 
            style={{ 
              maxWidth: "90%", 
              maxHeight: "90%", 
              borderRadius: "12px", 
              boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
              border: "2px solid rgba(255,255,255,0.1)"
            }} 
          />
        </div>
      )}
    </div>
  );
}
