"use client";

import React, { useState } from "react";
import Link from "next/link";

const QUIZ_QUESTIONS = [
  {
    id: 1,
    title: "1. 發球與接發球能力 (Serve & Return)",
    subtitle: "評估你在底線開球與接發球的穩定度與控球能力",
    options: [
      { score: 1.5, tag: "1.0 - 1.5 級", label: "只要能發過網就好，常常打不到球心、出界或失誤。" },
      { score: 2.0, tag: "2.0 級", label: "發球與接發球逐漸穩定，但球大多偏淺、落在中場。" },
      { score: 2.5, tag: "2.5 級", label: "接發球技術穩定，能打出有深度的球，失誤大幅減少。" },
      { score: 3.0, tag: "3.0 級", label: "能微微控制發球與接發球的落點與深度，接發後能立刻順暢上網。" },
      { score: 3.5, tag: "3.5+ 級", label: "發球與接發球具備落點、旋轉或球速壓迫，能刻意針對對手弱側。" },
    ]
  },
  {
    id: 2,
    title: "2. 網前小球 / 丁克 (Dink)",
    subtitle: "評估你在網前廚房線（NVZ）的放小球手感與拉鋸耐心",
    options: [
      { score: 1.5, tag: "1.0 - 1.5 級", label: "完全不會放小球，看到球就只想大力抽或用力敲過去。" },
      { score: 2.0, tag: "2.0 級", label: "開始嘗試打丁克球，但手腕太硬，球容易彈很高被殺球。" },
      { score: 2.5, tag: "2.5 級", label: "能持續在網前正反手推丁克球，打出低平貼網球，失誤減少。" },
      { score: 3.0, tag: "3.0 級", label: "能嘗試改變方向打丁克球（直線到對角），來回拍數明顯變多。" },
      { score: 3.5, tag: "3.5+ 級", label: "能持續變向丁克、耐心拉鋸，伺機找對手破綻抓出有效得分球。" },
    ]
  },
  {
    id: 3,
    title: "3. 第三拍處理與向前推進 (3rd Shot)",
    subtitle: "評估第三拍的戰術選擇（慢放短球 / 長丁克 vs 平抽推進）",
    options: [
      { score: 1.5, tag: "1.0 - 1.5 級", label: "沒第三拍概念，只要能把球弄過網就算成功。" },
      { score: 2.0, tag: "2.0 級", label: "大多一律大力平抽（Drive），抽不過去就掛網、抽過去容易被攔截。" },
      { score: 2.5, tag: "2.5 級", label: "比賽時開始嘗試從過渡區或底線打「第三拍短球（長丁克）」，並嘗試向前走。" },
      { score: 3.0, tag: "3.0 級", label: "能在中場過渡區穩定打出第三拍短球，順利推進到網前非截擊區。" },
      { score: 3.5, tag: "3.5+ 級", label: "能穩定從「底線」打出高品質第三拍長丁克落入對方廚房，逼對手無法進攻。" },
    ]
  },
  {
    id: 4,
    title: "4. 快球防守、截擊與失誤率 (Volley & Reset)",
    subtitle: "評估面對快球時的反應、截擊穩定性與卸力防守能力",
    options: [
      { score: 1.5, tag: "1.0 - 1.5 級", label: "常失誤，對手球速一快容易嚇到躲球，或動作太大打出界。" },
      { score: 2.0, tag: "2.0 級", label: "中速球能擋回去，但失誤仍偏多，容易把球擋得太高被扣殺。" },
      { score: 2.5, tag: "2.5 級", label: "截擊技術逐漸穩定，很少出現低級失誤高球，能將球擋回場內。" },
      { score: 3.0, tag: "3.0 級", label: "網前反應靈活，能將球主動截擊到對手的後場或空檔，來回拍數長。" },
      { score: 3.5, tag: "3.5+ 級", label: "防守能力強，面對對手的大力殺球能「卸力重置（Reset）」輕放回對方廚房區。" },
    ]
  },
  {
    id: 5,
    title: "5. 雙打走位、規則與站位觀念 (Court Positioning)",
    subtitle: "評估對比分、發球站位、雙跳規則與雙打推進默契",
    options: [
      { score: 1.5, tag: "1.0 - 1.5 級", label: "常忘記雙反彈規則、計分，發球或接發球時常不知道該站哪裡。" },
      { score: 2.0, tag: "2.0 級", label: "基本規則都懂了，但雙打常留在底線不敢前進，容易跟隊友搶球。" },
      { score: 2.5, tag: "2.5 級", label: "開始有比賽觀念，能與搭檔同步從後場向前推進到非截擊區（廚房線）。" },
      { score: 3.0, tag: "3.0 級", label: "完全落實向前站位的壓迫優勢，能開始與搭檔溝通補位與得分策略。" },
      { score: 3.5, tag: "3.5+ 級", label: "熟悉比賽節奏，懂得根據對手拍面預判球種（上/下旋），攻防走位默契極佳。" },
    ]
  }
];

function getLevelResult(avgScore) {
  if (avgScore < 1.8) {
    return {
      levelKey: "1.5",
      title: "1.0 ~ 1.5 級（新手初學）",
      systemSkill: "需教學 (<2.0)",
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
      desc: "您已了解基本比賽規則，正在熟悉揮拍手感與擊球過網！",
      advice: "建議報名：【1.0-1.5 新手教學團】、【不限程度歡樂暢打】，多練習發球、接球的擊中率與雙跳站位。"
    };
  } else if (avgScore < 2.3) {
    return {
      levelKey: "2.0",
      title: "2.0 級（入門體驗）",
      systemSkill: "需教學 (<2.0)",
      color: "#0d9488",
      bg: "#f0fdfa",
      border: "#99f6e4",
      desc: "接、發球逐漸穩定，開始有丁克球、截擊等觀念，但失誤仍偏多！",
      advice: "建議報名：【2.0 歡樂暢打團】、【新手練球場】，練習減少低級高球失誤，並嘗試在網前輕推丁克球。"
    };
  } else if (avgScore < 2.8) {
    return {
      levelKey: "2.5",
      title: "2.5 級（基礎初階）",
      systemSkill: "初學 (2.0-2.5)",
      color: "#0284c7",
      bg: "#f0f9ff",
      border: "#bae6fd",
      desc: "基本擊球技術逐漸穩定，失誤明顯減少，開始懂得與隊友一起向前推進到廚房線！",
      advice: "建議報名：【2.0-2.5 初學友善交流團】、【初階暢打】，多練習第三拍長丁克（Drop）與向前推進。"
    };
  } else if (avgScore < 3.3) {
    return {
      levelKey: "3.0",
      title: "3.0 級（一般中階）",
      systemSkill: "一般 (2.5-3.0)",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      desc: "基本技巧穩定，能控制落點，來回拍數變多，能從過渡區打出第三拍短球，具備良好比賽觀念！",
      advice: "建議報名：【2.5-3.0 一般交流團】、【3.0 暢打對抗】。下一步可精進底線長丁克與網前變向拉鋸！"
    };
  } else {
    return {
      levelKey: "3.5",
      title: "3.5+ 級（進階好手）",
      systemSkill: "進階 (3.0+)",
      color: "#7c3aed",
      bg: "#f5f3ff",
      border: "#ddd6fe",
      desc: "基本技巧成熟，底線第三拍短球穩定，能網前變向丁克並具備卸力重置（Reset）防守能力！",
      advice: "建議報名：【3.0+ / 3.5 進階競技團】、【分級交流賽】，享受高強度戰術拉鋸與攻防轉換！"
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
