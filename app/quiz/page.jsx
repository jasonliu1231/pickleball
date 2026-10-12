"use client";

import React, { useState } from "react";
import Link from "next/link";

const QUIZ_QUESTIONS = [
  {
    id: 1,
    title: "1. 發球與接發球 (Serve & Return)",
    subtitle: "評估你在底線開球與接發球的穩定度與控球能力",
    options: [
      { score: 2.0, tag: "2.0 級", label: "只要能發過網就好，常常打不到球心或發出界外。" },
      { score: 2.5, tag: "2.5 級", label: "慢速發球與接球基本能進場，但球常常落在中場、偏淺。" },
      { score: 3.0, tag: "3.0 級", label: "10 球能進 7 球以上，能穩定回擊深球，接完球能立刻跑到網前。" },
      { score: 3.5, tag: "3.5 級", label: "發球接球具備速度、旋轉或落點壓迫，能刻意打向對手弱側。" },
    ]
  },
  {
    id: 2,
    title: "2. 網前小球 / 丁克 (Dink)",
    subtitle: "評估你在網前廚房線（NVZ）的放小球手感與拉鋸耐心",
    options: [
      { score: 2.0, tag: "2.0 級", label: "完全不會放小球，看到球就只想用力敲過去。" },
      { score: 2.5, tag: "2.5 級", label: "能在網前輕推 1～2 拍，但手腕太硬，球容易彈很高被殺球。" },
      { score: 3.0, tag: "3.0 級", label: "能跟對手在網前耐心來回對拉 3～5 拍，但遇到大角度容易掛網。" },
      { score: 3.5, tag: "3.5 級", label: "丁克球貼網極低，能維持 6 拍以上耐心拉鋸，懂得找空檔抓失誤。" },
    ]
  },
  {
    id: 3,
    title: "3. 底線與第三板處理 (3rd Shot)",
    subtitle: "評估第三板的戰術選擇（慢放 Drop vs 抽球 Drive）",
    options: [
      { score: 2.0, tag: "2.0 級", label: "沒概念，只要能把球從底線弄過網就算成功。" },
      { score: 2.5, tag: "2.5 級", label: "一律大力死抽（Drive），抽不過去就掛網、抽過去容易被攔截。" },
      { score: 3.0, tag: "3.0 級", label: "知道要打第三板慢放（Drop），但成功率不到一半，常打太高。" },
      { score: 3.5, tag: "3.5 級", label: "大部分能穩定把第三板慢放軟球（Drop）打進對手廚房區，順利走到網前。" },
    ]
  },
  {
    id: 4,
    title: "4. 網前截擊與快球防守 (Volley & Reset)",
    subtitle: "評估面對快球時的反應、截擊穩定性與卸力防守能力",
    options: [
      { score: 2.0, tag: "2.0 級", label: "看到快球會害怕躲球，揮拍太大容易把球打出界。" },
      { score: 2.5, tag: "2.5 級", label: "中速球可以用正手擋回去，但常常回球太高被對手連續扣殺。" },
      { score: 3.0, tag: "3.0 級", label: "網前反應快，能做好準備姿勢擋住快球，手腕較穩定。" },
      { score: 3.5, tag: "3.5 級", label: "能卸力擋住對手的重扣殺球（Reset 放回廚房區），攻守兼備。" },
    ]
  },
  {
    id: 5,
    title: "5. 規則熟練度與雙打走位 (Rules & Position)",
    subtitle: "評估對比分、發球站位、雙跳規則與雙打跑位的掌握度",
    options: [
      { score: 2.0, tag: "2.0 級", label: "常常忘記比分或雙跳規則，廚房區容易不小心踩進去。" },
      { score: 2.5, tag: "2.5 級", label: "規則都懂了，但雙打常常不知道該站哪裡、容易搶球或漏球。" },
      { score: 3.0, tag: "3.0 級", label: "規則完全熟練，知道雙打要盡快站上網前廚房線防守。" },
      { score: 3.5, tag: "3.5 級", label: "具備團隊戰術意識，懂得與隊友溝通補位、換位跑動。" },
    ]
  }
];

function getLevelResult(avgScore) {
  if (avgScore < 2.25) {
    return {
      title: "2.0 級（入門新手）",
      systemSkill: "初學 (或第一次參加)",
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
      desc: "您已大致了解匹克球基本規則，正在建立穩定的擊球手感！",
      advice: "建議報名：【新手友善團】、【新手教學場】或【不限程度歡樂暢打】，多練習發球、接發球的擊中率與基本走位。"
    };
  } else if (avgScore < 2.75) {
    return {
      title: "2.5 級（基礎初學）",
      systemSkill: "初學",
      color: "#0284c7",
      bg: "#f0f9ff",
      border: "#bae6fd",
      desc: "您已能順暢發球與回擊慢速球，基本規則完全沒問題！",
      advice: "建議報名：【初學交流團】、【2.0+ / 2.5+ 休閒暢打】，打球時可以多練習回球後走上網前廚房線，並練習輕放小球（丁克）。"
    };
  } else if (avgScore < 3.25) {
    return {
      title: "3.0 級（一般中級）",
      systemSkill: "一般",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      desc: "恭喜！您具備良好穩定的發球、截擊與對打能力，是球場上的中堅力量！",
      advice: "建議報名：【一般交流團】、【3.0 暢打團】或【中級友誼賽】。下一步可精進「第三板慢放（Drop）」技巧，讓上網攻防更具威脅！"
    };
  } else {
    return {
      title: "3.5+ 級（進階好手）",
      systemSkill: "進階",
      color: "#7c3aed",
      bg: "#f5f3ff",
      border: "#ddd6fe",
      desc: "太厲害了！您掌握了第三板慢放、網前耐心丁克與防守重置，具備高度戰術思維！",
      advice: "建議報名：【3.5+ 實力對抗團】、【進階競技場】或【分級交流賽】，享受高節奏攻防與戰術拉鋸！"
    };
  }
}

