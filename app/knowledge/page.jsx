"use client";

export default function KnowledgePage() {
  return (
    <div className="tab-shell">
      <div className="tab-panel active">
        <section id="tips" className="section">
          <div className="section-head">
            <div>
              <div className="section-kicker">BEGINNER GUIDE</div>
              <h2 className="section-title">匹克球小知識</h2>
              <p className="section-sub">把 App 裡的小知識整理成卡片，第一次參加也能先快速了解。</p>
            </div>
          </div>
          <div className="knowledge-grid" id="knowledgeList"></div>
        </section>
      </div>
    </div>
  );
}
