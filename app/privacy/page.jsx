export const metadata = {
  title: "隱私權政策｜匹克球同樂會",
  description: "匹克球同樂會 App 隱私權政策與個人資料保護說明。",
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", lineHeight: "1.7", color: "#1f2937" }}>
      <div style={{ backgroundColor: "#ffffff", padding: "36px 30px", borderRadius: "20px", border: "1px solid rgba(31, 41, 55, 0.08)", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)" }}>
        <h1 style={{ color: "#16a34a", fontSize: "28px", fontWeight: "900", marginTop: 0, borderBottom: "2px solid #bbf7d0", paddingBottom: "12px" }}>
          匹克球同樂會 App 隱私權政策
        </h1>
        <p style={{ fontSize: "15px", color: "#4b5563", marginTop: "16px" }}>
          歡迎您下載並使用由「匹克球同樂會」（以下簡稱「我們」）所開發的行動應用程式（以下簡稱「本 App」）。我們非常重視您的個人隱私與個人資料保護。以下為本 App 的隱私權政策，說明我們如何蒐集、使用、保護以及處理您的個人資料：
        </p>

        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#111827", marginTop: "28px", marginBottom: "10px" }}>1. 個人資料之蒐集與分類</h2>
        <p style={{ fontSize: "15px", color: "#4b5563" }}>當您使用本 App 預約打球或註冊會員時，我們可能會要求您提供或蒐集以下必要的個人資料：</p>
        <ul style={{ paddingLeft: "20px", fontSize: "15px", color: "#4b5563" }}>
          <li style={{ marginBottom: "6px" }}><strong>識別個人者</strong>：暱稱（用於活動名單顯示）、手機號碼（用於預約比對、取消預約身分驗證以及緊急聯繫）。</li>
          <li style={{ marginBottom: "6px" }}><strong>運動程度</strong>：您的匹克球程度（新手、初級、中級、高級，用於協助主辦人排班與分組）。</li>
          <li style={{ marginBottom: "6px" }}><strong>裝置資訊</strong>：如果您開啟了通知權限，我們會記錄您的行動裝置推播 Token（Expo Push Token），以便在有開團通知或您的報名狀態更新時向您發送即時通知。</li>
        </ul>

        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#111827", marginTop: "28px", marginBottom: "10px" }}>2. 個人資料之使用目的</h2>
        <p style={{ fontSize: "15px", color: "#4b5563" }}>我們蒐集您的個人資料，僅限於以下目的：</p>
        <ul style={{ paddingLeft: "20px", fontSize: "15px", color: "#4b5563" }}>
          <li style={{ marginBottom: "6px" }}><strong>預約與名單管理</strong>：建立並管理您參與匹克球開團活動的預約名單、備取名單。</li>
          <li style={{ marginBottom: "6px" }}><strong>身分驗證</strong>：供您輸入手機號碼進行「取消預約」或「查詢個人紀錄/額度」。</li>
          <li style={{ marginBottom: "6px" }}><strong>緊急聯繫</strong>：當活動時間異動、因雨取消或有突發狀況時，供主辦人以電話與您聯繫。</li>
          <li style={{ marginBottom: "6px" }}><strong>系統推播</strong>：向您發送預約狀態變更、開團提醒等系統通知。</li>
        </ul>

        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#111827", marginTop: "28px", marginBottom: "10px" }}>3. 個人資料之保護與安全</h2>
        <p style={{ fontSize: "15px", color: "#4b5563" }}>
          本 App 的資料儲存於安全且加密的雲端資料庫（Supabase）。我們採用業界標準的傳輸加密（SSL/TLS）與資料庫安全授權規則，以確保您的個人資料免受未經授權的存取、竄改或洩露。
        </p>

        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#111827", marginTop: "28px", marginBottom: "10px" }}>4. 與第三人共用個人資料之政策</h2>
        <p style={{ fontSize: "15px", color: "#4b5563" }}>
          我們絕對不會向任何第三方出租、出售或分享您的個人資料。除非配合相關法律調查或法院命令，否則您的資料僅供本 App 內部營運以及該開團主辦人聯絡使用。
        </p>

        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#111827", marginTop: "28px", marginBottom: "10px" }}>5. 使用者權利（資料刪除）</h2>
        <p style={{ fontSize: "15px", color: "#4b5563" }}>
          您隨時有權查詢或要求修改您登記的個人資料。若您希望完全刪除您在本 App 中保留的手機號碼或預約紀錄，您可以透過聯繫專案主辦人或發送需求，我們將於驗證身分後協助您手動清除所有資料。
        </p>

        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#111827", marginTop: "28px", marginBottom: "10px" }}>6. 隱私權政策之修改</h2>
        <p style={{ fontSize: "15px", color: "#4b5563" }}>
          我們可能會因應系統升級或法規變更而不定期修改本隱私權政策。修改後的條款將直接更新於本網頁上。
        </p>

        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#111827", marginTop: "28px", marginBottom: "10px" }}>7. 聯繫我們</h2>
        <p style={{ fontSize: "15px", color: "#4b5563" }}>
          若您對本隱私權政策或個人資料處理有任何疑問或刪除需求，請隨時透過本系統或球團活動聯絡窗口與我們聯繫。
        </p>

        <div style={{ marginTop: "36px", paddingTop: "20px", borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: "13px", color: "#9ca3af" }}>
          © 2026 匹克球同樂會. All rights reserved.
        </div>
      </div>
    </div>
  );
}
