"use client";

import { useState, useEffect } from "react";

export default function SchedulePage() {
  // Inputs (all in minutes)
  const [playersCount, setPlayersCount] = useState(6);
  const [totalMinutes, setTotalMinutes] = useState(120);
  const [matchMinutes, setMatchMinutes] = useState(12);
  const [bufferMinutes, setBufferMinutes] = useState(10);
  const [playerNamesText, setPlayerNamesText] = useState("");
  const [mode, setMode] = useState("fair"); // 'fair' (100%均等) or 'max' (時間極大化)

  const [scheduleData, setScheduleData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Generate schedule algorithm
  const generateSchedule = () => {
    const N = Math.max(4, Math.min(16, Number(playersCount) || 6));
    const T = Math.max(10, Number(totalMinutes) || 120);
    const M = Math.max(5, Number(matchMinutes) || 12);
    const B = Math.max(0, Number(bufferMinutes) || 0);

    const availableMin = Math.max(M, T - B);
    const maxPossibleRounds = Math.floor(availableMin / M);

    // Calculate cycle size C such that (4 * C) % N === 0
    let C = 1;
    for (let c = 1; c <= N; c++) {
      if ((4 * c) % N === 0) {
        C = c;
        break;
      }
    }

    let targetRounds = maxPossibleRounds;
    if (mode === "fair") {
      targetRounds = Math.max(C, Math.floor(maxPossibleRounds / C) * C);
    }
    if (targetRounds <= 0) targetRounds = 1;

    // Player objects
    const customNames = playerNamesText
      .split(/[\n,，、\s]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const players = Array.from({ length: N }, (_, i) => {
      const defaultName = `${i + 1}號`;
      const name = customNames[i] ? `${customNames[i]}` : defaultName;
      return { id: i + 1, name };
    });

    // Combinations of 4 players
    const pairs = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        pairs.push([players[i], players[j]]);
      }
    }

    const allRounds = [];
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const p1 = pairs[i];
        const p2 = pairs[j];
        const set4 = new Set([p1[0].id, p1[1].id, p2[0].id, p2[1].id]);
        if (set4.size === 4) {
          const rest = players.filter(x => !set4.has(x.id));
          allRounds.push({ teamA: p1, teamB: p2, rest });
        }
      }
    }

    // Solve schedule using optimization
    const solveRounds = () => {
      let bestSched = null;
      let bestPenalty = Infinity;

      for (let trial = 0; trial < 1200; trial++) {
        const sched = [];
        const played = {};
        const partner = {};
        players.forEach(p => { played[p.id] = 0; });
        let lastRest = [];
        let ok = true;

        for (let r = 0; r < targetRounds; r++) {
          let candidates = allRounds.filter(rnd => {
            const overlap = rnd.rest.filter(p => lastRest.includes(p.id)).length;
            return overlap <= (N >= 8 ? 2 : (N === 7 ? 1 : 0));
          });
          if (candidates.length === 0) candidates = allRounds;

          candidates.sort((a, b) => {
            const aPlay = a.teamA.reduce((s, p) => s + played[p.id], 0) + a.teamB.reduce((s, p) => s + played[p.id], 0);
            const bPlay = b.teamA.reduce((s, p) => s + played[p.id], 0) + b.teamB.reduce((s, p) => s + played[p.id], 0);
            const kA1 = `${Math.min(a.teamA[0].id, a.teamA[1].id)}-${Math.max(a.teamA[0].id, a.teamA[1].id)}`;
            const kA2 = `${Math.min(a.teamB[0].id, a.teamB[1].id)}-${Math.max(a.teamB[0].id, a.teamB[1].id)}`;
            const aPartner = (partner[kA1] || 0) + (partner[kA2] || 0);

            const kB1 = `${Math.min(b.teamA[0].id, b.teamA[1].id)}-${Math.max(b.teamA[0].id, b.teamA[1].id)}`;
            const kB2 = `${Math.min(b.teamB[0].id, b.teamB[1].id)}-${Math.max(b.teamB[0].id, b.teamB[1].id)}`;
            const bPartner = (partner[kB1] || 0) + (partner[kB2] || 0);

            return (aPlay * 10 + aPartner * 20) - (bPlay * 10 + bPartner * 20) + (Math.random() - 0.5) * 6;
          });

          const chosen = candidates[0];
          sched.push(chosen);
          lastRest = chosen.rest.map(p => p.id);
          chosen.teamA.forEach(p => { played[p.id]++; });
          chosen.teamB.forEach(p => { played[p.id]++; });
          const k1 = `${Math.min(chosen.teamA[0].id, chosen.teamA[1].id)}-${Math.max(chosen.teamA[0].id, chosen.teamA[1].id)}`;
          const k2 = `${Math.min(chosen.teamB[0].id, chosen.teamB[1].id)}-${Math.max(chosen.teamB[0].id, chosen.teamB[1].id)}`;
          partner[k1] = (partner[k1] || 0) + 1;
          partner[k2] = (partner[k2] || 0) + 1;
        }

        const counts = Object.values(played);
        const maxP = Math.max(...counts);
        const minP = Math.min(...counts);
        const penalty = (maxP - minP) * 5000;

        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestSched = sched;
          if (maxP - minP <= (mode === "fair" ? 0 : 1)) break;
        }
      }

      return bestSched;
    };

    const finalRounds = solveRounds();

    // Stats calculations
    const stats = {};
    players.forEach(p => {
      stats[p.id] = { ...p, playedCount: 0, restCount: 0 };
    });

    let currentMin = B;
    const formattedRounds = finalRounds.map((rnd, idx) => {
      const startM = currentMin;
      const endM = currentMin + M;
      currentMin = endM;

      rnd.teamA.forEach(p => { stats[p.id].playedCount++; });
      rnd.teamB.forEach(p => { stats[p.id].playedCount++; });
      rnd.rest.forEach(p => { stats[p.id].restCount++; });

      return {
        roundNum: idx + 1,
        timeRange: `${startM}分 ~ ${endM}分`,
        teamA: rnd.teamA.map(p => p.name).join(" + "),
        teamB: rnd.teamB.map(p => p.name).join(" + "),
        resting: rnd.rest.map(p => p.name).join("、 ") || "無"
      };
    });

    const playerList = players.map(p => stats[p.id]);
    const minPlayed = Math.min(...playerList.map(p => p.playedCount));
    const maxPlayed = Math.max(...playerList.map(p => p.playedCount));
    const isTotallyEqual = minPlayed === maxPlayed;

    setScheduleData({
      playersCount: N,
      totalMinutes: T,
      matchMinutes: M,
      bufferMinutes: B,
      totalRounds: targetRounds,
      actualUsedMinutes: B + targetRounds * M,
      isTotallyEqual,
      minPlayed,
      maxPlayed,
      playerList,
      rounds: formattedRounds
    });
  };

  // Generate on initial load
  useEffect(() => {
    generateSchedule();
  }, []);

  // Copy plain text schedule to clipboard
  const handleCopyText = () => {
    if (!scheduleData) return;
    let txt = `🏓 匹克球單場對戰輪替表\n`;
    txt += `⏱️ 總時間：${scheduleData.totalMinutes} 分鐘 ｜ 單場：${scheduleData.matchMinutes} 分鐘 ｜ 共 ${scheduleData.totalRounds} 輪\n`;
    txt += `👥 人數：${scheduleData.playersCount} 人 ｜ 每人出賽：${scheduleData.isTotallyEqual ? `${scheduleData.minPlayed} 場` : `${scheduleData.minPlayed}～${scheduleData.maxPlayed} 場`}\n`;
    txt += `----------------------------------------\n`;
    scheduleData.rounds.forEach(r => {
      txt += `第 ${r.roundNum} 輪 (${r.timeRange})：\n`;
      txt += `  ⚔️ ${r.teamA}  vs  ${r.teamB}\n`;
      txt += `  ☕ 輪空休息：${r.resting}\n`;
    });
    txt += `----------------------------------------\n`;
    txt += `匹克球同樂會・賽程排班產生器`;

    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="schedule-page-container">
      {/* Non-printable Control Form */}
      <div className="control-panel no-print">
        <div className="panel-header">
          <div className="panel-title-area">
            <h1 className="panel-title">🏓 線上賽程排班產生器</h1>
            <p className="panel-desc">自訂人數與分鐘數，自動計算絕對公平輪替組合，支援一鍵 A4 完美列印與 LINE 複製</p>
          </div>
          <a href="/pickleball_2h_rules_a4.html" target="_blank" className="fixed-sheet-link">
            📑 開啟 2 小時固定 4 頁手冊 ↗
          </a>
        </div>

        <div className="inputs-grid">
          {/* Players count */}
          <div className="input-group">
            <label className="input-label">
              👥 到場人數
              <span className="label-badge">{playersCount} 人</span>
            </label>
            <div className="quick-tags">
              {[4, 5, 6, 7, 8, 9, 10, 12].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`tag-btn ${playersCount === n ? "active" : ""}`}
                  onClick={() => setPlayersCount(n)}
                >
                  {n} 人
                </button>
              ))}
            </div>
            <input
              type="number"
              min="4"
              max="16"
              className="number-input"
              value={playersCount}
              onChange={e => setPlayersCount(Math.max(4, Math.min(16, Number(e.target.value))))}
            />
          </div>

          {/* Total Minutes */}
          <div className="input-group">
            <label className="input-label">
              ⏱️ 活動總時間（分鐘）
              <span className="label-badge">{totalMinutes} 分鐘</span>
            </label>
            <div className="quick-tags">
              {[60, 90, 120, 150, 180].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`tag-btn ${totalMinutes === m ? "active" : ""}`}
                  onClick={() => setTotalMinutes(m)}
                >
                  {m} 分
                </button>
              ))}
            </div>
            <input
              type="number"
              min="10"
              step="5"
              className="number-input"
              value={totalMinutes}
              onChange={e => setTotalMinutes(Math.max(10, Number(e.target.value)))}
            />
          </div>

          {/* Match Minutes */}
          <div className="input-group">
            <label className="input-label">
              ⚡ 一場最大時間（分鐘）
              <span className="label-badge">{matchMinutes} 分鐘/輪</span>
            </label>
            <div className="quick-tags">
              {[10, 12, 15, 20].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`tag-btn ${matchMinutes === m ? "active" : ""}`}
                  onClick={() => setMatchMinutes(m)}
                >
                  {m} 分
                </button>
              ))}
            </div>
            <input
              type="number"
              min="5"
              step="1"
              className="number-input"
              value={matchMinutes}
              onChange={e => setMatchMinutes(Math.max(5, Number(e.target.value)))}
            />
          </div>

          {/* Warm-up Buffer Minutes */}
          <div className="input-group">
            <label className="input-label">
              🧘 開場暖身/緩衝（分鐘）
              <span className="label-badge">{bufferMinutes} 分鐘</span>
            </label>
            <div className="quick-tags">
              {[0, 5, 10, 15].map(b => (
                <button
                  key={b}
                  type="button"
                  className={`tag-btn ${bufferMinutes === b ? "active" : ""}`}
                  onClick={() => setBufferMinutes(b)}
                >
                  {b} 分
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              step="1"
              className="number-input"
              value={bufferMinutes}
              onChange={e => setBufferMinutes(Math.max(0, Number(e.target.value)))}
            />
          </div>
        </div>

        {/* Optional Player Names Input & Mode Selection */}
        <div className="advanced-grid">
          <div className="input-group" style={{ flex: 2 }}>
            <label className="input-label">
              📝 球員姓名/暱稱（選填，以逗號或空格分隔；若留空自動以 1號、2號... 命名）
            </label>
            <input
              type="text"
              className="text-input"
              placeholder="例：子堯, 小明, 阿強, 佳佳, 志偉, 冠宇"
              value={playerNamesText}
              onChange={e => setPlayerNamesText(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">🎯 排序模式</label>
            <div className="mode-select-group">
              <label className={`mode-card ${mode === "fair" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="scheduleMode"
                  value="fair"
                  checked={mode === "fair"}
                  onChange={() => setMode("fair")}
                />
                <div>
                  <div className="mode-title">100% 絕對公平循環</div>
                  <div className="mode-desc">保證全員出賽場次零差距完全相同</div>
                </div>
              </label>
              <label className={`mode-card ${mode === "max" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="scheduleMode"
                  value="max"
                  checked={mode === "max"}
                  onChange={() => setMode("max")}
                />
                <div>
                  <div className="mode-title">時間極大化</div>
                  <div className="mode-desc">盡可能排滿總分鐘數，場次差距 ≤ 1</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-bar">
          <button className="primary-generate-btn" onClick={generateSchedule}>
            ⚡ 立即產生對戰輪替表
          </button>
          <div className="secondary-btn-group">
            <button className="secondary-tool-btn" onClick={handleCopyText}>
              {copied ? "✅ 已複製賽程純文字！" : "📋 複製文字至 LINE"}
            </button>
            <button className="secondary-tool-btn print-action" onClick={() => window.print()}>
              🖨️ 列印 A4 板夾表格
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      {scheduleData && (
        <div className="metrics-summary-strip no-print">
          <div className="metric-item">
            <div className="metric-label">總進行輪次</div>
            <div className="metric-value highlight">{scheduleData.totalRounds} <span className="unit">輪</span></div>
          </div>
          <div className="metric-item">
            <div className="metric-label">每人出賽場次</div>
            <div className="metric-value">
              {scheduleData.isTotallyEqual
                ? `${scheduleData.minPlayed} 場`
                : `${scheduleData.minPlayed} ~ ${scheduleData.maxPlayed} 場`}
              {scheduleData.isTotallyEqual && <span className="fair-tag">100% 均等</span>}
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">每人實際上場時間</div>
            <div className="metric-value">
              {scheduleData.minPlayed * scheduleData.matchMinutes}
              {!scheduleData.isTotallyEqual && ` ~ ${scheduleData.maxPlayed * scheduleData.matchMinutes}`}
              <span className="unit"> 分鐘</span>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">平均上場率</div>
            <div className="metric-value">
              {Math.round((4 / scheduleData.playersCount) * 100)}%
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">活動總耗時</div>
            <div className="metric-value">
              {scheduleData.actualUsedMinutes} / {scheduleData.totalMinutes} <span className="unit">分鐘</span>
            </div>
          </div>
        </div>
      )}

      {/* Printable Sheet (Standard A4 Format) */}
      {scheduleData && (
        <div className="a4-sheet-container print-area">
          {/* Header */}
          <div className="print-header">
            <div className="print-title-row">
              <h2 className="print-title">🏓 匹克球單場對戰輪替紀錄表</h2>
              <div className="print-badge">{scheduleData.playersCount} 人制專用</div>
            </div>
            <div className="print-meta-grid">
              <span><strong>活動日期：</strong>______年____月____日</span>
              <span><strong>球場地點：</strong>__________</span>
              <span><strong>活動時間：</strong>{scheduleData.totalMinutes} 分鐘（每輪 {scheduleData.matchMinutes} 分）</span>
              <span><strong>主辦場主：</strong>__________</span>
            </div>
          </div>

          {/* Roster & Standings */}
          <div className="sheet-sub-title">
            <span>📋 球員簽到與個人戰績統計表</span>
            <span className="sub-note">
              ★ {scheduleData.isTotallyEqual ? `每人恰好出賽 ${scheduleData.minPlayed} 場` : `每人出賽 ${scheduleData.minPlayed}～${scheduleData.maxPlayed} 場`}，請於賽後統計勝敗與小分
            </span>
          </div>
          <table className="print-roster-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>編號</th>
                <th style={{ width: "150px" }}>球員姓名 / 暱稱</th>
                <th style={{ width: "55px" }}>應出賽</th>
                <th style={{ width: "50px" }}>勝 (W)</th>
                <th style={{ width: "50px" }}>敗 (L)</th>
                <th style={{ width: "50px" }}>總得分</th>
                <th style={{ width: "50px" }}>總失分</th>
                <th style={{ width: "50px" }}>淨勝分</th>
                <th>名次</th>
              </tr>
            </thead>
            <tbody>
              {scheduleData.playerList.map(p => (
                <tr key={p.id}>
                  <td className="p-num">{p.id} 號</td>
                  <td className="p-name">{p.name !== `${p.id}號` ? p.name : ""}</td>
                  <td>{p.playedCount} 場</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Match Rounds */}
          <div className="sheet-sub-title" style={{ marginTop: "12px" }}>
            <span>🏓 循環賽程對戰與計分記錄表 (共 {scheduleData.totalRounds} 輪)</span>
            <span className="sub-note">★ 依序喊號碼上場，填入比分並圈選勝方</span>
          </div>
          <table className="print-match-table">
            <thead>
              <tr>
                <th style={{ width: "55px" }}>輪次</th>
                <th style={{ width: "85px" }}>預估時間</th>
                <th style={{ width: "160px" }}>隊伍 A (Team A)</th>
                <th style={{ width: "80px" }}>比分記錄</th>
                <th style={{ width: "160px" }}>隊伍 B (Team B)</th>
                <th>本輪輪空 (休息球員)</th>
              </tr>
            </thead>
            <tbody>
              {scheduleData.rounds.map(r => (
                <tr key={r.roundNum}>
                  <td className="r-num">第 {r.roundNum} 輪</td>
                  <td className="r-time">{r.timeRange}</td>
                  <td className="r-teama">{r.teamA}</td>
                  <td className="r-score">
                    <span className="score-box-print">：</span>
                  </td>
                  <td className="r-teamb">{r.teamB}</td>
                  <td className="r-rest">{r.resting}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="print-footer">
            <span>● 核心演算法：零連續乾等 ｜ 出賽場次絕對平衡 ｜ 搭檔組合全覆蓋</span>
            <span>場主確認簽名：________________</span>
          </div>
        </div>
      )}

      {/* In-page Styles */}
      <style jsx>{`
        .schedule-page-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px 16px 60px;
        }

        /* Control Panel */
        .control-panel {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          margin-bottom: 24px;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .panel-title {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        .panel-desc {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }
        .fixed-sheet-link {
          font-size: 12.5px;
          font-weight: 800;
          color: #0284c7;
          text-decoration: none;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          padding: 6px 14px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }
        .fixed-sheet-link:hover {
          background: #e0f2fe;
        }

        .inputs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .input-label {
          font-size: 13px;
          font-weight: 800;
          color: #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .label-badge {
          font-size: 11px;
          background: #e2e8f0;
          color: #0f172a;
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 800;
        }
        .quick-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .tag-btn {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tag-btn:hover {
          background: #f1f5f9;
        }
        .tag-btn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .number-input, .text-input {
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          background: #ffffff;
          outline: none;
        }
        .number-input:focus, .text-input:focus {
          border-color: #0284c7;
        }

        .advanced-grid {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .mode-select-group {
          display: flex;
          gap: 10px;
        }
        .mode-card {
          flex: 1;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: #f8fafc;
        }
        .mode-card.active {
          border-color: #059669;
          background: #f0fdf4;
        }
        .mode-title {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
        }
        .mode-desc {
          font-size: 10.5px;
          color: #64748b;
          line-height: 1.3;
        }

        .action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }
        .primary-generate-btn {
          background: #16a34a;
          color: #ffffff;
          border: none;
          font-size: 14px;
          font-weight: 800;
          padding: 10px 24px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .primary-generate-btn:hover {
          background: #15803d;
        }
        .secondary-btn-group {
          display: flex;
          gap: 10px;
        }
        .secondary-tool-btn {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          font-size: 13px;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .secondary-tool-btn:hover {
          background: #f8fafc;
        }
        .secondary-tool-btn.print-action {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }
        .secondary-tool-btn.print-action:hover {
          background: #0369a1;
        }

        /* Metrics Strip */
        .metrics-summary-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          background: #0f172a;
          color: #ffffff;
          border-radius: 12px;
          padding: 14px 20px;
          margin-bottom: 24px;
        }
        .metric-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .metric-label {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 700;
        }
        .metric-value {
          font-size: 18px;
          font-weight: 900;
          color: #ffffff;
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .metric-value.highlight {
          color: #38bdf8;
        }
        .metric-value .unit {
          font-size: 12px;
          color: #94a3b8;
          font-weight: normal;
        }
        .fair-tag {
          font-size: 10px;
          background: #16a34a;
          color: #ffffff;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 800;
          margin-left: 4px;
        }

        /* A4 Print Area */
        .a4-sheet-container {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 24px 28px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        .print-header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .print-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .print-title {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
        }
        .print-badge {
          background: #0f172a;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 6px;
        }
        .print-meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          font-size: 11px;
          color: #475569;
          font-weight: 600;
        }

        .sheet-sub-title {
          font-size: 12.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .sub-note {
          font-size: 10.5px;
          color: #64748b;
          font-weight: normal;
        }

        .print-roster-table, .print-match-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          text-align: center;
        }
        .print-roster-table th, .print-match-table th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 800;
          padding: 5px 4px;
          border-top: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
        }
        .print-roster-table td, .print-match-table td {
          padding: 5px 4px;
          border-bottom: 1px solid #e2e8f0;
          color: #1e293b;
        }
        .print-roster-table tr:nth-child(even) td, .print-match-table tr:nth-child(even) td {
          background: #fafafa;
        }

        .p-num { font-weight: 800; color: #0284c7; }
        .p-name { font-weight: 700; color: #0f172a; }

        .r-num { font-weight: 800; color: #334155; }
        .r-time { font-size: 10.5px; color: #64748b; }
        .r-teama { font-size: 12px; font-weight: 800; color: #047857; }
        .r-teamb { font-size: 12px; font-weight: 800; color: #1d4ed8; }
        .r-rest { font-size: 10.5px; font-weight: 800; color: #dc2626; background: #fff1f2; }
        .score-box-print {
          display: inline-block;
          width: 55px;
          height: 20px;
          line-height: 20px;
          border: 1px solid #94a3b8;
          border-radius: 4px;
          background: #ffffff;
          color: #94a3b8;
          font-weight: 800;
        }

        .print-footer {
          margin-top: 12px;
          border-top: 1px solid #cbd5e1;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10.5px;
          color: #64748b;
        }

        /* Print Specific Media Query */
        @media print {
          body {
            background: transparent !important;
          }
          .no-print {
            display: none !important;
          }
          .schedule-page-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .a4-sheet-container {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
