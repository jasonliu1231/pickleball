"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";

export default function OpenDoorPage() {
  const params = useParams();
  const deviceId = Number(params?.deviceId || 612);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  async function handleOpenDoor() {
    if (status === "loading") return;
    setStatus("loading");
    setMessage("正在發送開門指令...");
    try {
      const res = await fetch("/api/open-door", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
        setMessage("大門已開啟！請直接進入球場");
      } else {
        setStatus("error");
        setMessage(data.error || "開門失敗，請稍後再試或聯繫團主");
      }
    } catch (err) {
      setStatus("error");
      setMessage("網路連線異常，請稍後再試");
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
        padding: "20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "32px 24px",
          boxShadow: "0 12px 32px rgba(37, 99, 235, 0.12)",
          textAlign: "center",
          border: "1px solid #bfdbfe",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "20px",
            background: status === "success" ? "#dcfce7" : "#dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            margin: "0 auto 16px",
          }}
        >
          {status === "success" ? "🔓" : "🚪"}
        </div>

        <h1
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 8px",
          }}
        >
          球場一鍵開門
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            margin: "0 0 24px",
            lineHeight: 1.5,
          }}
        >
          {deviceId === 612 ? "📍 匹克邦球館（台中太平永豐路235號）" : `設備編號 #${deviceId}`}
          <br />
          請確認您已抵達球館門口再點擊開門
        </p>

        <button
          type="button"
          onClick={handleOpenDoor}
          disabled={status === "loading"}
          style={{
            width: "100%",
            height: "54px",
            borderRadius: "14px",
            border: "none",
            background:
              status === "success"
                ? "#16a34a"
                : status === "loading"
                ? "#93c5fd"
                : "#2563eb",
            color: "#ffffff",
            fontSize: "17px",
            fontWeight: 800,
            cursor: status === "loading" ? "wait" : "pointer",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
            transition: "all 0.2s ease",
          }}
        >
          {status === "loading"
            ? "⏳ 開門中..."
            : status === "success"
            ? "✅ 已開門（點擊可再次開啟）"
            : "🔓 點擊立即開門"}
        </button>

        {message ? (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 700,
              background:
                status === "success"
                  ? "#f0fdf4"
                  : status === "error"
                  ? "#fef2f2"
                  : "#f8fafc",
              color:
                status === "success"
                  ? "#15803d"
                  : status === "error"
                  ? "#b91c1c"
                  : "#475569",
              border: `1px solid ${
                status === "success"
                  ? "#bbf7d0"
                  : status === "error"
                  ? "#fecaca"
                  : "#e2e8f0"
              }`,
            }}
          >
            {message}
          </div>
        ) : null}

        <div style={{ marginTop: "20px" }}>
          <a
            href="/"
            style={{
              fontSize: "13px",
              color: "#64748b",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ← 返回匹克球揪團首頁
          </a>
        </div>
      </div>
    </div>
  );
}
