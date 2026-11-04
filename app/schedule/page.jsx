"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  const weekdays = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
  return `${y}年${m}月${d}日 ${weekdays[dateObj.getDay()]}`;
}

function formatTimeRange(startTime, endTime) {
  const s = String(startTime || "").slice(0, 5);
  const e = String(endTime || "").slice(0, 5);
  if (s && e) return `${s} - ${e}`;
  return s || e || "";
}

function SchedulePageContent() {
  const searchParams = useSearchParams();
  const meetupId = searchParams.get("meetup_id") || "";
  const dateStr = searchParams.get("date") || "";

  const [loading, setLoading] = useState(true);
  const [meetup, setMeetup] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [activeCourt, setActiveCourt] = useState(null);

  const loadSchedule = useCallback(
    async (silent = false) => {
      if (!meetupId || !dateStr) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const res = await fetch(
          `/api/match-schedule-toggle?meetup_id=${encodeURIComponent(meetupId)}&date=${encodeURIComponent(dateStr)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.ok) {
          setMeetup(data.meetup);
          const ms = data.session?.match_schedule || null;
          setSchedule(ms);
          setActiveCourt((prev) => {
            if (prev !== null) return prev;
            return ms?.courts?.[0]?.courtNumber || 1;
          });
        }
      } catch (err) {
        console.error("Failed to load schedule:", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [meetupId, dateStr]
  );

  // 初次載入 + 每 3 分鐘背景自動刷新（僅在畫面可見時執行，切回畫面時也自動同步）
  useEffect(() => {
    loadSchedule(false);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadSchedule(true);
      }
    }, 3 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadSchedule(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadSchedule]);

  const handleToggleRound = async (courtNumber, roundNumber, currentCompleted) => {
    const nextCompleted = !currentCompleted;

    // 1. 立即更新前端狀態（0 延遲反應）
    setSchedule((prev) => {
      if (!prev?.courts) return prev;
      return {
        ...prev,
        courts: prev.courts.map((c) => {
          if (Number(c.courtNumber) !== Number(courtNumber)) return c;
          return {
            ...c,
            rounds: (c.rounds || []).map((r) => {
              if (Number(r.roundNumber) !== Number(roundNumber)) return r;
              return { ...r, completed: nextCompleted };
            }),
          };
        }),
      };
    });

    // 2. 寫入資料庫，讓全場球友同步看到劃掉狀態
    try {
      const res = await fetch("/api/match-schedule-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetup_id: meetupId,
          date: dateStr,
          courtNumber,
          roundNumber,
          completed: nextCompleted,
        }),
      });
      const data = await res.json();
      if (data.ok && data.match_schedule) {
        setSchedule(data.match_schedule);
      }
    } catch (err) {
      console.warn("Sync schedule toggle error:", err);
    }
  };

  const courts = schedule?.courts || [];
  const currentCourt =
    courts.find((c) => Number(c.courtNumber) === Number(activeCourt)) || courts[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "16px 12px 48px",
        color: "#0f172a",
      }}
    >
      <style>{`
        .topbar, .footer { display: none !important; }
        main.page { padding: 0 !important; max-width: none !important; }
      `}</style>

      <div
        style={{
          maxWidth: "520px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.05)",
          overflow: "hidden",
        }}
      >
        {/* 上方三項基本資料：標題、日期、時間 */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff",
          }}
        >
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: "21px",
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: "-0.3px",
            }}
          >
            {meetup?.name || "今日賽程表"}
          </h1>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              fontSize: "14px",
              fontWeight: 700,
              color: "#475569",
            }}
          >
            <span>{formatDateLabel(dateStr)}</span>
            {meetup && (meetup.start_time || meetup.end_time) ? (
              <span>{formatTimeRange(meetup.start_time, meetup.end_time)}</span>
            ) : null}
          </div>
        </div>

        {/* 若有多個球場，顯示球場切換 */}
        {courts.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "10px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              overflowX: "auto",
            }}
          >
            {courts.map((c) => {
              const isAct = Number(c.courtNumber) === Number(currentCourt?.courtNumber);
              return (
                <button
                  key={c.courtNumber}
                  type="button"
                  onClick={() => setActiveCourt(c.courtNumber)}
                  style={{
                    padding: "6px 15px",
                    borderRadius: "999px",
                    border: isAct ? "1px solid #2563eb" : "1px solid #cbd5e1",
                    background: isAct ? "#2563eb" : "#ffffff",
                    color: isAct ? "#ffffff" : "#475569",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  第 {c.courtNumber} 球場
                </button>
              );
            })}
          </div>
        )}

        {/* 下方對戰組合列表 */}
        <div style={{ padding: "2px 16px" }}>
          {loading ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#64748b", fontWeight: 700 }}>
              載入賽程中...
            </div>
          ) : !currentCourt || !currentCourt.rounds || currentCourt.rounds.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#64748b", fontWeight: 700 }}>
              目前尚未排定賽程。
            </div>
          ) : (
            currentCourt.rounds.map((round, idx) => {
              const isCompleted = Boolean(round.completed);

              const pA1 = round.teamA?.[0]?.nickname || round.teamA?.[0]?.name || "—";
              const pA2 = round.teamA?.[1]?.nickname || round.teamA?.[1]?.name || "";
              const pB1 = round.teamB?.[0]?.nickname || round.teamB?.[0]?.name || "—";
              const pB2 = round.teamB?.[1]?.nickname || round.teamB?.[1]?.name || "";

              const textStyle = {
                fontSize: "16px",
                fontWeight: 800,
                lineHeight: "1.45",
                color: isCompleted ? "#94a3b8" : "#0f172a",
                textDecoration: isCompleted ? "line-through" : "none",
                wordBreak: "break-word",
              };

              return (
                <div
                  key={round.roundNumber || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 4px",
                    borderBottom:
                      idx < currentCourt.rounds.length - 1 ? "1px dashed #cbd5e1" : "none",
                    opacity: isCompleted ? 0.5 : 1,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  {/* 對戰組合：
                      Ａ                 Ｃ
                      Ｂ     ＶＳ        Ｄ
                  */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingRight: "14px",
                      gap: "10px",
                    }}
                  >
                    {/* 左隊 (A / B) */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "2px",
                      }}
                    >
                      <div style={textStyle}>{pA1}</div>
                      {pA2 ? <div style={textStyle}>{pA2}</div> : null}
                    </div>

                    {/* 中間 VS */}
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 900,
                        color: isCompleted ? "#cbd5e1" : "#64748b",
                        textDecoration: isCompleted ? "line-through" : "none",
                        padding: "0 8px",
                        flexShrink: 0,
                      }}
                    >
                      VS
                    </div>

                    {/* 右隊 (C / D) */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        textAlign: "right",
                        gap: "2px",
                      }}
                    >
                      <div style={textStyle}>{pB1}</div>
                      {pB2 ? <div style={textStyle}>{pB2}</div> : null}
                    </div>
                  </div>

                  {/* 最右邊：結束按鈕 */}
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleRound(
                        currentCourt.courtNumber,
                        round.roundNumber,
                        isCompleted
                      )
                    }
                    style={{
                      flexShrink: 0,
                      height: "36px",
                      padding: "0 14px",
                      borderRadius: "10px",
                      border: isCompleted ? "1px solid #cbd5e1" : "1px solid #fecaca",
                      background: isCompleted ? "#f1f5f9" : "#fef2f2",
                      color: isCompleted ? "#64748b" : "#dc2626",
                      fontSize: "13px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    結束
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 700 }}>
          載入賽程頁面中...
        </div>
      }
    >
      <SchedulePageContent />
    </Suspense>
  );
}
