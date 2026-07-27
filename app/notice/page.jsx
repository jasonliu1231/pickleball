"use client";

export default function NoticePage() {
  return (
    <div className="tab-shell">
      <div className="tab-panel active">
        <section id="notice" className="section">
          <div className="section-head">
            <div>
              <div className="section-kicker">NOTICE</div>
              <h2 className="section-title">公告與提醒</h2>
              <p className="section-sub">這裡會放最新活動提醒、雨天規則與新手須知。</p>
            </div>
          </div>
          <div className="notice-grid" id="announcementList"></div>
        </section>
      </div>
    </div>
  );
}
