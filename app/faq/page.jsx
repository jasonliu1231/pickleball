"use client";

import { useState, useMemo } from "react";

const FAQ_CATEGORIES = [
  { id: "all", label: "全部問題", icon: "🌟" },
  { id: "line", label: "LINE 官方帳號", icon: "💬" },
  { id: "booking", label: "預約與取消", icon: "📅" },
  { id: "pickup", label: "球友自主揪團", icon: "🏓" },
  { id: "account", label: "帳號與新手常見", icon: "👤" },
];

const FAQ_DATA = [
  {
    id: "line_features",
    category: "line",
    catBadge: "💬 LINE 服務",
    title: "LINE 官方帳號功能指南（4 大推播與查詢服務）",
    tags: ["LINE", "餘額", "使用紀錄", "通知", "官方帳號"],
    renderContent: (onImgClick) => (
      <div>
        <p style={{ marginBottom: "14px", lineHeight: "1.6" }}>
          加入<strong>「匹克球同樂會」官方 LINE 帳號</strong>，系統將提供專屬推播卡片與 1 鍵快速查詢服務：
        </p>

        <div className="faq-step-grid">
          <div className="faq-step-card">
            <span className="faq-step-pill">功能 1</span>
            <div className="faq-step-title">即時異動通知</div>
            <div className="faq-step-desc">儲值或現場簽到扣點時，即時推播明細通知</div>
            <div className="faq-img-container" onClick={() => onImgClick("/s1.png")} title="點擊放大圖片">
              <img src="/s1.png" alt="扣點通知" loading="lazy" />
              <div className="faq-img-zoom-tag">🔍 扣點通知</div>
            </div>
            <div className="faq-img-container" style={{ marginTop: "6px" }} onClick={() => onImgClick("/s4.png")} title="點擊放大圖片">
              <img src="/s4.png" alt="儲值通知" loading="lazy" />
              <div className="faq-img-zoom-tag">🔍 儲值通知</div>
            </div>
          </div>

          <div className="faq-step-card">
            <span className="faq-step-pill">功能 2</span>
            <div className="faq-step-title">一鍵餘額查詢</div>
            <div className="faq-step-desc">聊天室選單點「查詢餘額」，秒查各球館剩餘點數</div>
            <div className="faq-img-container" onClick={() => onImgClick("/s2.png")} title="點擊放大圖片">
              <img src="/s2.png" alt="一鍵餘額查詢" loading="lazy" />
              <div className="faq-img-zoom-tag">🔍 點擊放大</div>
            </div>
          </div>

          <div className="faq-step-card">
            <span className="faq-step-pill">功能 3</span>
            <div className="faq-step-title">使用紀錄調閱</div>
            <div className="faq-step-desc">聊天室選單點「使用紀錄」，查最近 10 筆明細</div>
            <div className="faq-img-container" onClick={() => onImgClick("/s3.png")} title="點擊放大圖片">
              <img src="/s3.png" alt="使用紀錄調閱" loading="lazy" />
              <div className="faq-img-zoom-tag">🔍 點擊放大</div>
            </div>
          </div>

          <div className="faq-step-card">
            <span className="faq-step-pill">功能 4</span>
            <div className="faq-step-title">備取遞補成功通知</div>
            <div className="faq-step-desc">正取釋出轉為正取時，LINE 將立刻推播通知</div>
            <div className="faq-img-container" onClick={() => onImgClick("/images/line_promote_notice.png")} title="點擊放大圖片">
              <img src="/images/line_promote_notice.png" alt="備取遞補成功通知" loading="lazy" />
              <div className="faq-img-zoom-tag">🔍 點擊放大</div>
            </div>
          </div>
        </div>

        <div className="faq-warning-box">
          ⚠️ <strong>重要提醒：</strong>請務必在「個人中心」綁定真實手機號碼，系統才能正確對應並發送通知！<br />
          💡 <strong>費用說明：</strong>LINE 推播通知由官方團主負擔費用，因此<strong>僅限「團主發起」之場次</strong>享有自動推播；「球友自發團」系統仍會依序自動遞補，但為節省費用不會發送 LINE 推播，請球友自行至網站/App 查看狀態。
        </div>

        <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
          <a
            href="https://line.me/R/ti/p/%40657kasvh"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#06C755",
              color: "#fff",
              padding: "11px 24px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "900",
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(6, 199, 85, 0.25)"
            }}
          >
            ➕ 點我加入官方 LINE 好友
          </a>
        </div>
      </div>
    ),
  },

  {
    id: "booking_steps",
    category: "booking",
    catBadge: "📅 預約流程",
    title: "線上預約操作指南（4 步驟快速報名）",
    tags: ["預約", "步驟", "報名", "流程", "教學"],
    renderContent: (onImgClick) => (
      <div>
        <p style={{ marginBottom: "14px", lineHeight: "1.6" }}>
          無論是電腦或手機，只需照著以下 4 個步驟即可輕鬆完成活動預約：
        </p>

        <div className="faq-step-grid">
          <div className="faq-step-card">
            <span className="faq-step-pill">步驟 1</span>
            <div className="faq-step-title">選擇預約日期</div>
            <div className="faq-step-desc">在日曆上點選有標記小點的開團日期</div>
            <div className="faq-img-container" onClick={() => onImgClick("/step1_calendar.png")} title="點擊放大圖片">
              <img src="/step1_calendar.png" alt="選擇預約日期" loading="lazy" />
              <div className="faq-img-zoom-tag">🔍 點擊放大</div>
            </div>
          </div>

          <div className="faq-step-card">
            <span className="faq-step-pill">步驟 2</span>
            <div className="faq-step-title">點選我要報名</div>
            <div className="faq-step-desc">在右側場次卡片點擊「我要報名」</div>
            <div className="faq-img-container" onClick={() => onImgClick("/step2_cards.png")} title="點擊放大圖片">
              <img src="/step2_cards.png" alt="點選我要報名" loading="lazy" />
              <div className="faq-img-zoom-tag">🔍 點擊放大</div>
            </div>
          </div>

          <div className="faq-step-card">
            <span className="faq-step-pill">步驟 3</span>
            <div className="faq-step-title">填寫資料送出</div>
            <div className="faq-step-desc">填妥暱稱與手機號碼並確認報名</div>
            <div className="faq-img-container" onClick={() => onImgClick("/step3_form.png")} title="點擊放大圖片">
              <img src="/step3_form.png" alt="填寫資料送出" loading="lazy" />
              <div className="faq-img-zoom-tag">🔍 點擊放大</div>
            </div>
          </div>

          <div className="faq-step-card">
            <span className="faq-step-pill">步驟 4</span>
            <div className="faq-step-title">報名成功卡位</div>
            <div className="faq-step-desc">視窗顯示報名成功，確認為正取或備取</div>
            <div className="faq-img-container" onClick={() => onImgClick("/step4_success.png")} title="點擊放大圖片">
              <img src="/step4_success.png" alt="報名成功" loading="lazy" />
              <div className="faq-img-zoom-tag">🔍 點擊放大</div>
            </div>
          </div>
        </div>

        <div className="faq-callout-box">
          💡 <strong>已登入會員專屬：</strong>若您已登入 LINE 並設定好手機，亦可直接使用場次卡片上的<strong>「⚡ 一鍵預約」</strong>，不用開窗填表、一秒秒殺卡位！
        </div>
      </div>
    ),
  },

  {
    id: "cancel_booking",
    category: "booking",
    catBadge: "🛑 預約異動",
    title: "如何取消預約？取消步驟與自動遞補規則",
    tags: ["取消", "退登", "遞補", "備取", "請假"],
    renderContent: (onImgClick) => (
      <div>
        <p style={{ marginBottom: "12px", lineHeight: "1.6" }}>
          若您報名後臨時不克前來，請盡早取消以將名額釋出給其他球友：
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", alignItems: "center" }}>
          <div>
            <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", lineHeight: "1.6" }}>
              <li>在該場次的卡片中點選<strong>「取消預約」</strong>按鈕。</li>
              <li>在「報名手機」欄位輸入您報名時留存的手機號碼。</li>
              <li>點選<strong>「查詢預約」</strong>。</li>
              <li>核對下方查出的報名姓名無誤後，點擊<strong>「確認取消」</strong>即完成退登。</li>
            </ol>
            <div className="faq-callout-box" style={{ marginTop: "14px" }}>
              🤝 <strong>自動遞補機制：</strong>
              當正取球友取消成功後，系統後台會<strong>自動按排隊時間順序將第 1 位備取晉升為正取</strong>，保障排隊公平性！
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <div className="faq-img-container" style={{ maxWidth: "220px" }} onClick={() => onImgClick("/step5_cancel.png")} title="點擊放大圖片">
              <img src="/step5_cancel.png" alt="取消預約操作" loading="lazy" style={{ height: "auto", maxHeight: "240px" }} />
              <div className="faq-img-zoom-tag">🔍 點擊放大</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  {
    id: "instant_vs_signup",
    category: "booking",
    catBadge: "⚡ 報名技巧",
    title: "「⚡ 一鍵預約」與「我要報名」有什麼不同？我該用哪一個？",
    tags: ["一鍵預約", "我要報名", "代報", "差異", "秒殺"],
    renderContent: () => (
      <div>
        <p style={{ marginBottom: "12px", lineHeight: "1.6" }}>
          這兩個按鈕主要是為了兼顧「極速卡位」與「彈性代報」的不同情境：
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginTop: "10px" }}>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px" }}>
            <h4 style={{ color: "#1d4ed8", fontSize: "14px", fontWeight: "900", marginBottom: "6px" }}>⚡ 一鍵預約（極速搶位）</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--sub)", lineHeight: "1.6" }}>
              * <strong>適用對象：</strong>本人要打球且已在個人中心綁定姓名與手機的會員。<br />
              * <strong>特色：</strong>不跳彈窗、直接後台一鍵送出，搶熱門週末場次最快！
            </p>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px" }}>
            <h4 style={{ color: "var(--text)", fontSize: "14px", fontWeight: "900", marginBottom: "6px" }}>📝 我要報名（彈性填寫）</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--sub)", lineHeight: "1.6" }}>
              * <strong>適用對象：</strong>散客、要幫親友代報名、或想備註球技程度者。<br />
              * <strong>特色：</strong>開啟彈出視窗，可自由修改姓名、電話與特殊備註。
            </p>
          </div>
        </div>
        <div className="faq-callout-box" style={{ marginTop: "12px" }}>
          ⏱️ <strong>時間規則說明：</strong>兩者遵守完全相同的開團與截止規則，一鍵預約並不會提早或延後預約開放時間，請在開放時段點擊即可！
        </div>
      </div>
    ),
  },

  {
    id: "calendar_missing",
    category: "booking",
    catBadge: "📅 系統狀態",
    title: "看不到可報名日期？日曆上沒有開團標記怎麼辦？",
    tags: ["日曆", "日期", "開團", "標記", "綠點", "黃點"],
    renderContent: () => (
      <div>
        <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>
          如果日曆上沒有標記小圓點，請確認以下 3 種常見情況：
        </p>
        <ul style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13.5px", lineHeight: "1.6" }}>
          <li>🔄 <strong>切換月份查看：</strong>點選日曆月份左右箭頭，切換至下一個月份看是否有開放場次。</li>
          <li>📢 <strong>開團發佈時間：</strong>每週場次皆有固定的發布排程，請留意各群組的最新公告。</li>
          <li>🔒 <strong>額滿截止隱藏：</strong>若當月所有場次皆已額滿且截止預約，日曆標記也會自動收合。</li>
        </ul>
      </div>
    ),
  },

  {
    id: "pickup_guide",
    category: "pickup",
    catBadge: "🏓 自主揪團",
    title: "我想自己找人打球，如何使用「自主開團」功能？",
    tags: ["自揪", "自主開團", "揪團", "發起人", "自發團"],
    renderContent: () => (
      <div>
        <p style={{ marginBottom: "14px", lineHeight: "1.6" }}>
          任何已登入並綁定手機的球友，皆可在平台上發起<strong>「單日臨時自揪團」</strong>（例如：下班湊 4 人暢打、假日私約平分場地費）。建立後系統直接將您排為<strong>正取第 1 位</strong>，活動會即時刊登於首頁供全站球友報名！
        </p>

        <div className="faq-step-grid">
          <div className="faq-step-card">
            <span className="faq-step-pill">步驟 1</span>
            <div className="faq-step-title">點擊我要自揪</div>
            <div className="faq-step-desc">在首頁上方橫幅點選「➕ 我要自揪」，或在月曆點日期發起</div>
          </div>
          <div className="faq-step-card">
            <span className="faq-step-pill">步驟 2</span>
            <div className="faq-step-title">填寫活動詳情</div>
            <div className="faq-step-desc">填寫活動名稱、時間、球場名稱、人數上限、費用與備註</div>
          </div>
          <div className="faq-step-card">
            <span className="faq-step-pill">步驟 3</span>
            <div className="faq-step-title">一鍵發布上線</div>
            <div className="faq-step-desc">確認送出後立即發布，發起人為正取第 1 位免重複報名</div>
          </div>
        </div>

        <div className="faq-callout-box">
          ⚙️ <strong>發起人完整管理權限：</strong><br />
          前往<strong>「個人中心」➜「我發起的自揪團」</strong>，可隨時操作：<br />
          * <strong>📋 一鍵複製名單：</strong>自動產出保護隱私的正備取名單（不外流電話），方便直接貼在 LINE 聊天室報到點名。<br />
          * <strong>✏️ 編輯活動：</strong>隨時微調場地、時間或人數上限（具備防呆，人數不可低於已報名人數）。<br />
          * <strong>❌ 取消活動：</strong>遇雨或臨時有要事，可一鍵取消活動，保障球友免於白跑。
        </div>

        <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <a
            href="/pickleball_2h_rules_a4.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              border: "1.5px solid #2563eb",
              color: "#1d4ed8",
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: "800",
              textDecoration: "none"
            }}
          >
            🖨️ 線上開啟 / 列印「2 小時賽程排序與輪替手冊」
          </a>
          <a
            href="/pickleball_2h_rotation_rules_a4.pdf"
            target="_blank"
            download
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              border: "1.5px solid #d97706",
              color: "#b45309",
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: "800",
              textDecoration: "none"
            }}
          >
            📥 下載 A4 PDF 手冊
          </a>
        </div>
      </div>
    ),
  },

  {
    id: "pickup_vs_organizer",
    category: "pickup",
    catBadge: "🏸 活動類型",
    title: "「球友自發」與「團主發起」有什麼不同？",
    tags: ["自發團", "團主發起", "官方團", "差別", "點數"],
    renderContent: () => (
      <div>
        <p style={{ marginBottom: "12px", lineHeight: "1.6" }}>
          平台上的活動分為兩種類型，兩者主要差異如下：
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <span className="faq-cat-badge pickup">球友自發</span>
              <strong style={{ fontSize: "14px", color: "var(--text)" }}>球友自主揪團（自揪活動）</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", lineHeight: "1.5" }}>
              <li><strong>發起對象：</strong>任何已登入會員皆可發起。</li>
              <li><strong>活動性質：</strong>臨時湊人暢打、自主平分場地費。</li>
              <li><strong>發起人保障：</strong>發起即為正取第 1 位，免搶位。</li>
              <li><strong>私人密碼團：</strong>可設通關密碼先讓好友報名，隨時可清空密碼開放全站。</li>
              <li><strong>遞補通知：</strong>系統自動依序遞補備取，但不發 LINE 推播。</li>
            </ul>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <span className="faq-cat-badge line">團主發起</span>
              <strong style={{ fontSize: "14px", color: "var(--text)" }}>官方／教練常規團</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", lineHeight: "1.5" }}>
              <li><strong>發起對象：</strong>球隊負責人、主辦團長或專業教練發布。</li>
              <li><strong>活動性質：</strong>常態暢打、技巧班、分級對抗賽。</li>
              <li><strong>現場服務：</strong>駐場主持、排定上下場輪替、提供用球。</li>
              <li><strong>儲值扣點：</strong>支援俱樂部會員點數錢包自動扣款與折扣。</li>
              <li><strong>遞補通知：</strong>正取取消時，由團主負擔費用發送 LINE 備取推播通知。</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },

  {
    id: "phone_binding",
    category: "account",
    catBadge: "📱 帳號設定",
    title: "報名時「手機號碼」無法輸入 / 怎麼讓系統自動帶入電話？",
    tags: ["手機", "電話", "個人中心", "自動填入", "無法輸入"],
    renderContent: () => (
      <div>
        <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>
          使用 LINE 登入後若尚未填寫手機，系統會提示「未設定」。請照以下步驟完成設定：
        </p>
        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13.5px", lineHeight: "1.6" }}>
          <li>點選導航列前往<strong>「個人中心」</strong>。</li>
          <li>在<strong>「✏️ 編輯個人資料」</strong>填入您的真實手機號碼，並點擊<strong>「儲存修改」</strong>。</li>
          <li>設定完畢後，未來每次報名系統就會<strong>自動為您帶入電話</strong>，且能正確接收 LINE 遞補通知！</li>
        </ol>
        <div className="faq-callout-box" style={{ marginTop: "12px" }}>
          💡 <strong>代報親友小技巧：</strong>系統自動帶入您的電話後，您依然可以直接點選手機欄位，將號碼修改為親友電話送出報名喔！
        </div>
      </div>
    ),
  },

  {
    id: "sub_account",
    category: "account",
    catBadge: "👥 儲值點數",
    title: "可以幫家人或朋友報名，並從我的儲值卡扣點嗎？",
    tags: ["家人", "朋友", "扣點", "子母帳號", "點數錢包"],
    renderContent: () => (
      <div>
        <p style={{ margin: 0, lineHeight: "1.6" }}>
          <strong>可以！</strong>系統支援<strong>「扣款主帳號（子母帳號共用額度）」</strong>功能。<br />
          請您的家人或親友先在預約網站登入註冊，並將個人中心最上方的<strong>「會員 ID」</strong>複製提供給教練或主辦人。
          後台將其帳戶設為「由您統一扣款」後，他們預約出席時，就會自動從您的點數錢包中抵扣囉！
        </p>
      </div>
    ),
  },

  {
    id: "beginner_friendly",
    category: "account",
    catBadge: "🎾 新手友善",
    title: "我是新手，完全沒有打過可以參加嗎？現場有球拍嗎？",
    tags: ["新手", "沒打過", "球拍", "第一次", "友善"],
    renderContent: () => (
      <div>
        <p style={{ fontWeight: "800", color: "var(--primary)", marginBottom: "8px" }}>
          當然可以！匹克球同樂會非常歡迎第一次接觸的新朋友加入！
        </p>
        <ul style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13.5px", lineHeight: "1.6" }}>
          <li>🙋‍♂️ <strong>報名勾選新手：</strong>報名程度請選擇「第一次」或「初學」，現場安排對戰分組時主辦人會特別照顧。</li>
          <li>🤝 <strong>友善歡樂環境：</strong>現場有熱心球友與教練，會親切指導基本持拍、站位與趣味計分規則。</li>
          <li>🏓 <strong>免自備球拍：</strong>球館現場備有球拍可借用或租用，您只需穿著合適的運動服與球鞋即可前來！</li>
        </ul>
      </div>
    ),
  },
];

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // 預設全部收合
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [activeImage, setActiveImage] = useState(null);

  // 根據分類與搜尋關鍵字動態過濾
  const filteredFaq = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchTags = item.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchTitle || matchTags;
    });
  }, [activeCategory, searchQuery]);

  // 分類計數
  const categoryCounts = useMemo(() => {
    const counts = { all: FAQ_DATA.length };
    FAQ_CATEGORIES.forEach((cat) => {
      if (cat.id !== "all") {
        counts[cat.id] = FAQ_DATA.filter((item) => item.category === cat.id).length;
      }
    });
    return counts;
  }, []);

  const toggleAccordion = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(filteredFaq.map((item) => item.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  return (
    <div className="tab-shell">
      <div className="tab-panel active">
        <section className="section">
          <div className="section-head">
            <div>
              <div className="section-kicker">HELP & FAQ</div>
              <h2 className="section-title">常見問題指南</h2>
              <p className="section-sub">快速查詢各類預約報名、LINE 推播通知、球友自主開團與新手打球須知。</p>
            </div>
          </div>

          <div className="faq-container">
            {/* 頂部搜尋與分類工具列 */}
            <div className="faq-header-toolbar">
              <div className="faq-search-box">
                <span className="faq-search-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  className="faq-search-input"
                  placeholder="搜尋問題或關鍵字（例如：取消預約、手機、自揪、點數、新手...）"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="faq-search-clear" type="button" onClick={() => setSearchQuery("")} aria-label="清除搜尋">
                    ✕
                  </button>
                )}
              </div>

              <div className="faq-filter-bar">
                <div className="faq-categories">
                  {FAQ_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`faq-cat-btn ${activeCategory === cat.id ? "active" : ""}`}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className="faq-cat-count">{categoryCounts[cat.id] || 0}</span>
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="faq-toggle-all-btn" onClick={expandAll}>
                    全部展開
                  </button>
                  <button type="button" className="faq-toggle-all-btn" onClick={collapseAll}>
                    全部收合
                  </button>
                </div>
              </div>
            </div>

            {/* 問題手風琴列表 */}
            {filteredFaq.length > 0 ? (
              <div className="faq-list">
                {filteredFaq.map((item) => {
                  const isOpen = expandedIds.has(item.id);
                  return (
                    <article key={item.id} className={`faq-accordion-item ${isOpen ? "open" : ""}`}>
                      <button
                        type="button"
                        className="faq-accordion-header"
                        onClick={() => toggleAccordion(item.id)}
                        aria-expanded={isOpen}
                      >
                        <div className="faq-header-left">
                          <span className={`faq-cat-badge ${item.category}`}>{item.catBadge}</span>
                          <span className="faq-question-text">{item.title}</span>
                        </div>
                        <div className="faq-accordion-chevron">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="faq-accordion-body">
                          {item.renderContent(setActiveImage)}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="faq-empty-search">
                <div style={{ fontSize: "36px" }}>🔍</div>
                <strong style={{ fontSize: "16px", color: "var(--text)" }}>找不到符合「{searchQuery}」的常見問題</strong>
                <p style={{ fontSize: "13px", color: "var(--muted)", maxWidth: "360px", lineHeight: "1.6" }}>
                  您可以嘗試使用其他關鍵字（如：取消、電話、點數、自揪），或切換上方的分類頁籤檢視。
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ height: "36px", padding: "0 16px", fontSize: "13px", marginTop: "8px" }}
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                >
                  重設搜尋與分類
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 圖片點選放大遮罩 Modal */}
      {activeImage && (
        <div
          className="image-lightbox-overlay"
          onClick={() => setActiveImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="放大圖片預覽"
        >
          <div className="image-lightbox-backdrop"></div>
          <div className="image-lightbox-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="image-lightbox-close"
              onClick={() => setActiveImage(null)}
              aria-label="關閉預覽"
            >
              ✕
            </button>
            <div className="image-lightbox-content">
              <img src={activeImage} alt="放大視圖" className="image-lightbox-img" />
              <div className="image-lightbox-info" style={{ textAlign: "center", padding: "12px 18px" }}>
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: "700" }}>點擊背景或右上角 ✕ 關閉預覽</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
