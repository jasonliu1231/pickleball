"use client";

export default function FaqPage() {
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
            <article className="tip-card" style={{ gridColumn: "1 / -1", marginBottom: "8px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "20px", borderBottom: "2px solid var(--accent)", paddingBottom: "8px", display: "inline-block" }}>
                📖 線上預約與取消預約操作指南
              </h3>
              
              <div className="guide-steps" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>步驟 1</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>選擇預約日期</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "36px" }}>在日曆上點選有綠點的日期</p>
                  <img src="/step1_calendar.png" alt="步驟1" style={{ width: "100%", maxWidth: "160px", borderRadius: "8px", border: "1px solid var(--line)" }} />
                </div>
                
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>步驟 2</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>點選我要報名</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "36px" }}>點擊場次卡片中的綠色按鈕</p>
                  <img src="/step2_cards.png" alt="步驟2" style={{ width: "100%", maxWidth: "160px", borderRadius: "8px", border: "1px solid var(--line)" }} />
                </div>
                
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>步驟 3</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>填寫資料送出</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "36px" }}>填妥暱稱與手機號碼並確認報名</p>
                  <img src="/step3_form.png" alt="步驟3" style={{ width: "100%", maxWidth: "160px", borderRadius: "8px", border: "1px solid var(--line)" }} />
                </div>
                
                <div className="step-item" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>步驟 4</span>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "6px" }}>報名成功</h4>
                  <p style={{ fontSize: "12px", color: "var(--sub)", lineHeight: "18px", marginBottom: "12px", minHeight: "36px" }}>顯示報名成功且目前為正/備取</p>
                  <img src="/step4_success.png" alt="步驟4" style={{ width: "100%", maxWidth: "160px", borderRadius: "8px", border: "1px solid var(--line)" }} />
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
                    <img src="/step5_cancel.png" alt="步驟5" style={{ width: "100%", borderRadius: "8px", border: "1px solid var(--line)" }} />
                  </div>
                </div>
              </div>
            </article>

            <article className="tip-card"><h3>我沒有打過可以參加嗎？</h3><p>可以。報名時勾選新手，現場會依活動狀況協助安排。</p></article>
            <article className="tip-card"><h3>看不到可報名日期？</h3><p>代表目前尚未開放該月份場次，請換月份查看或留意公告。</p></article>
          </div>
        </section>
      </div>
    </div>
  );
}