export default function QuizPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ = QUIZ_QUESTIONS[currentIdx];
  const total = QUIZ_QUESTIONS.length;

  const handleSelect = (score) => {
    setAnswers((p) => ({ ...p, [currentQ.id]: score }));
  };

  const handleNext = () => {
    if (currentIdx < total - 1) {
      setCurrentIdx((p) => p + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx((p) => p - 1);
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentIdx(0);
    setIsCompleted(false);
  };

  const scores = Object.values(answers);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 2.5;
  const result = getLevelResult(avg);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "32px 16px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Link href="/" style={{ textDecoration: "none", color: "#64748b", fontSize: "14px", fontWeight: "600" }}>
            ← 返回預約首頁
          </Link>
          <h1 style={{ fontSize: "26px", fontWeight: "900", color: "#0f172a", marginTop: "12px", marginBottom: "6px" }}>
            🏓 匹克球程度自測
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            回答 5 道具體技術問題，快速掌握最適合報名的球團程度！
          </p>
        </div>

        {!isCompleted ? (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "20px", padding: "24px 20px", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)", border: "1px solid #e2e8f0" }}>
            
            {/* Progress */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700", color: "#2563eb", marginBottom: "8px" }}>
                <span>題目 {currentIdx + 1} / {total}</span>
                <span style={{ color: "#94a3b8" }}>已填答 {Object.keys(answers).length}/{total} 題</span>
              </div>
              <div style={{ width: "100%", height: "8px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${((currentIdx + 1) / total) * 100}%`, height: "100%", backgroundColor: "#2563eb", transition: "width 0.3s ease" }} />
              </div>
            </div>

            {/* Question */}
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
              {currentQ.title}
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "18px" }}>
              {currentQ.subtitle}
            </p>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {currentQ.options.map((opt, i) => {
                const selected = answers[currentQ.id] === opt.score;
                return (
                  <div
                    key={i}
                    onClick={() => handleSelect(opt.score)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px",
                      padding: "16px 18px",
                      borderRadius: "14px",
                      border: selected ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                      backgroundColor: selected ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: "14.5px", color: selected ? "#1e3a8a" : "#1e293b", fontWeight: selected ? "600" : "400", lineHeight: "1.5", flex: 1 }}>
                      {opt.label}
                    </div>
                    <span style={{
                      width: "20px",
                      height: "20px",
                      minWidth: "20px",
                      borderRadius: "50%",
                      border: selected ? "6px solid #2563eb" : "2px solid #cbd5e1",
                      display: "inline-block",
                      boxSizing: "border-box",
                      backgroundColor: selected ? "#ffffff" : "transparent"
                    }} />
                  </div>
                );
              })}
            </div>

            {/* Nav */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
              {currentIdx > 0 ? (
                <button
                  onClick={handlePrev}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    color: "#334155",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  ← 上一題
                </button>
              ) : <div />}

              <button
                onClick={handleNext}
                disabled={answers[currentQ.id] === undefined}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: answers[currentQ.id] !== undefined ? "#2563eb" : "#cbd5e1",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: "800",
                  cursor: answers[currentQ.id] !== undefined ? "pointer" : "not-allowed",
                  boxShadow: answers[currentQ.id] !== undefined ? "0 4px 12px rgba(37, 99, 235, 0.25)" : "none",
                }}
              >
                {currentIdx === total - 1 ? "查看評估結果 🎉" : "下一題 →"}
              </button>
            </div>
          </div>
        ) : (
          /* Result */
          <div style={{ backgroundColor: "#ffffff", borderRadius: "20px", padding: "32px 24px", boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <div style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              backgroundColor: result.bg,
              color: result.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              margin: "0 auto 16px"
            }}>
              🏆
            </div>

            <div style={{ fontSize: "14px", fontWeight: "700", color: "#64748b", marginBottom: "8px" }}>
              根據您的技術自測，您的程度約為：
            </div>

            <div style={{
              display: "inline-block",
              padding: "10px 24px",
              borderRadius: "14px",
              backgroundColor: result.bg,
              border: `2px solid ${result.border}`,
              color: result.color,
              fontSize: "22px",
              fontWeight: "900",
              marginBottom: "12px"
            }}>
              {result.title}
            </div>

            <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
              報名時建議選擇：<strong style={{ color: "#0f172a" }}>{result.systemSkill}</strong>
            </div>

            <div style={{
              backgroundColor: "#fffbeb",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "left",
              border: "1px solid #fde68a",
              marginBottom: "24px"
            }}>
              <div style={{ fontSize: "14px", color: "#1e293b", marginBottom: "8px", lineHeight: "1.6" }}>
                {result.desc}
              </div>
              <div style={{ fontSize: "13px", color: "#92400e", lineHeight: "1.5", fontWeight: "500" }}>
                💡 {result.advice}
              </div>
            </div>


            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                href="/"
                style={{
                  display: "block",
                  padding: "14px",
                  borderRadius: "12px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: "800",
                  fontSize: "15px",
                }}
              >
                前往報名活動
              </Link>

              <button
                onClick={handleReset}
                style={{
                  padding: "10px",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                🔄 重新測驗
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
