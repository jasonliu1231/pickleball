"use client";

import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="主要選單">
      <a href="/" className={pathname === "/" ? "active" : ""}>
        <span className="nav-icon">📅</span>
        <span className="nav-text">立即預約</span>
      </a>
      <a href="/notice" className={pathname === "/notice" ? "active" : ""}>
        <span className="nav-icon">📢</span>
        <span className="nav-text">公告</span>
      </a>
      <a href="/knowledge" className={pathname === "/knowledge" ? "active" : ""}>
        <span className="nav-icon">💡</span>
        <span className="nav-text">小知識</span>
      </a>
      <a href="/faq" className={pathname === "/faq" ? "active" : ""}>
        <span className="nav-icon">❓</span>
        <span className="nav-text">常見問題</span>
      </a>
      <a href="/member" id="navMemberTab" className={pathname === "/member" ? "active" : ""}>
        <span className="nav-icon">👤</span>
        <span className="nav-text">個人中心</span>
      </a>
    </nav>
  );
}
